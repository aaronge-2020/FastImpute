#!/bin/bash

# Path to the X_test sample IDs file
x_test_sample_ids_file="./Data/Beagle_test_input/X_test_sample_ids.txt"

# Directory where your VCF files are stored
vcf_dir="./Data/1000_Genomes_Project"

# Output directory for the VCF files
output_dir="./Data/Beagle_test_input"

# Output directory for the reference VCF files (minus x_test samples)
reference_output_dir="./Data/Beagle_reference_minus_test"

# Check if output directories exist, if not create them
mkdir -p "$output_dir"
mkdir -p "$reference_output_dir"

# Checkpoint file to keep track of processed samples
checkpoint_file="${output_dir}/bcf_checkpoint_samples.txt"
touch "$checkpoint_file"

# Process each VCF file
for vcf_file in "$vcf_dir"/*.vcf.gz; do
  output_vcf="${output_dir}/$(basename "$vcf_file" .vcf.gz)_filtered.vcf.gz"
  reference_output_vcf="${reference_output_dir}/$(basename "$vcf_file" .vcf.gz)_reference_filtered.vcf.gz"

  echo "Processing file: $output_vcf"
  echo "Creating reference file: $reference_output_vcf"

  # # Skip if the output file already exists
  # if [ -f "$output_vcf" ]; then
  #   echo "Skipping already processed file: $vcf_file"
  #   bcftools index "$output_vcf"
  # else
  #   # Use process substitution to pass sample IDs and positions directly to bcftools view
  #   bcftools view -S "$x_test_sample_ids_file" -R <(awk -F',' 'NR > 1 {print $1 "\t" $2 "\t" $2}' "./Data/23andMe_metadata_files/unique_positions_excluding_PRS313.csv") "$vcf_file" -m2 -M2 -v snps -Oz -o "$output_vcf"

  #   # Index the VCF file
  #   bcftools index "$output_vcf"

  #   # Check if bcftools command was successful
  #   if [ $? -ne 0 ]; then
  #     echo "Error processing file: $vcf_file"
  #     exit 1
  #   fi

  #   # Add this VCF file to the checkpoint file
  #   echo "$vcf_file" >> "$checkpoint_file"

  #   echo "Processed file: $output_vcf"
  # fi

  # Create reference dataset by excluding samples in x_test_sample_ids
  if [ -f "$reference_output_vcf" ]; then
    echo "Skipping already processed reference file: $vcf_file"
    bcftools index "$reference_output_vcf"
  else
    bcftools view -S ^"$x_test_sample_ids_file" "$vcf_file" -Oz -o "$reference_output_vcf"

    # Index the reference VCF file
    bcftools index "$reference_output_vcf"

    # Check if bcftools command was successful
    if [ $? -ne 0 ]; then
      echo "Error processing reference file: $vcf_file"
      exit 1
    fi

    echo "Processed reference file: $reference_output_vcf"
  fi
done

# Index the VCF files
for vcf_file in "$output_dir"/*.vcf.gz; do
  bcftools index "$vcf_file"
done

for reference_vcf_file in "$reference_output_dir"/*.vcf.gz; do
  bcftools index "$reference_vcf_file"
done

echo "Processing and indexing complete."
