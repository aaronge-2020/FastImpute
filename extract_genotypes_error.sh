#!/bin/bash
# Path to your list of locations
locations_file="./positions/missing_positions_2.txt"

# Directory where your VCF files are stored
vcf_dir="./1000_Genomes_Project"

# Output directory for the PLINK files
output_dir="./data"

# Final VCF output file
final_vcf_file="${output_dir}/all_positions.vcf"

# Check if output directory exists, if not create it
mkdir -p "$output_dir"

# Temporary file for concatenating all VCF outputs
temp_vcf_list="${output_dir}/temp_vcf_list.txt"
> "$temp_vcf_list"

# Checkpoint file to keep track of processed SNPs
checkpoint_file="${output_dir}/error_checkpoint.txt"
touch "$checkpoint_file"

# Process the locations file
# This assumes the format: chromosome position, one per line
while IFS=' ' read -r chromosome position; do
    output_prefix="${output_dir}/chr${chromosome}_pos${position}"
    
    # Skip if this SNP has already been processed
    if grep -q "$output_prefix" "$checkpoint_file"; then
        echo "Skipping already processed position: $chromosome $position"
        continue
    fi
    
    vcf_file="${vcf_dir}/ALL.chr${chromosome}.phase3_shapeit2_mvncall_integrated_v5b.20130502.genotypes.vcf.gz"
    
    if [ -f "$vcf_file" ]; then
        vcf_out="${output_prefix}.vcf"
        
        bcftools view -r "${chromosome}:${position}-${position}" "$vcf_file" > "$vcf_out"
        
        echo "$vcf_out" >> "$temp_vcf_list"
        
        # Add this SNP to the checkpoint file
        echo "$output_prefix" >> "$checkpoint_file"
    else
        echo "VCF File Path: ${vcf_file}"
        echo "VCF file for chromosome ${chromosome} not found."
    fi
done < "$locations_file"

