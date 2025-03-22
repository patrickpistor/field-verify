// #![no_main]

// use pico_sdk::entrypoint;
// use pico_sdk::io::{read_as, commit};
// use serde::{Deserialize, Serialize};

// // Mark this as the entrypoint for the RISC-V program
// entrypoint!(main);

// #[derive(Serialize, Deserialize, Debug)]
// struct MaterialInput {
//     // Array of property values to check
//     property_values: Vec<f64>,
//     // Minimum threshold for each property
//     min_thresholds: Vec<f64>,
//     // Maximum threshold for each property
//     max_thresholds: Vec<f64>,
//     // Indices of properties that should be kept private
//     private_indices: Vec<usize>,
// }

// #[derive(Serialize, Deserialize, Debug)]
// struct MaterialOutput {
//     // Overall compliance status
//     all_compliant: bool,
//     // Individual property compliance statuses
//     property_compliance: Vec<bool>,
// }

// pub fn main() {
//     // Read the serialized input data
//     let input: MaterialInput = read_as();
    
//     // Verify that all arrays have the same length
//     assert_eq!(input.property_values.len(), input.min_thresholds.len());
//     assert_eq!(input.property_values.len(), input.max_thresholds.len());
    
//     let mut all_compliant = true;
//     let mut property_compliance = Vec::new();
    
//     // Check each property against its thresholds
//     for i in 0..input.property_values.len() {
//         let value = input.property_values[i];
//         let min = input.min_thresholds[i];
//         let max = input.max_thresholds[i];
        
//         // Check if property meets its threshold
//         let compliant = value >= min && value <= max;
        
//         // If any property fails, the overall compliance is false
//         if !compliant {
//             all_compliant = false;
//         }
        
//         property_compliance.push(compliant);
//     }
    
//     // Commit the verification results to the public output stream
//     // This becomes part of the public outputs of the ZK proof
    
//     // First commit the overall compliance result
//     commit(&all_compliant);
    
//     // Then commit each property's compliance status
//     for compliant in &property_compliance {
//         commit(compliant);
//     }
    
//     // For public properties, also commit their values
//     for i in 0..input.property_values.len() {
//         if !input.private_indices.contains(&i) {
//             commit(&input.property_values[i]);
//         }
//     }
    
//     // Log for debugging
//     println!("Verification completed: overall compliance = {}", all_compliant);
// }

#![no_main]

use pico_sdk::entrypoint;
use pico_sdk::io::{read_as, commit};
use serde::{Deserialize, Serialize};

// Mark this as the entrypoint for the RISC-V program
entrypoint!(main);

#[derive(Serialize, Deserialize, Debug)]
struct MaterialInput {
    // Simplified input for testing
    property_values: Vec<f64>,
    min_thresholds: Vec<f64>,
    max_thresholds: Vec<f64>,
}

pub fn main() {
    // Read the serialized input data
    let input: MaterialInput = read_as();
    
    // Simple verification logic
    let mut all_pass = true;
    let mut results = Vec::new();
    
    for i in 0..input.property_values.len() {
        let value = input.property_values[i];
        let min = input.min_thresholds[i];
        let max = input.max_thresholds[i];
        
        let passes = value >= min && value <= max;
        results.push(passes);
        
        if !passes {
            all_pass = false;
        }
    }
    
    // Commit results to public output
    commit(&all_pass);
    for result in results {
        commit(&result);
    }
    
    // Log for debugging
    println!("Verification completed: {}", all_pass);
}