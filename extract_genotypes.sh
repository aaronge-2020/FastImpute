#!/bin/bash

# Path to your list of locations
locations_file="./scripts/locations.txt"

# Directory where your VCF files are stored
vcf_dir="./1000_Genomes_Project"

# Output directory for the PLINK files
output_dir="./data"

# Final VCF output file
final_vcf_file="${output_dir}/all_positions.vcf"

# Check if output directory exists, if not create it
mkdir -p "$output_dir"

# Temporary file for concatenating all BED outputs
temp_bed_list="${output_dir}/temp_bed_list.txt"
> "$temp_bed_list"

# Checkpoint file to keep track of processed SNPs
checkpoint_file="${output_dir}/checkpoint.txt"
touch "$checkpoint_file"

# Function to convert BED to VCF
convert_bed_to_vcf() {
    local bed_prefix=$1
    local vcf_out="${bed_prefix}.vcf"
    plink2 --bfile "$bed_prefix" --export vcf --out "${bed_prefix}"
    echo "$vcf_out" >> "$temp_bed_list"
}

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
        plink2 --vcf "$vcf_file" \
              --chr "$chromosome" \
              --from-bp "$position" --to-bp "$position" \
              --make-bed \
              --out "${output_prefix}"

        # Convert the output BED to VCF
        convert_bed_to_vcf "$output_prefix"

        # Add this SNP to the checkpoint file
        echo "$output_prefix" >> "$checkpoint_file"
    else
        echo "VCF file for chromosome ${chromosome} not found."
    fi
done < "$locations_file"

# Concatenate all VCF files into a single one
# Assuming the header from the first VCF file is suitable for all
head -6 "$(head -n 1 "$temp_bed_list")" > "$final_vcf_file"
for vcf_file in $(cat "$temp_bed_list"); do
    # Skip header lines
    tail -n +7 "$vcf_file" >> "$final_vcf_file"
done

echo "All positions processed and concatenated into ${final_vcf_file}."
