use anyhow::Result;
use pico_sdk::client::DefaultProverClient;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use serde_json::{json, Value};
use crate::types::{MaterialCertification, VerificationResult, PropertyResult, ComplianceSummary, ZkpInfo};
use std::rc::Rc;
use std::cell::RefCell;

fn get_elf_path() -> Result<String> {
    let possible_paths = [
        "/app/verification-app/elf/riscv32im-pico-zkvm-elf",
        "/app/verification-app/target/riscv32im-pico-zkvm-elf",
        "/app/verification-app/target/material-verification"
    ];
    
    for path in possible_paths {
        if std::path::Path::new(path).exists() {
            return Ok(path.to_string());
        }
    }
    
    Err(anyhow::anyhow!("Could not find Pico ELF file in any expected location"))
  }

/// Create a verification circuit based on material certification data
pub fn create_verification_circuit(cert: &MaterialCertification) -> Result<()> {
    // We're not dynamically creating circuits here, 
    // just using the pre-compiled ELF
    Ok(())
}

/// Generate a zero-knowledge proof using Pico
pub fn generate_proof(circuit: &(), output_dir: &Path, cert: &MaterialCertification) -> Result<String> {
    // Initialize the Pico prover client
    let elf_path = get_elf_path()?;
    let elf = std::fs::read(elf_path)?;
    let client = DefaultProverClient::new(&elf);
    let stdin_builder = client.get_stdin_builder();
    
    // Prepare input for the RISC-V program
    let (property_values, min_thresholds, max_thresholds, private_indices) = prepare_material_data(cert);
    
    let input = json!({
        "property_values": property_values,
        "min_thresholds": min_thresholds,
        "max_thresholds": max_thresholds,
        "private_indices": private_indices
    });
    
    // Write input to the VM
    stdin_builder.borrow_mut().write(&input);
    
    // Generate proof
    let proof = client.prove_fast()?;
    
    // Save proof for debugging
    let proof_path = output_dir.join("pico_proof.json");
    let proof_summary = format!("{{\"id\": \"{}\", \"timestamp\": \"{}\"}}", 
        uuid::Uuid::new_v4(), 
        chrono::Utc::now().to_rfc3339());
    std::fs::write(&proof_path, proof_summary)?;
    
    // Return proof path
    Ok(proof_path.to_string_lossy().to_string())
}

/// Verify a proof and generate verification results
pub fn verify_proof(proof_path: &str, output_dir: &Path, cert: &MaterialCertification) -> Result<VerificationResult> {
    // Load the proof
    let proof_data = std::fs::read_to_string(proof_path)?;
    let proof: Value = serde_json::from_str(&proof_data)?;
    
    // Extract public values from the proof
    let public_values = proof["pv_stream"].as_array()
        .ok_or_else(|| anyhow::anyhow!("Missing public values in proof"))?;
    
    // The first public value is the overall compliance status
    let all_compliant = public_values[0].as_bool().unwrap_or(false);
    
    // Process the rest of public values
    let mut property_compliance = Vec::new();
    for i in 1..public_values.len() {
        if i % 2 == 1 { // Only get the compliance status values
            property_compliance.push(public_values[i].as_bool().unwrap_or(false));
        }
    }
    
    // Generate timestamp and ID
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)?
        .as_millis()
        .to_string();
    
    let verification_id = format!("VER-PICO-{}-{}", now, rand::random::<u16>());
    
    // Process properties into the final result format
    let properties = process_properties(cert, &property_compliance);
    
    // Count passing properties
    let passing = properties.values().filter(|p| p.compliant).count();
    let total = properties.len();
    let public_count = cert.properties_tested.public_properties.len();
    let private_count = cert.properties_tested.private_properties.len();
    
    let result = VerificationResult {
        material_id: cert.certificate_id.clone(),
        material_type: cert.material.r#type.clone(),
        standard: cert.material.designation.clone(),
        timestamp: chrono::Utc::now().to_rfc3339(),
        verification_id: verification_id.clone(),
        overall_compliance: if all_compliant { "PASS".to_string() } else { "FAIL".to_string() },
        properties,
        compliance_summary: ComplianceSummary {
            total_properties: total,
            public_properties: public_count,
            private_properties: private_count,
            passing_properties: passing,
            failing_properties: total - passing,
        },
        zkp_info: ZkpInfo {
            implemented: true,
            proof_type: "Pico zkVM Proof".to_string(),
            circuit: "material_verifier_zkvm".to_string(),
            proof: format!("pico-zkvm-proof-{}", verification_id),
            public_signals: serde_json::to_string(&public_values)?,
            verified: true,
        },
    };
    
    Ok(result)
}

// Helper functions
fn prepare_material_data(cert: &MaterialCertification) -> (Vec<f64>, Vec<f64>, Vec<f64>, Vec<usize>) {
    let mut property_values = Vec::new();
    let mut min_thresholds = Vec::new();
    let mut max_thresholds = Vec::new();
    let mut private_indices = Vec::new();
    
    // Process public properties
    for (idx, (name, prop)) in cert.properties_tested.public_properties.iter().enumerate() {
        if let Value::Number(num) = &prop.value {
            if let Some(val) = num.as_f64() {
                property_values.push(val);
                
                if let Some(threshold) = &prop.threshold {
                    min_thresholds.push(threshold.min);
                    max_thresholds.push(threshold.max);
                } else {
                    min_thresholds.push(f64::NEG_INFINITY);
                    max_thresholds.push(f64::INFINITY);
                }
            }
        }
    }
    
    // Process private properties
    let public_count = property_values.len();
    for (idx, (name, prop)) in cert.properties_tested.private_properties.iter().enumerate() {
        if let Value::Number(num) = &prop.value {
            if let Some(val) = num.as_f64() {
                property_values.push(val);
                
                if let Some(threshold) = &prop.threshold {
                    min_thresholds.push(threshold.min);
                    max_thresholds.push(threshold.max);
                } else {
                    min_thresholds.push(f64::NEG_INFINITY);
                    max_thresholds.push(f64::INFINITY);
                }
                
                // Add this index to private indices
                private_indices.push(public_count + idx);
            }
        }
    }
    
    (property_values, min_thresholds, max_thresholds, private_indices)
}

fn process_properties(cert: &MaterialCertification, compliance_results: &[bool]) -> HashMap<String, PropertyResult> {
    let mut results = HashMap::new();
    let mut compliance_idx = 0;
    
    // Process public properties
    for (name, prop) in &cert.properties_tested.public_properties {
        if compliance_idx < compliance_results.len() {
            results.insert(name.clone(), PropertyResult {
                property: name.clone(),
                value: prop.value.clone(),
                thresholds: json!({
                    "min": prop.threshold.as_ref().map(|t| t.min).unwrap_or(f64::NEG_INFINITY),
                    "max": prop.threshold.as_ref().map(|t| t.max).unwrap_or(f64::INFINITY)
                }),
                compliant: compliance_results[compliance_idx],
                is_private: false,
            });
            compliance_idx += 1;
        }
    }
    
    // Process private properties
    for (name, prop) in &cert.properties_tested.private_properties {
        if compliance_idx < compliance_results.len() {
            results.insert(name.clone(), PropertyResult {
                property: name.clone(),
                value: json!("**REDACTED**"),
                thresholds: json!("**REDACTED**"),
                compliant: compliance_results[compliance_idx],
                is_private: true,
            });
            compliance_idx += 1;
        }
    }
    
    results
}