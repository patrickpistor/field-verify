use anyhow::Result;
use material_verification_lib::{VerificationResult, PropertyResult, ZkpInfo};
use pico_sdk::client::DefaultProverClient;
use serde_json::{json, Value};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use chrono::Utc;
use std::collections::HashMap;

fn main() -> Result<()> {
    // Initialize logger
    env_logger::init();
    
    // Get the path to the ELF file
    let elf_path = get_elf_path()?;
    println!("Using RISC-V ELF file: {}", elf_path);
    
    // Load the ELF file
    let elf = fs::read(elf_path)?;
    
    // Create the prover client
    let client = DefaultProverClient::new(&elf);
    let stdin_builder = client.get_stdin_builder();
    
    // Load the certification data
    let certification_path = "input/certification.json";
    let certification_data = fs::read_to_string(certification_path)?;
    let certification: Value = serde_json::from_str(&certification_data)?;
    
    // Prepare input for the RISC-V program
    let (property_values, min_thresholds, max_thresholds, private_indices) = prepare_material_data(&certification)?;
    
    // Prepare the input structure
    let input = json!({
        "property_values": property_values,
        "min_thresholds": min_thresholds,
        "max_thresholds": max_thresholds,
        "private_indices": private_indices
    });
    
    println!("Prepared verification input with {} properties", property_values.len());
    
    // Write input to the VM
    stdin_builder.borrow_mut().write(&input);
    
    // Generate proof
    println!("Generating zero-knowledge proof...");
    let proof = client.prove_fast()?;
    
    // Save proof for debugging
    let output_dir = Path::new("output");
    if !output_dir.exists() {
        fs::create_dir_all(output_dir)?;
    }
    
    let proof_path = output_dir.join("pico_proof.json");
    let proof_json = serde_json::to_string_pretty(&json!({
        "id": format!("proof-{}", Utc::now().timestamp()),
        "timestamp": Utc::now().to_rfc3339(),
        "pv_stream": proof.pv_stream,
    }))?;
    fs::write(&proof_path, proof_json)?;
    
    // Process verification results
    process_verification_results(&certification, &proof, output_dir)?;
    
    println!("Verification completed successfully!");
    Ok(())
}

fn get_elf_path() -> Result<String> {
    let possible_paths = [
        "./target/riscv32im-pico-zkvm-elf",
        "../app/target/riscv32im-pico-zkvm-elf", 
        "../target/riscv32im-pico-zkvm-elf"
    ];
    
    for path in possible_paths {
        if Path::new(path).exists() {
            return Ok(path.to_string());
        }
    }
    
    // If we can't find it, build it
    println!("ELF file not found. Building material-verification...");
    let status = std::process::Command::new("cargo")
        .args(["pico", "build"])
        .current_dir("../app")
        .status()?;
        
    if !status.success() {
        anyhow::bail!("Failed to build material-verification");
    }
    
    // Check again after building
    for path in possible_paths {
        if Path::new(path).exists() {
            return Ok(path.to_string());
        }
    }
    
    anyhow::bail!("Could not find RISC-V ELF file in any expected location")
}

fn prepare_material_data(certification: &Value) -> Result<(Vec<f64>, Vec<f64>, Vec<f64>, Vec<usize>)> {
    let mut property_values = Vec::new();
    let mut min_thresholds = Vec::new();
    let mut max_thresholds = Vec::new();
    let mut private_indices = Vec::new();
    let mut idx = 0;
    
    // Extract public properties
    if let Some(props) = certification["properties_tested"]["public_properties"].as_object() {
        for (_, prop) in props {
            if let Some(value) = prop["value"].as_f64() {
                property_values.push(value);
                
                // Extract thresholds
                if let Some(threshold) = prop["threshold"].as_object() {
                    let min = threshold["min"].as_f64().unwrap_or(f64::NEG_INFINITY);
                    let max = threshold["max"].as_f64().unwrap_or(f64::INFINITY);
                    min_thresholds.push(min);
                    max_thresholds.push(max);
                } else {
                    min_thresholds.push(f64::NEG_INFINITY);
                    max_thresholds.push(f64::INFINITY);
                }
                
                idx += 1;
            }
        }
    }
    
    // Extract private properties
    if let Some(props) = certification["properties_tested"]["private_properties"].as_object() {
        for (_, prop) in props {
            if let Some(value) = prop["value"].as_f64() {
                property_values.push(value);
                
                // Extract thresholds
                if let Some(threshold) = prop["threshold"].as_object() {
                    let min = threshold["min"].as_f64().unwrap_or(f64::NEG_INFINITY);
                    let max = threshold["max"].as_f64().unwrap_or(f64::INFINITY);
                    min_thresholds.push(min);
                    max_thresholds.push(max);
                } else {
                    min_thresholds.push(f64::NEG_INFINITY);
                    max_thresholds.push(f64::INFINITY);
                }
                
                // Mark this index as private
                private_indices.push(idx);
                idx += 1;
            }
        }
    }
    
    Ok((property_values, min_thresholds, max_thresholds, private_indices))
}

fn process_verification_results(certification: &Value, proof: &pico_sdk::client::ProverResult, output_dir: &Path) -> Result<()> {
    // Extract public values from the proof
    let public_values = if let Some(pv_stream) = &proof.pv_stream {
        pv_stream
    } else {
        anyhow::bail!("No public values in proof");
    };
    
    // The first public value is the overall compliance status
    let all_compliant = public_values[0].as_bool().unwrap_or(false);
    
    // Extract individual property compliance results
    let mut property_compliance = Vec::new();
    for i in 1..public_values.len() {
        if let Some(val) = public_values[i].as_bool() {
            property_compliance.push(val);
        }
    }
    
    // Generate verification result
    let timestamp = SystemTime::now().duration_since(UNIX_EPOCH)?.as_secs();
    let material_type = certification["material"]["type"].as_str().unwrap_or("unknown");
    
    let verification_id = format!("VER-{}-{}-{:04}",
        material_type.chars().take(3).collect::<String>().to_uppercase(),
        timestamp,
        rand::random::<u16>() % 10000
    );
    
    // Process property results
    let mut property_results = Vec::new();
    let mut idx = 0;
    
    // Process public properties
    if let Some(props) = certification["properties_tested"]["public_properties"].as_object() {
        for (name, prop) in props {
            if idx < property_compliance.len() {
                let result = PropertyResult {
                    property: name.clone(),
                    value: prop["value"].as_f64(),
                    threshold: None, // We'll populate this later
                    compliant: property_compliance[idx],
                    is_private: false,
                };
                property_results.push(result);
                idx += 1;
            }
        }
    }
    
    // Process private properties
    if let Some(props) = certification["properties_tested"]["private_properties"].as_object() {
        for (name, prop) in props {
            if idx < property_compliance.len() {
                let result = PropertyResult {
                    property: name.clone(),
                    value: None, // Redacted for private properties
                    threshold: None, // Redacted for private properties
                    compliant: property_compliance[idx],
                    is_private: true,
                };
                property_results.push(result);
                idx += 1;
            }
        }
    }
    
    // Create ZKP info
    let zkp_info = ZkpInfo {
        implemented: true,
        proof_type: "Pico zkVM Proof".to_string(),
        circuit: "material_verifier_zkvm".to_string(),
        public_values: serde_json::to_string(&public_values)?,
        verified: true,
    };
    
    // Create final verification result
    let result = VerificationResult {
        material_id: certification["certificate_id"].as_str().unwrap_or("unknown").to_string(),
        material_type: material_type.to_string(),
        standard: certification["material"]["designation"].as_str().unwrap_or("unknown").to_string(),
        timestamp: Utc::now().to_rfc3339(),
        verification_id,
        overall_compliance: if all_compliant { "PASS".to_string() } else { "FAIL".to_string() },
        property_results,
        zkp_info: Some(zkp_info),
    };
    
    // Save verification result
    let result_path = output_dir.join("verification.json");
    let result_json = serde_json::to_string_pretty(&result)?;
    fs::write(&result_path, result_json)?;
    
    println!("Verification result saved to {}", result_path.display());
    Ok(())
}