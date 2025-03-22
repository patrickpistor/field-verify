#![no_main]

use pico_sdk::entrypoint;
use pico_sdk::io::{read_as, commit};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

entrypoint!(main);

#[derive(Serialize, Deserialize, Debug)]
struct MaterialInput {
    properties_tested: PropertiesInfo,
}

#[derive(Serialize, Deserialize, Debug)]
struct PropertiesInfo {
    public_properties: HashMap<String, PropertyValue>,
    private_properties: HashMap<String, PropertyValue>,
}

#[derive(Serialize, Deserialize, Debug)]
struct PropertyValue {
    value: f64,
    threshold: Threshold,
    passed: bool,
}

#[derive(Serialize, Deserialize, Debug)]
struct Threshold {
    min: f64,
    max: f64,
}

pub fn main() {
    // Directly use read_as without Result handling
    let input: MaterialInput = read_as();
    
    let mut all_compliant = true;
    let mut compliance_results = Vec::new();
    
    // Verify public properties
    for (_, property) in &input.properties_tested.public_properties {
        let is_compliant = is_within_threshold(property);
        compliance_results.push(is_compliant);
        
        if !is_compliant {
            all_compliant = false;
        }
    }
    
    // Verify private properties
    for (_, property) in &input.properties_tested.private_properties {
        let is_compliant = is_within_threshold(property);
        compliance_results.push(is_compliant);
        
        if !is_compliant {
            all_compliant = false;
        }
    }
    
    // Commit results: first value is overall compliance
    commit(&all_compliant);
    
    // Commit individual property compliance results
    for result in compliance_results {
        commit(&result);
    }
}

fn is_within_threshold(property: &PropertyValue) -> bool {
    let value = property.value;
    let min = property.threshold.min;
    let max = property.threshold.max;
    
    value >= min && value <= max
}