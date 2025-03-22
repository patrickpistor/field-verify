use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct PropertyValue {
    pub value: f64,
    pub unit: Option<String>,
    pub threshold: Option<Threshold>,
    pub passed: bool,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Threshold {
    pub min: f64,
    pub max: f64,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct VerificationResult {
    pub material_id: String,
    pub material_type: String,
    pub standard: String,
    pub timestamp: String,
    pub verification_id: String,
    pub overall_compliance: String,
    pub property_results: Vec<PropertyResult>,
    pub zkp_info: Option<ZkpInfo>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct PropertyResult {
    pub property: String,
    pub value: Option<f64>,
    pub threshold: Option<Threshold>,
    pub compliant: bool,
    pub is_private: bool,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ZkpInfo {
    pub implemented: bool,
    pub proof_type: String,
    pub circuit: String,
    pub public_values: String,
    pub verified: bool,
}

// Helper functions for common operations
pub fn is_within_range(value: f64, min: f64, max: f64) -> bool {
    value >= min && value <= max
}

pub fn format_verification_id(material_type: &str, timestamp: u64) -> String {
    format!("VER-{}-{}-{:04}", 
        material_type.chars().take(3).collect::<String>().to_uppercase(),
        timestamp,
        rand::random::<u16>() % 10000
    )
}