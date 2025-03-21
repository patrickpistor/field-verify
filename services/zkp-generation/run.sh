#!/bin/bash

echo "Starting ZKP generation process..."

# Input and output directories
INPUT_FILE="/workspace/inputs/input.json"
OUTPUT_DIR="/workspace/outputs"

echo "Using input file: $INPUT_FILE"
echo "Writing output to: $OUTPUT_DIR"

# Debug - list contents
echo "Input directory contents:"
ls -la /workspace/inputs/

# Run the ZKP generation script
node /workspace/app/generate-zkp.js "$INPUT_FILE" "$OUTPUT_DIR"

echo "ZKP generation complete!"