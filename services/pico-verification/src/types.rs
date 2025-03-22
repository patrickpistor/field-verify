use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::Path;

#[derive(Debug, Serialize, Deserialize)]
pub struct MaterialCertification {
    pub certificate_id: String,
    pub batch_number: String,
    pub material: MaterialInfo,
    pub batch: BatchInfo,
    pub properties_tested: PropertiesInfo,
    pub compliance: Vec<ComplianceInfo>,
    pub verified_by: VerificationInfo,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MaterialInfo {
    pub r#type: String,
    pub designation: String,
    pub grade: String,
    pub shape: Option<String>,
    pub manufacturer: String,
    pub manufacturer_location: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BatchInfo {
    pub production_date: String,
    pub expiration_date: Option<String>,
    pub quantity: u32,
    pub units: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PropertiesInfo {
    pub public_properties: HashMap<String, PropertyValue>,
    pub private_properties: HashMap<String, PropertyValue>,
    pub property_standards_mapping: HashMap<String, Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PropertyValue {
    pub value: serde_json::Value,
    pub unit: Option<String>,
    pub threshold: Option<Threshold>,
    pub passed: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Threshold {
    pub min: f64,
    pub max: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ComplianceInfo {
    pub standard: String,
    pub clause: String,
    pub result: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VerificationInfo {
    pub test_report_number: String,
    pub laboratory: String,
    pub test_date: String,
    pub certified_by: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VerificationResult {
    pub material_id: String,
    pub material_type: String,
    pub standard: String,
    pub timestamp: String,
    pub verification_id: String,
    pub overall_compliance: String,
    pub properties: HashMap<String, PropertyResult>,
    pub compliance_summary: ComplianceSummary,
    pub zkp_info: ZkpInfo,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PropertyResult {
    pub property: String,
    pub value: serde_json::Value,
    pub thresholds: serde_json::Value,
    pub compliant: bool,
    pub is_private: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ComplianceSummary {
    pub total_properties: usize,
    pub public_properties: usize,
    pub private_properties: usize,
    pub passing_properties: usize,
    pub failing_properties: usize,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ZkpInfo {
    pub implemented: bool,
    pub proof_type: String,
    pub circuit: String,
    pub proof: String,
    pub public_signals: String,
    pub verified: bool,
}

pub fn read_certification(path: &Path) -> Result<MaterialCertification> {
    let content = fs::read_to_string(path)?;
    let certification: MaterialCertification = serde_json::from_str(&content)?;
    Ok(certification)
}

pub fn write_verification_results(results: &VerificationResult, path: &Path) -> Result<()> {
    let json = serde_json::to_string_pretty(results)?;
    fs::write(path, json)?;
    Ok(())
}