const fs = require('fs');
const path = require('path');
const snarkjs = require('snarkjs');

async function main() {
  const inputFile = process.argv[2];
  const outputDir = process.argv[3];
  
  // Read input data
  const inputData = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
  
  // Extract material properties and thresholds
  const { 
    materialId, 
    materialType, 
    materialProps, 
    standard, 
    customThresholds,
    privatePropNames = [] // Properties to treat as private
  } = inputData;
  
  console.log(`Verifying ${materialType} material against ${standard} standard`);
  
  // Get standards-based thresholds
  const thresholds = customThresholds || 
                    getThresholdsForStandard(materialType, standard, {}, materialProps);
  
  // Separate public and private properties
  const publicProps = {};
  const privateProps = {};
  
  Object.keys(materialProps).forEach(prop => {
    if (privatePropNames.includes(prop) || prop.startsWith('chemical_composition_')) {
      privateProps[prop] = materialProps[prop];
    } else {
      publicProps[prop] = materialProps[prop];
    }
  });
  
  console.log(`Public properties: ${Object.keys(publicProps).join(', ')}`);
  console.log(`Private properties: ${Object.keys(privateProps).join(', ')}`);
  
  // Get properties in deterministic order for the circuit
  const allOrderedProps = Object.keys(materialProps).sort();
  
  // Prepare circuit inputs
  const scale = 1000000; // Scale factor to convert decimals to integers
  const property_values = [];
  const min_thresholds = [];
  const max_thresholds = [];
  
  for (const prop of allOrderedProps) {
    // Scale floating point values to integers
    property_values.push(Math.round(materialProps[prop] * scale));
    min_thresholds.push(Math.round((thresholds[prop]?.min || 0) * scale));
    max_thresholds.push(Math.round((thresholds[prop]?.max || Number.MAX_SAFE_INTEGER / scale) * scale));
  }
  
  // Circuit input
  const circuitInput = {
    property_values: property_values,
    min_thresholds: min_thresholds,
    max_thresholds: max_thresholds
  };
  
  // Define circuit name based on material and standard
  const circuitName = `material_verifier_${materialType}_${standard}`.replace(/[^a-zA-Z0-9_]/g, '_');
  
  // Paths to circuit artifacts
  const circuitDir = path.join(process.cwd(), 'circuits');
  const wasmPath = path.join(circuitDir, `${circuitName}.wasm`);
  const zkeyPath = path.join(circuitDir, `${circuitName}.zkey`);
  const vkeyPath = path.join(circuitDir, `${circuitName}_verification_key.json`);
  
  // Generate proof
  let proof = null;
  let publicSignals = null;
  let verified = false;
  let commitmentValue = null;
  
  try {
    console.log("Generating ZK proof...");
    
    // Write circuit input to a file
    const inputJsonPath = path.join(outputDir, 'circuit_input.json');
    fs.writeFileSync(inputJsonPath, JSON.stringify(circuitInput, null, 2));
    
    // Generate the proof using snarkjs
    const result = await snarkjs.groth16.fullProve(
      circuitInput,
      wasmPath,
      zkeyPath
    );
    
    proof = result.proof;
    publicSignals = result.publicSignals;
    
    console.log("Proof generated successfully!");
    
    // Write proof to file
    const proofJsonPath = path.join(outputDir, 'proof.json');
    fs.writeFileSync(proofJsonPath, JSON.stringify(proof, null, 2));
    
    // Write public signals to file
    const publicJsonPath = path.join(outputDir, 'public.json');
    fs.writeFileSync(publicJsonPath, JSON.stringify(publicSignals, null, 2));
    
    // Verify the proof
    console.log("Verifying proof...");
    const vkey = JSON.parse(fs.readFileSync(vkeyPath, 'utf8'));
    const verified = await snarkjs.groth16.verify(vkey, publicSignals, proof);
    console.log(`Proof verification result: ${verified ? 'VALID' : 'INVALID'}`);
    
    // Create verification result
    const verificationResult = createVerificationResult(
      materialProps,
      thresholds,
      publicProps,
      privateProps,
      materialId,
      materialType,
      standard,
      verified
    );
    
    // Add ZKP info to the result
    verificationResult.zkpInfo = {
      implemented: true,
      proofType: "Groth16 ZK Proof",
      circuit: circuitName,
      proof: JSON.stringify(proof).substring(0, 100) + "...",
      publicSignals: JSON.stringify(publicSignals).substring(0, 100) + "...",
      verified: verified
    };
    
    // Save the verification result
    const outputFile = path.join(outputDir, 'verification.json');
    fs.writeFileSync(outputFile, JSON.stringify(verificationResult, null, 2));
    
    console.log(`Verification completed: ${verificationResult.overallCompliance}`);
  } catch (error) {
    console.error("Error in ZKP process:", error);
    console.error("ZKP GENERATION FAILED - Cannot proceed with verification");
    process.exit(1); // Exit with error code to indicate failure
  }
}

// Create verification result
function createVerificationResult(allProps, thresholds, publicProps, privateProps, materialId, materialType, standard, verified) {
  // Process all properties (both public and private)
  const propertyResults = {};
  let allCompliant = verified; // Use ZKP verification result if available
  
  for (const [prop, value] of Object.entries(allProps)) {
    const threshold = thresholds[prop] || { min: 0, max: Number.MAX_SAFE_INTEGER };
    const isPrivate = Object.keys(privateProps).includes(prop);
    
    // For private properties, we use ZKP verification result
    // For public properties, we directly check compliance
    const isCompliant = isPrivate ? verified : (value >= threshold.min && value <= threshold.max);
    
    // Store result - for private properties, we only reveal compliance status, not actual values
    propertyResults[prop] = {
      property: prop,
      value: isPrivate ? "**REDACTED**" : value,
      thresholds: isPrivate ? "**REDACTED**" : threshold,
      compliant: isCompliant,
      isPrivate: isPrivate
    };
    
    // Update overall compliance for public properties
    if (!isPrivate && !isCompliant) {
      allCompliant = false;
    }
  }
  
  // Create verification result
  return {
    // Core metadata
    materialId: materialId || "unknown",
    materialType: materialType || "unknown",
    standard: standard || "unknown",
    
    // Verification metadata
    timestamp: new Date().toISOString(),
    verificationId: `VER-${materialType.substring(0, 3).toUpperCase()}-${new Date().getTime()}-${Math.floor(Math.random() * 10000)}`,
    overallCompliance: allCompliant ? "PASS" : "FAIL",
    
    // Property verification
    properties: propertyResults,
    
    // For regulatory purposes
    complianceSummary: {
      totalProperties: Object.keys(propertyResults).length,
      publicProperties: Object.keys(publicProps).length,
      privateProperties: Object.keys(privateProps).length,
      passingProperties: Object.values(propertyResults).filter(p => p.compliant).length,
      failingProperties: Object.values(propertyResults).filter(p => !p.compliant).length
    }
  };
}

// Enhanced function to get thresholds based on material type and standard
function getThresholdsForStandard(materialType, standard, customThresholds, materialProps) {
  // Your existing implementation (no changes needed)
  const defaultThresholds = {};
  
  // Define standard-specific thresholds
  const standardThresholds = {
    "ASTM-B221-14": { // Aluminum Standard
      "tensile_strength": { min: 42.0, max: 100.0 },
      "yield_strength": { min: 35.0, max: 100.0 },
      "elongation": { min: 8.0, max: 30.0 },
      "chemical_composition_Si": { min: 0.4, max: 0.8 },
      "chemical_composition_Fe": { min: 0.0, max: 0.7 },
      "chemical_composition_Cu": { min: 0.15, max: 0.4 },
      "chemical_composition_Mn": { min: 0.0, max: 0.15 }
    },
    // Rest of your standards
  };
  
  // If the standard exists, use its thresholds
  if (standard && standardThresholds[standard]) {
    return {...standardThresholds[standard], ...customThresholds};
  }
  
  // Otherwise, fall back to material type-based thresholds
  Object.keys(materialProps).forEach(prop => {
    if (prop.startsWith("chemical_composition_")) {
      defaultThresholds[prop] = { min: 0, max: 100 };
    } else if (prop === "tensile_strength" || prop === "tensile") {
      if (materialType === "aluminum") {
        defaultThresholds[prop] = { min: 30, max: 100 };
      } else if (materialType === "steel") {
        defaultThresholds[prop] = { min: 50, max: 200 };
      } else if (materialType === "copper") {
        defaultThresholds[prop] = { min: 30, max: 90 };
      } else {
        defaultThresholds[prop] = { min: 30, max: 150 };
      }
    } else if (prop === "yield_strength" || prop === "yield") {
      if (materialType === "aluminum") {
        defaultThresholds[prop] = { min: 30, max: 80 };
      } else if (materialType === "steel") {
        defaultThresholds[prop] = { min: 40, max: 150 };
      } else if (materialType === "copper") {
        defaultThresholds[prop] = { min: 10, max: 70 };
      } else {
        defaultThresholds[prop] = { min: 20, max: 100 };
      }
    } else if (prop === "elongation") {
      if (materialType === "aluminum") {
        defaultThresholds[prop] = { min: 5, max: 30 };
      } else if (materialType === "steel") {
        defaultThresholds[prop] = { min: 10, max: 40 };
      } else if (materialType === "copper") {
        defaultThresholds[prop] = { min: 20, max: 50 };
      } else {
        defaultThresholds[prop] = { min: 5, max: 40 };
      }
    } else {
      defaultThresholds[prop] = { min: 0, max: Number.MAX_SAFE_INTEGER };
    }
  });
  
  return {...defaultThresholds, ...customThresholds};
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
