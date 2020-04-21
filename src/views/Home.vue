<template>
  <div class="container d-flex vh-100">
    <div class="row justify-content-center align-self-center">
      <div class="col-12">
        <h2 class="text-center">
          PheGET: Visualization for Phenotypes, Genotypes, Expression data, and Tissues
        </h2>
        <search-box></search-box>
        <br>
        <div class="text-center">
          Search for: <b>variant by position:
          <router-link
            :to="{name: 'variant', params: {variant: '19_488506'}}">chr19:488506</router-link>
          &bull;
          rsid:
          <router-link
            :to="{name: 'variant', params: {variant: '19_488506'}}">rs10424907</router-link>
          &bull;
          region:
          <router-link
            :to="{name: 'region',
                  query: {chrom: '19', start: 448506, end: 528506,
                          tissue: 'Brain_Cortex', gene_id: 'ENSG00000129946.10' }}"
          >chr19:448506-528506</router-link>
          &bull;
          gene:
          <router-link
            :to="{name: 'region',
                  query: {chrom: '19', start: 448506, end: 528506,
                          tissue: 'Brain_Cortex', gene_id: 'ENSG00000129946.10' }}"
          ><i>SHC2</i></router-link></b>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
// @ is an alias to /src
import SearchBox from '../components/SearchBox.vue';

export default {
  name: 'Home',
  components: { SearchBox },
};
</script>

<style>
  body {
    height: 100%;
  }
</style>
