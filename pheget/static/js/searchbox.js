// Generic failure callback function
function failureCallback(error) {
    console.log('Error status: ' + error);
}


// Handles bad requests - copied from https://www.tjvantoll.com/2015/09/13/fetch-and-errors/
function handleErrors(response) {
    if (!response.ok) {
        throw Error(response.statusText);
    }
    return response;
}


// Returns the data from an omnisearch fetch if successful, return nothing otherwise
function getOmniSearch(searchText) {
    const omniurl = `https://portaldev.sph.umich.edu/api/v1/annotation/omnisearch/?q=${searchText}&build=GRCh38`;
    var data = fetch(omniurl)
        .then(handleErrors)
        .then((response) => response.json())
        .then((myJson) => myJson.data[0])
        .catch(function(error) {
            console.log('Omnisearch error, status code: ' + error);
            return;
        });
    return data;
}


// Returns the data from our internal best variant API by searching for the gene_id (ENSG...) or gene_name
function getBestVar(symbol) {
    const bestVarURL = `/api/gene/${symbol}/bestvar/`;
    var data = fetch(bestVarURL)
        .then(handleErrors)
        .then((response) => response.json())
        .then((resp) => resp.data)
        .catch(failureCallback);
    return data;
}


// Returns the data from our internal best range query API by searching for chrom:start-end
//  with a resulting Promise with gene_id, symbol, and tissue, which we will use in exact range queries
function getBestRange(chrom, start, end) {
    const bestURL = `/api/region/${chrom}/${start}-${end}/best/`;
    var data = fetch(bestURL)
        .then(handleErrors)
        .then((response) => response.json())
        .then((resp) => resp.data)
        .catch(failureCallback);
    return data;
}


// Define a function that returns the search query type to the parseSearch function
// We expect queries in the form of a single variant (chr:pos or rsnum), a range (chr:start-end), or a gene name (ENSG or symbol)
// This function always returns a Promise, because parseSearch expects it
function parseSearchText(searchText) {
    // Use regular expressions to match known patterns for single variant, range, and rs number
    const chromposPattern = /(chr)?([1-9][0-9]?|X|Y|MT):([1-9][0-9]+)/;
    const rangePattern = /(chr)?([1-9][0-9]?|X|Y|MT):([1-9][0-9]+)-([1-9][0-9]+)/;
    const rsPattern = /(rs[1-9][0-9]+)/;
    const cMatch = searchText.match(chromposPattern);
    const cMatchRange = searchText.match(rangePattern);
    const cMatchRS = searchText.match(rsPattern);
    // If input is in 'chrom:pos' format (with or without 'chr'), return the position of the single variant
    // TODO: Show closest variant if specific variant does not exist
    var returnJson;
    var jsonPromise;
    if (cMatch !== null && searchText === cMatch[0]) {
        const chrom = cMatch[2];
        const pos = parseInt(cMatch[3]);
        returnJson = {type: 'variant', chrom, start: pos, end: pos};
        // Forcefully convert this return to a Promise to match the others
        // eslint-disable-next-line no-undef
        jsonPromise = new Promise((resolve) => {
            resolve(returnJson);
        });
        return jsonPromise;
    } else if (cMatchRange !== null && searchText === cMatchRange[0]) {
        // If the query is a range in the form [chr]:[start]-[end], return the position of the range
        const chrom = cMatchRange[2];
        const start = parseInt(cMatchRange[3]);
        const end = parseInt(cMatchRange[4]);
        var returnType = getBestRange(chrom, start, end)
            .then(function(result) {
                var varData = result;
                const gene_id = varData.gene_id;
                const symbol = varData.symbol;
                const tissue = varData.tissue;
                var returnStatus = {type: 'range', chrom, start, end, gene_id, symbol, tissue};
                return returnStatus;
            })
            .catch(failureCallback);
        return returnType;
    } else if (cMatchRS !== null && searchText === cMatchRS[0]) {
        // If input is in rs# format, use omnisearch to convert to chrom:pos, then return the position
        var rangeReturn = getOmniSearch(searchText)
            .then(function(result) {
                var varData = result;
                const chrom = varData.chrom;
                const start = varData.start;
                const end = varData.end;
                var returnStatus = {type: 'variant', chrom, start, end};
                return returnStatus;
            })
            .catch(failureCallback);
        return rangeReturn;
    } else {
        // If input is a gene or some other unknown format, then look for the best eQTL signal for that gene
        // First, look up the search query on omnisearch
        var jsonResult = getOmniSearch(searchText)
            .then(function(result) {
                // Pass the gene_id (ENSG...) to the next step, if it exists
                if (result.gene_id === undefined) {
                    return;
                }
                else {
                    const chrom = result.chrom;
                    const start = Math.max(result.start - 500000, 1);
                    const end = result.end + 500000;
                    const gene_id = result.gene_id;
                    var omni = {chrom, start, end, gene_id};
                    return omni;
                }
            })
            .then(function(omni) {
                // If omnisearch finds a gene_id, then return the range of the gene +/- 500000 and send the user to the region view
                const gene_id = omni.gene_id;
                var returnStatus = getBestVar(gene_id)
                    .then(function(bestVarResult) {
                        const tissue = bestVarResult.tissue;
                        const symbol = bestVarResult.symbol;
                        const chrom = omni.chrom;
                        const start = omni.start;
                        const end = omni.end;
                        var rangeData = {type: 'range', chrom, start, end, gene_id: gene_id, symbol, tissue};
                        return rangeData;
                    })
                    .catch(failureCallback);
                return returnStatus;
            })
            .catch(failureCallback);
        return jsonResult;
    }
}

// eslint-disable-next-line no-unused-vars
function parseSearch(searchText) {
    parseSearchText(searchText)
        .then(function(omniresult) {
            if (omniresult === undefined || omniresult.type === 'other' && omniresult.chrom === null && omniresult.start === null && omniresult.end === null) {
                alert('Sorry, we are unable to parse your query.');
                failureCallback('Omnisearch undefined or other');
            } else {
                return(omniresult);
            }
        })
        .then(function(result) {
            var chrom = result.chrom.replace('chr', '');
            if (result.type === 'variant') {
                window.location = `/variant/${chrom}_${result.start}`;
            }
            if (result.type === 'range') {
                window.location = `/region/?chrom=${chrom}&start=${result.start}&end=${result.end}&gene_id=${result.gene_id}&symbol=${result.symbol}&tissue=${result.tissue}`;
            }
        })
        .catch(failureCallback);
}
