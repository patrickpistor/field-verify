#![no_main]

use pico_sdk::entrypoint;
use pico_sdk::io::{commit};
use serde::{Deserialize, Serialize};

// Mark this as the entrypoint for the RISC-V program
entrypoint!(main);

// A simple struct for material verification
#[derive(Serialize, Deserialize, Debug)]
struct MaterialInput {
    property_values: Vec<f64>,
    min_thresholds: Vec<f64>,
    max_thresholds: Vec<f64>,
}

pub fn main() {
    // Use hardcoded values for now
    let input = MaterialInput {
        property_values: vec![53.9, 50.6, 16.0],
        min_thresholds: vec![42.0, 35.0, 8.0],
        max_thresholds: vec![100.0, 100.0, 30.0],
    };
    
    // Later we can try to uncomment this to use read_as:
    // let input = pico_sdk::io::read_as::<MaterialInput>();
    
    println!("Using input data");
    
    // Verify each property
    let mut all_compliant = true;
    let mut compliance_results = Vec::new();
    
    for i in 0..input.property_values.len() {
        let value = input.property_values[i];
        let min = input.min_thresholds[i];
        let max = input.max_thresholds[i];
        
        let is_compliant = value >= min && value <= max;
        compliance_results.push(is_compliant);
        
        if !is_compliant {
            all_compliant = false;
        }
    }
    
    // Commit results to public output
    commit(&all_compliant);
    for result in compliance_results {
        commit(&result);
    }
    
    println!("Verification completed: {}", all_compliant);
}