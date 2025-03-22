use anyhow::Result;
use clap::Parser;
use std::path::PathBuf;
use tracing::{info, Level};
use tracing_subscriber::FmtSubscriber;

mod circuit;
mod types;

#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
struct Args {
    /// Path to input certification file
    #[arg(short, long)]
    input: PathBuf,

    /// Path to output directory
    #[arg(short, long)]
    output: PathBuf,
}

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize logging
    let subscriber = FmtSubscriber::builder()
        .with_max_level(Level::INFO)
        .finish();
    tracing::subscriber::set_global_default(subscriber)?;
    
    info!("Starting Material Verification with Pico...");
    
    // Parse command line arguments
    let args = Args::parse();
    
    // Ensure output directory exists
    if !args.output.exists() {
        std::fs::create_dir_all(&args.output)?;
    }
    
    // Read input certification data
    let certification = types::read_certification(&args.input)?;
    info!("Read certification data for material: {}", certification.certificate_id);
    
    // Initialize the material verification circuit
    let circuit = circuit::create_verification_circuit(&certification)?;
    info!("Created verification circuit");
    
    // Generate proof
    let proof_path = circuit::generate_proof(&circuit, &args.output, &certification)?;
    info!("Generated proof: {:?}", proof_path);
    
    // Write verification results
    let verification_results = circuit::verify_proof(&proof_path, &args.output, &certification)?;
    types::write_verification_results(&verification_results, &args.output.join("verification.json"))?;
    info!("Verification completed successfully");
    
    Ok(())
}