#!/bin/bash

# Path to your list of locations
locations_file="path/to/your/locations.txt"

# Directory where your VCF files are stored
vcf_dir="path/to/your/vcf_files"

# Output directory for the PLINK files
output_dir="./data"

# Check if output directory exists, if not create it
mkdir -p "$output_dir"

# Process the locations file
# This assumes the format: chromosome position, one per line
while IFS=' ' read -r chromosome position; do
    # Define the output prefix, including chromosome and position for uniqueness
    output_prefix="${output_dir}/chr${chromosome}_pos${position}"
    
    # Define the VCF file for the current chromosome
    vcf_file="${vcf_dir}/chr${chromosome}.vcf"
    
    # Check if the VCF file exists
    if [ -f "$vcf_file" ]; then
        # Use PLINK to extract the genotype information for the specified position
        # Adjust PLINK commands as necessary for your version and requirements
        plink --vcf "$vcf_file" \
              --chr "$chromosome" \
              --from-bp "$position" --to-bp "$position" \
              --make-bed \
              --out "${output_prefix}"
    else
        echo "VCF file for chromosome ${chromosome} not found."
    fi
done < "$locations_file"
