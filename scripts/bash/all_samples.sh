#!/bin/bash

# Directory where your VCF files are stored
vcf_dir="./Data/1000_Genomes_Project"

# Output directory for the sample IDs
output_dir="./Data/23AndMePositionsIntersection"
mkdir -p "$output_dir"

# Output file for the sample IDs
sample_ids_file="${output_dir}/all_sample_ids.txt"

# Extract sample IDs from all VCF files
for vcf_file in "$vcf_dir"/*.vcf.gz; do
  bcftools query -l "$vcf_file" >> "$sample_ids_file"
done

# Remove duplicate sample IDs if multiple VCF files contain the same samples
sort -u "$sample_ids_file" -o "$sample_ids_file"

echo "Sample IDs have been saved to $sample_ids_file"
