<template>
  <div class="container-fluid">
    <div class="row">
      <div class="col-sm-12">
        <h1>About</h1>
        <p>
          Created by Alan Kwong, Mukai Wang, Andy Boughton, Peter VandeHaar, and Hyun Min Kang.
          Source code can be found on <a href="https://github.com/statgen/fivex/">GitHub</a>.
        </p>

        <p>
          eQTL data was obtained from the GTEx Project, v8, with 49 tissues in up to 670 subjects
          with both genotypes and expression data.
        </p>

        <p><small>&copy; {{ (new Date()).getFullYear() }} - The University of Michigan, Center for Statistical Genetics</small></p>
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
