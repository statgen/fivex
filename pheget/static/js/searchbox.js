var getOmni = function (omniurl, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', omniurl, true);
    xhr.responseType = 'json';
    xhr.onload = function() {
     var status = xhr.status;
     if (status === 200) {
      callback(null, xhr.response);
     } else {
      callback(status, xhr.response);
     }
    };
    xhr.send();
   };

function parseSearch(searchText) {
    chromposPattern = /(chr)?([0-9][0-9]?|X|Y|MT):([0-9]+)/;
    rsPattern = /[Rr][Ss][0-9]+/;
    cMatch = searchText.match(chromposPattern)
    rsMatch = searchText.match(rsPattern)
    // If input is in 'chrom:pos' format (with or without 'chr'), go directly to the single-variant page
    // TODO: Show closest variant if specific variant does not exist
    if (cMatch !== null && searchText === cMatch[0]) {
    const chrom = cMatch[2];
    const pos = cMatch[3];
    window.location = `/variant/${chrom}_${pos}`;
    } else {
    // Use omnisearch - works especially well for rs numbers
    const omniurl = "https://portaldev.sph.umich.edu/api_internal_dev/v1/annotation/omnisearch/?q=" + searchText + "&build=GRCh38";
    getOmni(omniurl, function(err,omniJson) {
        if (err !== null) {
        alert('Error encountered: ' + err);
        } else {
        if ( omniJson.data[0].chrom !== undefined && omniJson.data[0].start === omniJson.data[0].end) {
            const chrom = omniJson.data[0].chrom;
            const pos = omniJson.data[0].start;
            window.location = `/variant/${chrom}_${pos}`;
        } else if ( omniJson.data[0].gene_name != undefined) {
        // If omnisearch returns a region (because you entered a gene)
        // TODO: Create a region view
        alert("You searched for the following gene: " + omniJson.data[0].gene_name + ".\nSorry, we currently do not support region view (Will be added later).");
        } else {
        alert("Sorry, we were unable to find variant ''" + searchText + "' in our database.");
        }
        }
    });
    };
}