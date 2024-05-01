#!/bin/bash

# Path to your TSV file with positions
positions_file="./Data/23andMe_metadata_files/23andMeGenePanel.csv"

# Directory where your VCF files are stored
vcf_dir="./Data/1000_Genomes_Project"

# Output directory for the VCF files
output_dir="./Data/23AndMePositionsUnion"

# Check if output directory exists, if not create it
mkdir -p "$output_dir"

# Checkpoint file to keep track of processed positions
checkpoint_file="${output_dir}/bcf_checkpoint_3.txt"
touch "$checkpoint_file"

# Process the positions file
# This assumes the format: chromosome position, comma-separated
while IFS=$',' read -r chromosome position; do
  # Skip header lines starting with 'chromosome'
  if [[ $chromosome == "chromosome" ]]; then
    continue
  fi

  # Create chromosome-specific folder if it doesn't exist
  chromosome_dir="${output_dir}/chr${chromosome}"
  mkdir -p "$chromosome_dir"

  output_prefix="${chromosome_dir}/chr${chromosome}_pos${position}"

  # Skip if the output file already exists
  if [ -f "${output_prefix}.vcf" ]; then
    echo "Skipping already processed position: $chromosome $position"
    continue
  fi

  vcf_file="${vcf_dir}/ALL.chr${chromosome}.phase3_shapeit2_mvncall_integrated_v5b.20130502.genotypes.vcf.gz"

  if [ -f "$vcf_file" ]; then
    vcf_out="${output_prefix}.vcf"
    bcftools view -r "${chromosome}:${position}-${position}" "$vcf_file" > "$vcf_out"
    
    # Add this position to the checkpoint file
    echo "$output_prefix" >> "$checkpoint_file"
  else
    echo "VCF File Path: ${vcf_file}"
    echo "VCF file for chromosome ${chromosome} not found."
  fi
done < "$positions_file"