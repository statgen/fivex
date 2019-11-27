var getOmni = function (omniurl, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', omniurl, true);
    xhr.responseType = 'json';
    xhr.onload = function () {
        var status = xhr.status;
        if (status === 200) {
            callback(null, xhr.response);
        } else {
            callback(status, xhr.response);
        }
    };
    xhr.send();
};

// eslint-disable-next-line no-unused-vars
function parseSearch(searchText) {
    const chromposPattern = /(chr)?([1-9][0-9]?|X|Y|MT):([1-9][0-9]+)/;
    const rangePattern = /(chr)?([1-9][0-9]?|X|Y|MT):([1-9][0-9]+)-([1-9][0-9]+)/;
    const cMatch = searchText.match(chromposPattern);
    const cMatchRange = searchText.match(rangePattern);
    // If input is in 'chrom:pos' format (with or without 'chr'), go directly to the single-variant page
    // TODO: Show closest variant if specific variant does not exist
    if (cMatch !== null && searchText === cMatch[0]) {
        const chrom = cMatch[2];
        const pos = cMatch[3];
        window.location = `/variant/${chrom}_${pos}`;
    } else if (cMatchRange !== null && searchText === cMatchRange[0]) {
        // If the query is a range in the form [chr]:[start]-[end], go to a region view page of that range
        const chrom = cMatchRange[2];
        const start = cMatchRange[3];
        const end = cMatchRange[4];
        window.location = `/region/?chrom=${chrom}&start=${start}&end=${end}`;
    } else {
        // Use omnisearch to parse any other query - works especially well for rs numbers and gene names
        const omniurl = 'https://portaldev.sph.umich.edu/api/v1/annotation/omnisearch/?q=' + searchText + '&build=GRCh38';
        getOmni(omniurl, function (err, omniJson) {
            if (err !== null) {
                alert('Error encountered: ' + err);
            } else {
                // If the result is a single variant, parse the position and try to go to the single variant view
                // Note: this works because omnisearch will return start=end even for indels
                if (omniJson.data[0].chrom !== undefined && omniJson.data[0].start === omniJson.data[0].end) {
                    const chrom = omniJson.data[0].chrom;
                    const pos = omniJson.data[0].start;
                    window.location = `/variant/${chrom}_${pos}`;
                } else if (omniJson.data[0].gene_id !== undefined) {
                    // If the result is a gene, get the range of the gene, pad it on both sides, and go to a region view
                    const chrom = omniJson.data[0].chrom;
                    const gene_id = omniJson.data[0].gene_id;
                    const start = Math.max(omniJson.data[0].start - 300000, 1);
                    const end = omniJson.data[0].end + 300000;
                    window.location = `/region/?chrom=${chrom}&gene_id=${gene_id}&start=${start}&end=${end}`;
                } else {
                    alert('Sorry, we were unable to find a match for the search term "' + searchText + '" in our database.');
                }
            }
        });
    }
}
