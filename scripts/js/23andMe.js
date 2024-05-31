// Importing necessary libraries using ES6 modules
import { csv, tsv, csvFormat } from 'https://esm.sh/d3@7.9.0';
import * as saver from 'https://esm.sh/file-saver@2.0.5';

// Function to extract "chrN:pos"
const extractChrPos = value => {
    const parts = value.split('_');
    return `${parts[0]}:${parts[1]}`;
};

// Function to extract alternative allele
const extractAltAllele = value => {
    const parts = value.split('_');
    return parts[3];
};

// Function to extract reference allele
const extractRefAllele = value => {
    const parts = value.split('_');
    return parts[2];
};

// Function to read data from CSV and TSV files
const readData = async (positionInfoPath, andmeDataPath) => {
    const positionInfo = await csv(positionInfoPath);

    const andmeDataRaw = await fetch(andmeDataPath)
        .then(response => response.text());

    const andmeData = andmeDataRaw.split('\n')
        .filter(line => !line.startsWith('#'))
        .map(line => {
            const [rsid, chromosome, position, genotype] = line.split('\t');
            return { 
                rsid, 
                chromosome, 
                position, 
                genotype: genotype ? genotype.trim() : null,  // Trim any extra whitespace including \r
                chr_pos: `chr${chromosome}:${position}` 
            };
        })
        .filter(d => d.rsid); // Remove empty lines

    positionInfo.forEach(d => {
        d.chr_pos = extractChrPos(d.matching_columns);
        d.Alt = extractAltAllele(d.matching_columns);
        d.Ref = extractRefAllele(d.matching_columns);
    });

    return { positionInfo, andmeData };
};

// Function to merge data
const mergeData = (positionInfo, andmeData) => {
    const andmeDataMap = new Map(andmeData.map(d => [d.chr_pos, d]));
    return positionInfo.map(d => ({ ...d, ...andmeDataMap.get(d.chr_pos) }));
};

// Function to create allele columns
const createAlleleColumns = data => {
    data.forEach(d => {
        d.maternal_allele = d.genotype ? d.genotype[0] : null;
        d.paternal_allele = d.genotype ? d.genotype[1] : null;
    });
    return data;
};

// Function to calculate dosage
const calcDosage = (allele, altAllele) => {
    if (!allele || !altAllele) return NaN;
    return allele === altAllele ? 1 : 0;
};

// Function to apply dosage calculation
const applyDosageCalculation = data => {
    data.forEach(d => {
        d.maternal_dosage = calcDosage(d.maternal_allele, d.Alt);
        d.paternal_dosage = calcDosage(d.paternal_allele, d.Alt);
        d.unphased_dosage = d.maternal_dosage + d.paternal_dosage;
    });
    return data;
};

// Function to create phased columns
const createPhasedColumns = data => {
    data.forEach(d => {
        const [coordPrefix, position] = d.chr_pos.split(':');
        d.phased_column_maternal = `${coordPrefix}_${position}_${d.Ref}_${d.Alt}_maternal`;
        d.phased_column_paternal = `${coordPrefix}_${position}_${d.Ref}_${d.Alt}_paternal`;
        d.unphased_column = `${coordPrefix}_${position}_${d.Ref}_${d.Alt}_combined`;
    });
    return data;
};

// Function to create output data
const createOutputData = data => {
    const outputData = {};

    data.forEach(d => {
        outputData[d.phased_column_maternal] = d.maternal_dosage;
        outputData[d.phased_column_paternal] = d.paternal_dosage;
        outputData[d.unphased_column] = d.unphased_dosage;
    });

    return [outputData];
};

// Function to save data as CSV
const saveToCsv = (data, outputFileName) => {
    const csvContent = csvFormat(data);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, outputFileName);
};

// Main function to process 23andMe data
const process23andMeData = async (positionInfoPath, andmeDataPath, outputFileName) => {
    const { positionInfo, andmeData } = await readData(positionInfoPath, andmeDataPath);
    let mergedData = mergeData(positionInfo, andmeData);
    mergedData = createAlleleColumns(mergedData);
    mergedData = applyDosageCalculation(mergedData);
    mergedData = createPhasedColumns(mergedData);
    const outputData = createOutputData(mergedData);
    saveToCsv(outputData, outputFileName);
    return outputData;
};

// Example usage
process23andMeData('../../Data/Filtered_raw_training_data_union/matching_columns_all.csv', '../../Data/23andMe_files/11703.23andme.9619.txt', 'output.csv')
    .then(data => console.log(data));
export{
    process23andMeData
}
