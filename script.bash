#!/bin/bash

module load vcftools
# Path to the dataset

output_dir="~/data/"

input_vcf="/fdb/beagle/chr1.1kg.phase3.v5a.vcf.gz"

positions_file="./locations.txt"

output_prefix="${output_dir}""

vcftools --gzvcf "$input_vcf" \
--positions "$positions_file" \
--out "$output_prefix" \
--recode --recode-INFO-all 


