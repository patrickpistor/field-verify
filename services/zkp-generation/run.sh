#!/bin/bash

# Read input parameters from mounted JSON file
INPUT_FILE=${1:-/workspace/inputs/input.json}
OUTPUT_DIR=${2:-/workspace/outputs}

echo "Starting material verification process..."
echo "Using input file: $INPUT_FILE"
echo "Writing output to: $OUTPUT_DIR"

# Create dummy verification files first
node /workspace/compile-circuits.js $INPUT_FILE

# Run the verification process
node /workspace/generate-zkp.js $INPUT_FILE $OUTPUT_DIR

echo "Verification complete!"