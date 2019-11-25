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
    const chromposPattern = /(chr)?([0-9][0-9]?|X|Y|MT):([0-9]+)/;
    const cMatch = searchText.match(chromposPattern);
    // If input is in 'chrom:pos' format (with or without 'chr'), go directly to the single-variant page
    // TODO: Show closest variant if specific variant does not exist
    if (cMatch !== null && searchText === cMatch[0]) {
        const chrom = cMatch[2];
        const pos = cMatch[3];
        window.location = `/variant/${chrom}-${pos}`;
    } else {
        // Use omnisearch - works especially well for rs numbers
        const omniurl = 'https://portaldev.sph.umich.edu/api_internal_dev/v1/annotation/omnisearch/?q=' + searchText + '&build=GRCh38';
        getOmni(omniurl, function (err, omniJson) {
            if (err !== null) {
                alert('Error encountered: ' + err);
            } else {
                if (omniJson.data[0].chrom !== undefined && omniJson.data[0].start === omniJson.data[0].end) {
                    const chrom = omniJson.data[0].chrom;
                    const pos = omniJson.data[0].start;
                    window.location = `/variant/${chrom}-${pos}`;
                } else if (omniJson.data[0].gene_name !== undefined) {
                    // If omnisearch returns a region (because you entered a gene)
                    // TODO: Create a region view
                    // Region view plot requires the following: chrom (no 'chr'), gene_id, tissue, start, end
                    // Given a gene, we first look up in an sqlite3 database for the eQTL with the most significant p-value
                    // This gives us the "best tissue"
                    // Then we draw a region around the position of that eQTL to set start and end (+/- 500k?)
                    // chrom = chrom.replace("chr","")
                    // gene_id = omniJson.data[0].gene_id
                    // Query sqlite3 database here
                    // center =  // get from sqlite3 results
                    // tissue =  // get from sqlite3 results
                    alert('You searched for the following gene: ' + omniJson.data[0].gene_name + '.\nSorry, we currently do not support region view (Will be added later).');
                } else {
                    alert('Sorry, we were unable to find variant "' + searchText + '" in our database.');
                }
            }
        });
    }
}
