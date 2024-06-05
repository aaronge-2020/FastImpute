#!/bin/bash

# Path to the Minimac4 executable
minimac4_exe="scripts/bash/minimac4-4.1.6-Linux-x86_64/bin/minimac4"

# Ensure the Minimac4 executable has the correct permissions
chmod +x "$minimac4_exe"

# Directory where your 1000 Genomes Project VCF files are stored
reference_dir="Data/Beagle_reference_minus_test"

# Directory where the filtered VCF files are stored
filtered_vcf_dir="Data/Beagle_test_input"

# Output directory for the imputed VCF files
imputed_vcf_dir="Data/Beagle_imputed_output"
mkdir -p "$imputed_vcf_dir"

# Path to the locations file
locations_file="scripts/bash/locations.txt"

# Temporary directory for intermediate files
temp_dir="scripts/bash/temp"
mkdir -p "$temp_dir"

# Function to run Minimac4 for a specific chromosome
run_minimac4() {
  local chr=$1

  # Path to the filtered VCF file for the current chromosome
  filtered_vcf="${filtered_vcf_dir}/ALL.chr${chr}.phase3_shapeit2_mvncall_integrated_v5b.20130502.genotypes_filtered.vcf.gz"

  # Check if the filtered VCF file exists
  if [ ! -f "$filtered_vcf" ]; then
    echo "Filtered VCF file not found for chromosome $chr: $filtered_vcf"
    return
  fi

  # Path to the reference panel file
  reference_panel="${reference_dir}/ALL.chr${chr}.phase3_shapeit2_mvncall_integrated_v5b.20130502.genotypes_reference_filtered.vcf.gz"

  # Path to the output VCF file for the current chromosome
  output_vcf="${imputed_vcf_dir}/chr${chr}_imputed.vcf.gz"

  # Run Minimac4 for the entire chromosome and log the output
  "$minimac4_exe" --refHaps "$reference_panel" --haps "$filtered_vcf" --prefix "$temp_dir/chr${chr}_imputed" 2>&1 | tee "$temp_dir/chr${chr}_minimac4.log"

  # Check if Minimac4 command was successful
  if [ $? -ne 0 ]; then
    echo "Error running Minimac4 for chromosome $chr"
    return
  fi

  # Move and index the output VCF file
  mv "$temp_dir/chr${chr}_imputed.dose.vcf.gz" "$output_vcf"
  bcftools index "$output_vcf"
}

# Function to extract specific positions from the imputed VCF
extract_positions() {
  local chr=$1

  # Create a list of positions for the current chromosome
  grep "^${chr}[[:space:]]" "$locations_file" | awk -v chr="$chr" '{print chr "\t" $2}' > "$temp_dir/chr${chr}_positions.txt"

  # Extract the positions from the imputed VCF
  bcftools view -R "$temp_dir/chr${chr}_positions.txt" "$imputed_vcf_dir/chr${chr}_imputed.vcf.gz" -o "${imputed_vcf_dir}/chr${chr}_specific_positions.vcf"
  # bcftools index "${imputed_vcf_dir}/chr${chr}_specific_positions.vcf"
}

# Process each chromosome
for chr in {1..22}; do
  echo "Processing chromosome: $chr"
  run_minimac4 "$chr"
  extract_positions "$chr"
done

echo "Imputation and extraction complete for all chromosomes."
