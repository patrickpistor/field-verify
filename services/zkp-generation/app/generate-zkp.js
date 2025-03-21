const fs = require('fs');
const snarkjs = require('snarkjs');
const path = require('path');

async function main() {
  const inputFile = process.argv[2];
  const outputDir = process.argv[3];
  
  // Read input data
  const inputData = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
  
  // Extract material type, properties and standard
  const { materialId, materialType, materialProps, standard, customThresholds } = inputData;
  
  // Get the thresholds
  const thresholds = getThresholdsForStandard(materialType, standard, customThresholds, materialProps);
  
  // Determine which properties to check
  const propertiesToCheck = Object.keys(materialProps).filter(prop => prop in thresholds);
  
  // Map property names to indices
  const propertyMap = propertiesToCheck.reduce((map, prop, index) => {
    map[prop] = index;
    return map;
  }, {});
  
  // Prepare circuit inputs
  const circuitInput = {
    property_values: propertiesToCheck.map(prop => materialProps[prop]),
    min_thresholds: propertiesToCheck.map(prop => thresholds[prop].min),
    max_thresholds: propertiesToCheck.map(prop => thresholds[prop].max)
  };
  
  // Select appropriate circuit based on property count
  const circuitPath = `./circuits/material_verifier_${propertiesToCheck.length}.wasm`;
  const zkeyPath = `./circuits/material_verifier_${propertiesToCheck.length}.zkey`;

  // Check if the circuit file exists
  if (!fs.existsSync(circuitPath) || !fs.existsSync(zkeyPath)) {
    console.error(`Circuit files not found for ${propertiesToCheck.length} properties`);
    console.error(`Expected files:`);
    console.error(`  - ${circuitPath}`);
    console.error(`  - ${zkeyPath}`);
    console.error(`\nYou need to compile circuits for the specified number of properties.`);
    
    // Create directory structure for circuits
    const circuitDir = path.dirname(circuitPath);
    if (!fs.existsSync(circuitDir)) {
      fs.mkdirSync(circuitDir, { recursive: true });
    }
    
    // Create a template circuit file
    const templateCircuit = `
pragma circom 2.0.0;

include "./templates/within_range.circom";

template MaterialVerifier(num_properties) {
    signal input property_values[num_properties];
    signal input min_thresholds[num_properties];
    signal input max_thresholds[num_properties];
    
    signal output property_compliance[num_properties];
    signal output all_compliant;
    
    var total_compliance = 1;
    
    for (var i = 0; i < num_properties; i++) {
        component range_check = WithinRange();
        range_check.value <== property_values[i];
        range_check.min_value <== min_thresholds[i];
        range_check.max_value <== max_thresholds[i];
        
        property_compliance[i] <== range_check.is_compliant;
        total_compliance *= range_check.is_compliant;
    }
    
    all_compliant <== total_compliance;
}

component main {public [min_thresholds, max_thresholds]} = MaterialVerifier(${propertiesToCheck.length});
    `;
    
    // Write template circuit file
    const templatePath = path.join(circuitDir, `material_verifier_${propertiesToCheck.length}.circom`);
    fs.writeFileSync(templatePath, templateCircuit);
    
    console.error(`\nGenerated template circuit file at: ${templatePath}`);
    console.error(`You need to compile this circuit using circom and snarkjs before using this script.`);
    process.exit(1);
  }
  
  // Generate the proof
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    circuitInput,
    circuitPath,
    zkeyPath
  );
  
  // Extract and interpret results using propertyMap
  const propertyResults = {};
  const complianceSignalStartIndex = 2 * propertiesToCheck.length; // Skip past min/max arrays
  
  // Map each property's compliance result back to the named property
  Object.keys(propertyMap).forEach(propName => {
    const index = propertyMap[propName];
    const isCompliant = publicSignals[complianceSignalStartIndex + index] === "1";
    propertyResults[propName] = {
      property: propName,
      value: materialProps[propName],
      min: thresholds[propName].min,
      max: thresholds[propName].max,
      compliant: isCompliant
    };
  });
  
  // Overall compliance
  const allCompliant = publicSignals[complianceSignalStartIndex + propertiesToCheck.length] === "1";
  
  // Create verification result
  const verificationResult = {
    materialId: inputData.materialId,
    materialType: materialType,
    standard: standard,
    timestamp: new Date().toISOString(),
    overallCompliance: allCompliant ? "PASS" : "FAIL",
    properties: propertyResults,
    propertyMap: propertyMap,
    proof: proof
  };
  
  // Save the verification result
  fs.writeFileSync(
    path.join(outputDir, 'verification.json'),
    JSON.stringify(verificationResult, null, 2)
  );
  
  console.log("ZKP generation and verification complete!");
}

function getThresholdsForStandard(materialType, standard, customThresholds, materialProps) {
  // If custom thresholds are provided, use those
  if (customThresholds && Object.keys(customThresholds).length > 0) {
    return customThresholds;
  }
  
  console.log("No custom thresholds provided - creating default thresholds");
  
  // Create default thresholds based on the properties we receive
  const defaultThresholds = {};
  
  Object.keys(materialProps).forEach(prop => {
    if (prop.startsWith("chemical_composition_")) {
      defaultThresholds[prop] = { min: 0, max: 100 };
    } else if (prop === "tensile_strength") {
      defaultThresholds[prop] = { min: 40, max: 100 };
    } else if (prop === "yield_strength") {
      defaultThresholds[prop] = { min: 30, max: 100 };
    } else if (prop === "elongation") {
      defaultThresholds[prop] = { min: 5, max: 30 };
    } else {
      defaultThresholds[prop] = { min: 0, max: Number.MAX_SAFE_INTEGER };
    }
  });
  
  return defaultThresholds;
}

main().then(() => {
  console.log("Process complete");
}).catch(err => {
  console.error(err);
  process.exit(1);
});