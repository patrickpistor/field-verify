const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Define standard material types and their key properties
const materialStandardProperties = {
  "aluminum-ASTM-B221-14": ["tensile_strength", "yield_strength", "elongation", "chemical_composition_Si", "chemical_composition_Fe"],
  "steel-ASTM-A992": ["tensile_strength", "yield_strength", "elongation", "chemical_composition_C", "chemical_composition_Mn"],
  "copper-C11000": ["tensile_strength", "yield_strength", "elongation", "chemical_composition_Cu"],
  "insulation-ASTM-C1289": ["r_value", "flame_spread", "smoke_developed"]
};

function main() {
  const inputFile = process.argv[2];
  const inputData = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
  
  // Determine material type from input data
  const { materialType, standard } = inputData;
  const materialKey = `${materialType}-${standard}`;
  
  // Check if we have a standard circuit for this material
  let properties = [];
  if (materialStandardProperties[materialKey]) {
    properties = materialStandardProperties[materialKey];
    console.log(`Found standard properties for ${materialKey}: ${properties.join(', ')}`);
  } else {
    // Fallback to using properties from input data
    if (inputData.materialProps) {
      properties = Object.keys(inputData.materialProps);
      console.log(`Using custom properties: ${properties.join(', ')}`);
    } else {
      console.log("No standard properties found and no custom properties provided");
      return;
    }
  }
  
  // Setup directories
  const circuitDir = path.join(process.cwd(), 'circuits');
  if (!fs.existsSync(circuitDir)) fs.mkdirSync(circuitDir, { recursive: true });
  
  const circuitName = `material_verifier_${materialType}_${standard}`.replace(/[^a-zA-Z0-9_]/g, '_');
  const circuitPath = path.join(circuitDir, `${circuitName}.circom`);
  
  // Generate circom file from template
  console.log(`Generating circuit for ${materialKey} with ${properties.length} properties`);
  generateCircuitFile(circuitPath, properties);
  
  // Create build directories
  const buildDir = path.join(circuitDir, `${circuitName}_build`);
  if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir, { recursive: true });
  
  // Compile the circuit
  try {
    console.log("Compiling circuit with circom...");
    // Run circom to compile the circuit
    execSync(`circom ${circuitPath} --r1cs --wasm --sym -o ${buildDir}`, { stdio: 'inherit' });
    console.log("Circuit compiled successfully!");
    
    // Setup for a simplified trusted setup (for development)
    console.log("Performing simplified trusted setup for development...");
    
    // Generate a dummy ptau file for development
    const ptauPath = path.join(buildDir, "pot12_final.ptau");
    if (!fs.existsSync(ptauPath)) {
      console.log("Generating ptau file (this may take a while)...");
      execSync(`cd ${buildDir} && snarkjs powersoftau new bn128 12 pot12_0000.ptau -v`, { stdio: 'inherit' });
      execSync(`cd ${buildDir} && snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau --name="First contribution" -e="random entropy"`, { stdio: 'inherit' });
      execSync(`cd ${buildDir} && snarkjs powersoftau prepare phase2 pot12_0001.ptau pot12_final.ptau -v`, { stdio: 'inherit' });
    }
    
    // Generate the proving key and verification key
    console.log("Generating proving and verification keys...");
    execSync(`cd ${buildDir} && snarkjs groth16 setup ${circuitName}.r1cs pot12_final.ptau ${circuitName}_0000.zkey`, { stdio: 'inherit' });
    execSync(`cd ${buildDir} && snarkjs zkey contribute ${circuitName}_0000.zkey ${circuitName}_0001.zkey --name="Second contribution" -e="another random entropy"`, { stdio: 'inherit' });
    execSync(`cd ${buildDir} && snarkjs zkey export verificationkey ${circuitName}_0001.zkey verification_key.json`, { stdio: 'inherit' });
    
    console.log("Setup completed successfully!");
    
    // Copy required files to more accessible locations
    const wasmOutput = path.join(circuitDir, `${circuitName}.wasm`);
    const zkeyOutput = path.join(circuitDir, `${circuitName}.zkey`);
    const vkeyOutput = path.join(circuitDir, `${circuitName}_verification_key.json`);
    
    fs.copyFileSync(path.join(buildDir, `${circuitName}_js/${circuitName}.wasm`), wasmOutput);
    fs.copyFileSync(path.join(buildDir, `${circuitName}_0001.zkey`), zkeyOutput);
    fs.copyFileSync(path.join(buildDir, `verification_key.json`), vkeyOutput);
    
    console.log(`Circuit artifacts ready: ${wasmOutput}, ${zkeyOutput}, ${vkeyOutput}`);
  } catch (error) {
    console.error("Error processing circuit:", error.message);
    console.error("Command output:", error.stdout, error.stderr);
    
    // For development - create dummy files if real compilation fails
    console.log("Creating placeholder files for development");
    const wasmPath = path.join(circuitDir, `${circuitName}.wasm`);
    const zkeyPath = path.join(circuitDir, `${circuitName}.zkey`);
    const vkeyPath = path.join(circuitDir, `${circuitName}_verification_key.json`);
    
    // Create empty files
    if (!fs.existsSync(wasmPath)) fs.writeFileSync(wasmPath, new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]));
    if (!fs.existsSync(zkeyPath)) fs.writeFileSync(zkeyPath, "dummy zkey file");
    if (!fs.existsSync(vkeyPath)) fs.writeFileSync(vkeyPath, "{}");
    
    console.log("Created placeholder files");
  }
}

function generateCircuitFile(circuitPath, properties) {
  // Read the template file
  const templatePath = path.join(process.cwd(), 'circuit_template.circom');
  let template = fs.readFileSync(templatePath, 'utf8');
  
  // Replace the placeholder with the actual property count
  const propertyCount = properties.length;
  template = template.replace(
    "// NUM_PROPERTIES_PLACEHOLDER\ncomponent main {public [min_thresholds, max_thresholds]} = MaterialVerifier(5);",
    `// Circuit for ${propertyCount} properties: ${properties.join(', ')}\ncomponent main {public [min_thresholds, max_thresholds]} = MaterialVerifier(${propertyCount});`
  );
  
  // Write the customized circuit file
  fs.writeFileSync(circuitPath, template);
  console.log(`Generated circuit file: ${circuitPath}`);
}

main();
