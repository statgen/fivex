/**
 * Reusable code for searchbox widget
 */

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
    return fetch(omniurl)
        .then(handleErrors)
        .then((response) => response.json())
        .then((myJson) => myJson.data[0]);
}


// Returns the data from our internal best range query API by searching for chrom:start-end
//  with a resulting Promise with gene_id, symbol, and tissue, which we will use in exact range queries
function getBestRange(chrom, start, end, gene_id = null) {
    var bestURL = `/api/region/${chrom}/${start}-${end}/best/`;
    if (gene_id !== null) {
        bestURL += `?gene_id=${gene_id}`;
    }
    return fetch(bestURL)
        .then(handleErrors)
        .then((response) => response.json())
        .then((resp) => resp.data);
}


// Define a function that returns the search query type to the parseSearch function
// We expect queries in the form of a single variant (chr:pos or rsnum), a range (chr:start-end), or a gene name (ENSG or symbol)
// This function always returns a Promise, because parseSearch expects it
function parseSearchText(searchText) {
    searchText = searchText.trim();
    // Use regular expressions to match known patterns for single variant, range, and rs number
    const chromposPattern = /(chr)?([1-9][0-9]?|X|Y|MT):([1-9][0-9]*)/;
    const rangePattern = /(chr)?([1-9][0-9]?|X|Y|MT):([1-9][0-9]*)-([1-9][0-9]*)/;
    const rsPattern = /(rs[1-9][0-9]*)/;
    const cMatch = searchText.match(chromposPattern);
    const cMatchRange = searchText.match(rangePattern);
    const cMatchRS = searchText.match(rsPattern);
    // If input is in 'chrom:pos' format (with or without 'chr'), return the position of the single variant
    // TODO: Show closest variant if specific variant does not exist
    if (cMatch !== null && searchText === cMatch[0]) {
        const chrom = cMatch[2];
        const pos = parseInt(cMatch[3]);
        return Promise.resolve({ type: 'variant', chrom, start: pos, end: pos });
    } else if (cMatchRange !== null && searchText === cMatchRange[0]) {
        // If the query is a range in the form [chr]:[start]-[end], return the position of the range
        const chrom = cMatchRange[2];
        const range1 = parseInt(cMatchRange[3]);
        const range2 = parseInt(cMatchRange[4]);
        const start = Math.min(range1, range2);
        const end = Math.max(range1, range2);
        return getBestRange(chrom, start, end)
            .then(function(result) {
                var varData = result;
                const gene_id = varData.gene_id;
                const symbol = varData.symbol;
                const tissue = varData.tissue;
                return { type: 'range', chrom, start, end, gene_id, symbol, tissue };
            });
    } else if (cMatchRS !== null && searchText === cMatchRS[0]) {
        // If input is in rs# format, use omnisearch to convert to chrom:pos, then return the position
        return getOmniSearch(searchText)
            .then(function(result) {
                if (result.error === 'SNP not found') {
                    throw new Error('Omnisearch was unable to find the variant with rs number "' + searchText + '"');
                } else {
                    const { chrom, start, end } = result;
                    return { type: 'variant', chrom, start, end };
                }
            });
    } else {
        // If input is a gene or some other unknown format, then look for the best eQTL signal for that gene
        // First, look up the search query on omnisearch
        return getOmniSearch(searchText)
            .then(function(result) {
                // Pass the gene_id (ENSG...) to the next step, if it exists
                if (result.gene_id === undefined) {
                    return;
                } else {
                    const chrom = result.chrom;
                    const start = Math.max(result.start - 500000, 1);
                    const end = result.end + 500000;
                    const gene_id = result.gene_id;
                    return { chrom, start, end, gene_id };
                }
            })
            .then(function(omni) {
                // If omnisearch finds a gene_id, then return the range of the gene +/- 500000 and send the user to the region view
                if (!omni) {
                    // TODO: If the input is not recognizable as any format, and is not a gene, then we should show a user error message that the requested entity was not found
                    throw new Error('Sorry, we were unable to parse your query.');
                }
                const { chrom, start, end } = omni;
                const gene_id = omni.gene_id;
                return getBestRange(chrom, start, end, gene_id)
                    .then(function(bestRangeResult) {
                        const { symbol, tissue } = bestRangeResult;
                        const { chrom, start, end } = omni;
                        return { type: 'range', chrom, start, end, gene_id: gene_id, symbol, tissue };
                    });
            });
    }
}

// eslint-disable-next-line no-unused-vars
function parseSearch(searchText) {
    parseSearchText(searchText)
        .then(function(omniresult) {
            if (omniresult === undefined || omniresult.type === 'other' && omniresult.chrom === null && omniresult.start === null && omniresult.end === null) {
                throw new Error('Sorry, we are unable to parse your query.');
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
        .catch(err => {
            alert(err.message);
            console.log(err.message);
        });
}
