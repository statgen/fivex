<template>
  <div class="container-fluid">
    <div class="row">
      <div class="col-sm-12">
        <h1>About</h1>
        <p>
          FIVEx is a tool for browsing cis-eQTL datasets. It provides a number of tools aimed at functional interpretation.
          See our <a href="https://www.biorxiv.org/content/10.1101/2021.01.22.426874v1">preprint</a> for details.
        </p>

        <p>
          Created by Alan Kwong, Mukai Wang, Peter VandeHaar, Andy Boughton, and Hyun Min Kang.
          Source code can be found on <a href="https://github.com/statgen/fivex/">GitHub</a>.
        </p>

        <p>
          Gene expression (eQTL) and splicing (sQTL) data was harmonized and reprocessed by the EBI eQTL Catalogue. (see <a href="https://www.ebi.ac.uk/eqtl/Studies/">list of available studies</a> or <a href="https://www.ebi.ac.uk/eqtl/Data_access/">download the data</a>).
          All positions are relative to genome build GRCh38.
        </p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
    name: 'About',
};
</script>

<style scoped>

</style>
