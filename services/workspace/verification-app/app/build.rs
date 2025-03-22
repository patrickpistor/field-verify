use std::env;
use std::fs;
use std::path::Path;

fn main() {
    // Get the output directory
    let out_dir = env::var("OUT_DIR").unwrap();
    let dest_path = Path::new(&out_dir).join("riscv32im-pico-zkvm-elf");

    // Path to the compiled ELF
    let elf_paths = [
        "target/riscv32im-risc0-zkvm-elf/release/material-verification",
        "target/release/material-verification",
        // Add more potential paths if needed
    ];

    // Find and copy the ELF file
    for path in &elf_paths {
        let full_path = Path::new(path);
        if full_path.exists() {
            fs::copy(full_path, &dest_path).expect("Failed to copy ELF file");
            println!("cargo:rustc-env=ELF_PATH={}", dest_path.display());
            return;
        }
    }

    // If no ELF found, create a placeholder or skip
    println!("cargo:warning=No ELF binary found. Skipping ELF copy.");
}