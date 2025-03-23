use crate::circuit;
use crate::types::{MaterialCertification, VerificationResult, PropertyResult, 
  ComplianceSummary, ZkpInfo, MaterialInfo, BatchInfo, PropertiesInfo, 
  PropertyValue, Threshold, ComplianceInfo, VerificationInfo};
use anyhow::Result;
use std::convert::Infallible;
use std::path::PathBuf;
use std::sync::Arc;
use warp::{Filter, Rejection, Reply};
use warp::reply::json;
use warp::cors::Cors;
use serde::{Deserialize, Serialize};

// Request/Response types
#[derive(Debug, Deserialize)]
pub struct GenerateProofRequest {
    pub certification: MaterialCertification,
}

#[derive(Debug, Serialize)]
pub struct GenerateProofResponse {
    pub proof_id: String,
    pub status: String,
    pub message: String,
}

#[derive(Debug, Deserialize)]
pub struct VerifyProofRequest {
    pub proof_id: String,
    pub certification_id: String,
}

// API state
#[derive(Clone)]
pub struct ApiState {
    pub output_dir: PathBuf,
}

// Main API function to start the server
pub async fn start_api(port: u16, output_dir: PathBuf) -> Result<()> {
    let state = Arc::new(ApiState { output_dir });
    
    // Define routes
    let api = generate_proof_route(Arc::clone(&state))
        .or(verify_proof_route(Arc::clone(&state)));

    let cors = warp::cors()
        .allow_origin("http://localhost:3001")
        .allow_methods(vec!["POST", "GET", "OPTIONS"])
        .allow_headers(vec!["Content-Type"])
        .allow_credentials(true);
    
    // Apply CORS to routes
    let routes = api.with(cors);
    
    // Start the server
    tracing::info!("Starting API server on port {}", port);
    warp::serve(routes).run(([0, 0, 0, 0], port)).await;
    
    Ok(())
}

// Route for generating proofs
fn generate_proof_route(
    state: Arc<ApiState>,
) -> impl Filter<Extract = impl Reply, Error = Rejection> + Clone {
    warp::path!("api" / "generate-proof")
        .and(warp::post())
        .and(warp::body::json())
        .and(with_state(state))
        .and_then(handle_generate_proof)
}

// Route for verifying proofs
fn verify_proof_route(
    state: Arc<ApiState>,
) -> impl Filter<Extract = impl Reply, Error = Rejection> + Clone {
    warp::path!("api" / "verify-proof")
        .and(warp::post())
        .and(warp::body::json())
        .and(with_state(state))
        .and_then(handle_verify_proof)
}

// Helper to pass state to handlers
fn with_state(
    state: Arc<ApiState>,
) -> impl Filter<Extract = (Arc<ApiState>,), Error = Infallible> + Clone {
    warp::any().map(move || Arc::clone(&state))
}

// Handler for proof generation
async fn handle_generate_proof(
    request: GenerateProofRequest,
    state: Arc<ApiState>,
) -> Result<impl Reply, Infallible> {
    tracing::info!("Received request to generate proof for material: {}", request.certification.certificate_id);
    
    // Create a temporary circuit (empty tuple in our case)
    let circuit = ();
    
    // Call the circuit module to generate proof
    match circuit::generate_proof(&circuit, &state.output_dir, &request.certification) {
        Ok(proof_path) => {
            tracing::info!("Proof generated successfully: {}", proof_path);
            
            // For the hackathon MVP, return the proof path as the ID
            Ok(json(&GenerateProofResponse {
                proof_id: proof_path,
                status: "success".to_string(),
                message: "Proof generated successfully".to_string(),
            }))
        },
        Err(err) => {
            tracing::error!("Failed to generate proof: {:?}", err);
            
            Ok(json(&GenerateProofResponse {
                proof_id: "".to_string(),
                status: "error".to_string(),
                message: format!("Failed to generate proof: {}", err),
            }))
        }
    }
}

// Handler for proof verification
// Handler for proof verification
async fn handle_verify_proof(
  request: VerifyProofRequest,
  state: Arc<ApiState>,
) -> Result<impl Reply, Infallible> {
  tracing::info!("Received request to verify proof: {}", request.proof_id);
  
  // Construct the full path to the proof file
  let proof_path = state.output_dir.join(format!("{}.json", request.proof_id));
  
  // Check if proof file exists
  if !proof_path.exists() {
      tracing::error!("Proof file not found: {:?}", proof_path);
      
      // Return error response
      let error_result = VerificationResult {
          material_id: request.certification_id.clone(),
          material_type: "unknown".to_string(),
          standard: "unknown".to_string(),
          timestamp: chrono::Utc::now().to_rfc3339(),
          verification_id: "error".to_string(),
          overall_compliance: "ERROR".to_string(),
          properties: std::collections::HashMap::new(),
          compliance_summary: ComplianceSummary {
              total_properties: 0,
              public_properties: 0,
              private_properties: 0,
              passing_properties: 0,
              failing_properties: 0,
          },
          zkp_info: ZkpInfo {
              implemented: false,
              proof_type: "".to_string(),
              circuit: "".to_string(),
              proof: "".to_string(),
              public_signals: "".to_string(),
              verified: false,
          },
      };
      
      return Ok(json(&error_result));
  }
  
  // Read the proof file
  let proof_content = match std::fs::read_to_string(&proof_path) {
      Ok(content) => content,
      Err(err) => {
          tracing::error!("Failed to read proof file: {:?}", err);
          
          // Return error response
          let error_result = VerificationResult {
              material_id: request.certification_id.clone(),
              material_type: "unknown".to_string(),
              standard: "unknown".to_string(),
              timestamp: chrono::Utc::now().to_rfc3339(),
              verification_id: "error".to_string(),
              overall_compliance: "ERROR".to_string(),
              properties: std::collections::HashMap::new(),
              compliance_summary: ComplianceSummary {
                  total_properties: 0,
                  public_properties: 0,
                  private_properties: 0,
                  passing_properties: 0,
                  failing_properties: 0,
              },
              zkp_info: ZkpInfo {
                  implemented: false,
                  proof_type: "".to_string(),
                  circuit: "".to_string(),
                  proof: "".to_string(),
                  public_signals: "".to_string(),
                  verified: false,
              },
          };
          
          return Ok(json(&error_result));
      }
  };
  
  // Parse the proof content
  let proof_data: serde_json::Value = match serde_json::from_str(&proof_content) {
      Ok(data) => data,
      Err(err) => {
          tracing::error!("Failed to parse proof content: {:?}", err);
          
          // Return error response
          let error_result = VerificationResult {
              material_id: request.certification_id.clone(),
              material_type: "unknown".to_string(),
              standard: "unknown".to_string(),
              timestamp: chrono::Utc::now().to_rfc3339(),
              verification_id: "error".to_string(),
              overall_compliance: "ERROR".to_string(),
              properties: std::collections::HashMap::new(),
              compliance_summary: ComplianceSummary {
                  total_properties: 0,
                  public_properties: 0,
                  private_properties: 0,
                  passing_properties: 0,
                  failing_properties: 0,
              },
              zkp_info: ZkpInfo {
                  implemented: false,
                  proof_type: "".to_string(),
                  circuit: "".to_string(),
                  proof: "".to_string(),
                  public_signals: "".to_string(),
                  verified: false,
              },
          };
          
          return Ok(json(&error_result));
      }
  };
  
  // Extract certification data from the proof file
  let certification: MaterialCertification = match serde_json::from_value(proof_data["certification"].clone()) {
      Ok(cert) => cert,
      Err(err) => {
          tracing::error!("Failed to extract certification data: {:?}", err);
          
          // Return error response
          let error_result = VerificationResult {
              material_id: request.certification_id.clone(),
              material_type: "unknown".to_string(),
              standard: "unknown".to_string(),
              timestamp: chrono::Utc::now().to_rfc3339(),
              verification_id: "error".to_string(),
              overall_compliance: "ERROR".to_string(),
              properties: std::collections::HashMap::new(),
              compliance_summary: ComplianceSummary {
                  total_properties: 0,
                  public_properties: 0,
                  private_properties: 0,
                  passing_properties: 0,
                  failing_properties: 0,
              },
              zkp_info: ZkpInfo {
                  implemented: false,
                  proof_type: "".to_string(),
                  circuit: "".to_string(),
                  proof: "".to_string(),
                  public_signals: "".to_string(),
                  verified: false,
              },
          };
          
          return Ok(json(&error_result));
      }
  };
  
  // Actually verify the proof using our circuit module
  match circuit::verify_proof(&proof_path.to_string_lossy(), &state.output_dir, &certification) {
      Ok(verification_result) => {
          tracing::info!("Proof verified: {}", verification_result.verification_id);
          Ok(json(&verification_result))
      },
      Err(err) => {
          tracing::error!("Failed to verify proof: {:?}", err);
          
          // Create a basic error response that matches the VerificationResult structure
          let error_result = VerificationResult {
              material_id: certification.certificate_id,
              material_type: certification.material.r#type,
              standard: certification.material.designation,
              timestamp: chrono::Utc::now().to_rfc3339(),
              verification_id: "error".to_string(),
              overall_compliance: "ERROR".to_string(),
              properties: std::collections::HashMap::new(),
              compliance_summary: ComplianceSummary {
                  total_properties: 0,
                  public_properties: 0,
                  private_properties: 0,
                  passing_properties: 0,
                  failing_properties: 0,
              },
              zkp_info: ZkpInfo {
                  implemented: false,
                  proof_type: "".to_string(),
                  circuit: "".to_string(),
                  proof: "".to_string(),
                  public_signals: "".to_string(),
                  verified: false,
              },
          };
          
          Ok(json(&error_result))
      }
  }
}