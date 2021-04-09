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
          Created by Alan Kwong, Mukai Wang, Andy Boughton, Peter VandeHaar, and Hyun Min Kang.
          Source code can be found on <a href="https://github.com/statgen/fivex/">GitHub</a>.
        </p>

        <p>
          eQTL data was obtained from the GTEx Project, v8, with 49 tissues in up to 670 subjects
          with both genotypes and expression data. All positions are relative to genome build GRCh38.
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
