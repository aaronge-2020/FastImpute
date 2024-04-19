#!/bin/bash

# Path to your file with positions
positions_file="./genome_Chad_Wrye_v5_Full_20220921063742.txt"

# Directory where your VCF files are stored
vcf_dir="./1000_Genomes_Project"

# Output directory for the VCF files
output_dir="./23AndMePositions2"

# Check if output directory exists, if not create it
mkdir -p "$output_dir"

# Checkpoint file to keep track of processed positions
checkpoint_file="${output_dir}/bcf_checkpoint_2.txt"
touch "$checkpoint_file"

# Process the positions file
# This assumes the format: rsid chromosome position genotype, tab-separated
while IFS=$'\t' read -r rsid chromosome position genotype; do
    # Skip header lines starting with '#'
    if [[ $rsid == "#"* ]]; then
        continue
    fi

    # Create chromosome-specific folder if it doesn't exist
    chromosome_dir="${output_dir}/chr${chromosome}"
    mkdir -p "$chromosome_dir"

    output_prefix="${chromosome_dir}/chr${chromosome}_pos${position}"

    # # Skip if this position has already been processed
    # if grep -q "$output_prefix" "$checkpoint_file"; then
    #     echo "Skipping already processed position: $chromosome $position"
    #     continue
    # fi

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