<template>
  <div class="container d-flex vh-100">
    <div class="row justify-content-center align-self-center">
      <div class="col-12">
        <h2 class="text-center">
          PheGET: Visualization for Phenotypes, Genotypes, Expression data, and Tissues
        </h2>
        <search-box></search-box>

        <div class="text-center">
          Examples:
          <router-link
            :to="{name: 'variant', params: {variant: '19_6718376'}}">chr19:6718376</router-link> &bull;
          <router-link
            :to="{name: 'variant', params: {variant: '15_78570111'}}">chr15:78570111</router-link> &bull;
          <router-link
            :to="{name: 'variant', params: {variant: '12_56007301'}}">chr12:56007301</router-link> &bull;
          <router-link
            :to="{name: 'variant', params: {variant: '19_488506'}}">chr19:488506</router-link> &bull;
          <router-link
            :to="{name: 'variant', params: {variant: '19_991063'}}">chr19:991063</router-link> &bull;
          <router-link
            :to="{name: 'variant', params: {variant: '19_4425308'}}">chr19:4425308</router-link>
          <br>

          Example for single tissue range plot:
          <router-link
            :to="{name: 'region',
                  query: {chrom: '19', start: 448506, end: 528506,
                          tissue: 'Brain_Cortex', gene_id: 'ENSG00000129946.10' }}"
          >chr19:448506-528506, Brain Cortex, <i>SHC2</i></router-link>
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
