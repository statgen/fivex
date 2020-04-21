<template>
  <div>
    <form @submit.prevent="parseSearch">
      <div class="input-group">
        <input v-model.trim="term"
               autocomplete="off" class="form-control" type="text"
               placeholder="Search for a variant, region, or gene: chr19:488506, rs10424907, or SHC2" autofocus/>
        <div class="input-group-append">
          <button class="btn btn-secondary" type="submit">
            <span class="fa fa-search" aria-hidden="true"></span>
            <span class="sr-only">Search</span>
          </button>
        </div>
      </div>
      <div class="row" v-if="message">
        <div class="col-sm-12"><span :class="[message_class]">{{message}}</span></div>
      </div>
    </form>
  </div>
</template>

<script>
/**
 * Reusable code for searchbox widget
 */

import { handleErrors } from '@/util/common';


// Returns the data from an omnisearch fetch if successful, return nothing otherwise
function getOmniSearch(searchText) {
  const omniurl = `https://portaldev.sph.umich.edu/api/v1/annotation/omnisearch/?q=${searchText}&build=GRCh38`;
  return fetch(omniurl)
    .then(handleErrors)
    .then((response) => response.json())
    .then((myJson) => myJson.data[0]);
}


// Returns the data from our internal best range query API by searching for chrom:start-end
//  with a resulting Promise with gene_id, symbol, and tissue, which we will use in exact
//  range queries
function getBestRange(chrom, start, end, gene_id = null) {
  let bestURL = `/api/data/region/${chrom}/${start}-${end}/best/`;
  if (gene_id !== null) {
    bestURL += `?gene_id=${gene_id}`;
  }
  return fetch(bestURL)
    .then(handleErrors)
    .then((response) => response.json())
    .then((resp) => resp.data);
}


// Define a function that returns the search query type to the parseSearch function
// We expect queries in the form of a single variant (chr:pos or rsnum), a range (chr:start-end),
// or a gene name (ENSG or symbol)
// This function always returns a Promise, because parseSearch expects it
function parseSearchText(text) {
  const searchText = text.trim();
  // Use regular expressions to match known patterns for single variant, range, and rs number
  const chromposPattern = /(chr)?([1-9][0-9]?|X|Y|MT):([1-9][0-9]*)/;
  const rangePattern = /(chr)?([1-9][0-9]?|X|Y|MT):([1-9][0-9]*)-([1-9][0-9]*)/;
  const rsPattern = /(rs[1-9][0-9]*)/;
  const cMatch = searchText.match(chromposPattern);
  const cMatchRange = searchText.match(rangePattern);
  const cMatchRS = searchText.match(rsPattern);
  // If input is in 'chrom:pos' format (with or without 'chr'), return the position of the
  //  single variant
  // TODO: Show closest variant if specific variant does not exist
  if (cMatch !== null && searchText === cMatch[0]) {
    const chrom = cMatch[2];
    const pos = +cMatch[3];
    return Promise.resolve({ type: 'variant', chrom, start: pos, end: pos });
  }

  if (cMatchRange !== null && searchText === cMatchRange[0]) {
    // If the query is a range in the form [chr]:[start]-[end], return the position of the range
    const chrom = cMatchRange[2];
    const range1 = +cMatchRange[3];
    const range2 = +cMatchRange[4];
    const start = Math.min(range1, range2);
    const end = Math.max(range1, range2);
    return getBestRange(chrom, start, end)
      .then((result) => {
        const { gene_id, symbol, tissue } = result;
        return { type: 'range', chrom, start, end, gene_id, symbol, tissue };
      });
  }
  if (cMatchRS !== null && searchText === cMatchRS[0]) {
    // If input is in rs# format, use omnisearch to convert to chrom:pos, then return the position
    return getOmniSearch(searchText)
      .then((result) => {
        if (result.error === 'SNP not found') {
          throw new Error(`Omnisearch was unable to find the variant with rs number "${searchText}"`);
        } else {
          const { chrom, start, end } = result;
          return { type: 'variant', chrom, start, end };
        }
      });
  }
  // If input is a gene or some other unknown format, then look for the best eQTL signal
  //  for that gene
  // First, look up the search query on omnisearch
  return getOmniSearch(searchText)
    .then((result) => {
      // Pass the gene_id (ENSG...) to the next step, if it exists
      if (!result.gene_id) {
        return false;
      }

      const { chrom, gene_id } = result;
      const start = Math.max(result.start - 500000, 1);
      const end = result.end + 500000;
      return { chrom, start, end, gene_id };
    })
    .then((omni) => {
      // If omnisearch finds a gene_id, then return the range of the gene +/- 500000 and
    // send the user to the region view
      if (!omni) {
        // TODO: If the input is not recognizable as any format, and is not a gene, then we
        //  should show a user error message that the requested entity was not found
        throw new Error('Invalid query.');
      }
      const { chrom, start, end } = omni;
      const { gene_id } = omni;
      return getBestRange(chrom, start, end, gene_id)
        .then((bestRangeResult) => {
          const { symbol, tissue } = bestRangeResult;
          // eslint-disable-next-line no-shadow
          const { chrom, start, end } = omni;
          return { type: 'range', chrom, start, end, gene_id, symbol, tissue };
        })
        .catch(() => getBestRange(chrom, start, end)
          .then((bestRangeResult) => {
            // eslint-disable-next-line no-shadow
            const { symbol, gene_id, tissue } = bestRangeResult;
            // eslint-disable-next-line no-shadow
            const { chrom, start, end } = omni;

            this.showMessage('No significant eQTLs found for the query gene, redirecting to next best match.');
            return { type: 'range', chrom, start, end, gene_id, symbol, tissue };
          }));
    });
}

export default {
  name: 'SearchBox',
  data() {
    return {
      term: '',
      message: '',
      message_class: '',
    };
  },
  methods: {
    showMessage(message, style = 'text-danger') {
      this.message = message;
      this.message_class = style;
    },
    parseSearch() {
      parseSearchText(this.term)
        .then((omniresult) => {
          if ((omniresult === undefined || omniresult.type === 'other')
            && omniresult.chrom === null && omniresult.start === null
            && omniresult.end === null) {
            throw new Error('Invalid query.');
          } else {
            return (omniresult);
          }
        })
        .then((result) => {
          const chrom = result.chrom.replace('chr', '');
          if (result.type === 'variant') {
            return this.$router.push({ name: 'variant', params: { variant: `${chrom}_${result.start}` } });
          }
          if (result.type === 'range') {
            const { start, end, gene_id, tissue, symbol } = result;
            return this.$router.push({
              name: 'region',
              query: {
                chrom,
                start,
                end,
                gene_id,
                symbol,
                tissue,
              },
            });
          }
          // If the result is not a variant or range, the search box doesn't know what to do
          throw new Error('Unrecognized navigation request');
        })
        .catch((err) => {
          // If nav fails because the user searched for the variant they were already looking at,
          //  suppress the developer-focused error message and just treat as a search box
          //  that has no effect
          if (err.name !== 'NavigationDuplicated') {
            this.showMessage(err.message);
          }
        });
    },
  },
};
</script>

<style scoped>
</style>
