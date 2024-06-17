// Importing necessary libraries using ES6 modules
import { csv } from 'https://esm.sh/d3@7.9.0';

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

// Function to extract PRS313 information
const extractPRS313Info = value => {
    const parts = value.split('_');
    return parts[4] === 'PRS313' ? 'PRS313' : null;
};

// Function to read data from CSV and TSV files
const readData = async (positionInfoPath, andmeDataContent) => {
    const positionInfo = await csv(positionInfoPath);

    const andmeData = andmeDataContent.split('\n')
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
        d.PRS313 = extractPRS313Info(d.matching_columns);
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
        d.phased_column_maternal = `${coordPrefix}_${position}_${d.Ref}_${d.Alt}_maternal${d.PRS313 ? '_PRS313' : ''}`;
        d.phased_column_paternal = `${coordPrefix}_${position}_${d.Ref}_${d.Alt}_paternal${d.PRS313 ? '_PRS313' : ''}`;
        d.unphased_column = `${coordPrefix}_${position}_${d.Ref}_${d.Alt}_combined${d.PRS313 ? '_PRS313' : ''}`;
    });
    return data;
};

// Function to create chromosome-wise dictionaries
const createChromosomeWiseData = data => {
    const chromosomeData = {};

    // Initialize a dictionary for each chromosome
    for (let i = 1; i <= 22; i++) {
        chromosomeData[`chr${i}`] = { non_PRS313: {}, PRS313: {} };
    }

    // Populate the chromosome-specific dictionaries
    data.forEach(d => {
        const chromosome = d.chr_pos.split(':')[0];
        if (chromosomeData[chromosome]) {
            const targetDict = d.PRS313 ? chromosomeData[chromosome].PRS313 : chromosomeData[chromosome].non_PRS313;
            // targetDict[d.phased_column_maternal] = d.maternal_dosage;
            // targetDict[d.phased_column_paternal] = d.paternal_dosage;
            targetDict[d.unphased_column] = d.unphased_dosage;
        }
    });

    return chromosomeData;
};

// Function to read the uploaded 23andMe file
const readAndmeFile = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = event => resolve(event.target.result);
    reader.onerror = reject;
    reader.readAsText(file);
});

// Main function to process 23andMe data
const process23andMeData = async (andmeDataContent) => {
    const positionInfoPath = 'https://raw.githubusercontent.com/aaronge-2020/DeepImpute/main/Data/Filtered_raw_training_data_union/matching_columns_all.csv';

    const { positionInfo, andmeData } = await readData(positionInfoPath, andmeDataContent);
    let mergedData = mergeData(positionInfo, andmeData);
    mergedData = createAlleleColumns(mergedData);
    mergedData = applyDosageCalculation(mergedData);
    mergedData = createPhasedColumns(mergedData);
    const chromosomeWiseData = createChromosomeWiseData(mergedData);

    return chromosomeWiseData;
};


export {
    process23andMeData,
    readAndmeFile, 

};