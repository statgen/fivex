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
        const chrom = cMatchRange[2];
        const start = cMatchRange[3];
        const end = cMatchRange[4];
        window.location = `/region/?chrom=${chrom}&start=${start}&end=${end}`;
    } else {
        // Use omnisearch - works especially well for rs numbers
        const omniurl = 'https://portaldev.sph.umich.edu/api/v1/annotation/omnisearch/?q=' + searchText + '&build=GRCh38';
        getOmni(omniurl, function (err, omniJson) {
            if (err !== null) {
                alert('Error encountered: ' + err);
            } else {
                if (omniJson.data[0].chrom !== undefined && omniJson.data[0].start === omniJson.data[0].end) {
                    const chrom = omniJson.data[0].chrom;
                    const pos = omniJson.data[0].start;
                    window.location = `/variant/${chrom}_${pos}`;
                } else if (omniJson.data[0].gene_id !== undefined) {
                    const gene_id = omniJson.data[0].gene_id;
                    window.location = `/gene/${gene_id}`;
                    alert('You searched for the following gene: ' + omniJson.data[0].gene_name + '.\nSorry, we currently do not support region view (Will be added later).');
                } else {
                    alert('Sorry, we were unable to find variant "' + searchText + '" in our database.');
                }
            }
        });
    }
}
