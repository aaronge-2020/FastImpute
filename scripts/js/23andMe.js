async function fetchDefaultFile(url) {
    const response = await fetch(url);
    return response.text();
}


async function processFiles() {
    const positionInfoFile = document.getElementById('positionInfoFile').files[0];
    const andmeDataFile = document.getElementById('andmeDataFile').files[0];
    
    const defaultPositionInfoPath = './Data/Filtered_unphased_training_data_union_final/23andMe_matching_variants_updated.csv';
    const defaultAndmeDataPath = './Data/23andMe_files/6800.23andme.10042.txt';

    let positionInfoContent, andmeDataContent;

    if (positionInfoFile) {
        positionInfoContent = await readFile(positionInfoFile);
    } else {
        positionInfoContent = await fetchDefaultFile(defaultPositionInfoPath);
    }

    if (andmeDataFile) {
        andmeDataContent = await readFile(andmeDataFile);
    } else {
        andmeDataContent = await fetchDefaultFile(defaultAndmeDataPath);
    }

    const positionInfo = Papa.parse(positionInfoContent, { header: true }).data;
    const andmeData = Papa.parse(andmeDataContent, { header: false, delimiter: '\t', skipEmptyLines: true, comments: "#" }).data;
    
    const dosageData = process23andmeData(positionInfo, andmeData);

    return dosageData;
}

function readFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsText(file);
    });
}

function process23andmeData(positionInfo, andmeData) {
    const andmeDataFormatted = andmeData.map(row => ({
        rsid: row[0],
        chromosome: row[1],
        position: row[2],
        genotype: row[3]
    }));

    const mergedData = mergeData(positionInfo, andmeDataFormatted);
    createAlleleColumns(mergedData);
    applyDosageCalculation(mergedData);
    createPhasedColumns(mergedData);
    const outputData = createOutputDataframe(mergedData);
    return outputData;
    // displayOutput(outputData);
}

function mergeData(positionInfo, andmeData) {
    return positionInfo.map(pos => {
        const match = andmeData.find(andme => andme.rsid === pos.RS_Number);
        return { ...pos, ...match };
    });
}

function createAlleleColumns(data) {
    data.forEach(row => {
        row.maternal_allele = row.genotype ? row.genotype[0] : null;
        row.paternal_allele = row.genotype ? row.genotype[1] : null;
    });
}

function calcDosage(allele, altAllele) {
    if (allele === null || altAllele === null) {
        return NaN;
    }
    return allele === altAllele ? 1 : 0;
}

function applyDosageCalculation(data) {
    data.forEach(row => {
        row.maternal_dosage = calcDosage(row.maternal_allele, row.Alt);
        row.paternal_dosage = calcDosage(row.paternal_allele, row.Alt);
        row.unphased_dosage = row.maternal_dosage + row.paternal_dosage;
    });
}

function createPhasedColumns(data) {
    data.forEach(row => {
        try {
            const [coordPrefix, position] = row.Coord.split(':');
            const [ref, alt] = row.Alleles.split('/').map(allele => allele.trim());
            row.phased_column_maternal = `${coordPrefix}_${position}_${ref}_${alt}_maternal`;
            row.phased_column_paternal = `${coordPrefix}_${position}_${ref}_${alt}_paternal`;
            row.unphased_column = `${coordPrefix}_${position}_${ref}_${alt}_combined`;
        } catch (error) {
            console.error('Error creating phased columns', error);
            debugger
        }

    });
}

function createOutputDataframe(data) {
    const output = {};
    data.forEach(row => {
        output[row.phased_column_maternal] = row.maternal_dosage;
        output[row.phased_column_paternal] = row.paternal_dosage;
        output[row.unphased_column] = row.unphased_dosage;
    });
    return output;
}

export{
    processFiles
}
// Add the event listener to the processFiles button
