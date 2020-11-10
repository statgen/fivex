<template>
  <div class="container d-flex vh-100">
    <div class="row justify-content-center align-self-center">
      <div class="col-12">
        <h2 class="text-center">
          FIVEx: Visualization for Genotypes, Expressions, and Tissues
        </h2>
        <search-box />
        <br>
        <div class="text-center">
          Search for: <b>Variant by position:
            <router-link
              :to="{name: 'variant', params: {variant: '1_109274968'}}"
            >chr1:109274968</router-link>
            &bull;
            <router-link
              :to="{name: 'variant', params: {variant: '2_21044589'}}"
            >chr2:21044589</router-link>
            &bull;
            rsID:
            <router-link
              :to="{name: 'variant', params: {variant: '1_109274968'}}"
            >rs12740374</router-link>
            &bull;
            <router-link
              :to="{name: 'variant', params: {variant: '2_21044589'}}"
            >rs934197</router-link>
            <br>
            Region:
            <router-link
              :to="{name: 'region',
                    query: {chrom: '1', start: 108774968, end: 109774968,
                            tissue: 'Liver', gene_id: 'ENSG00000134243' }}"
            >chr1:108774968-109774968</router-link>
            &bull;
            <router-link
              :to="{name: 'region',
                    query: {chrom: '2', start: 20501429, end: 21544073,
                            tissue: 'Esophagus_Gastroesophageal_Junction', gene_id: 'ENSG00000084674' }}"
            >chr2:20501429-21544073</router-link>
            &bull;
            Gene:
            <router-link
              :to="{name: 'region',
                    query: {chrom: '1', start: 108774968, end: 109774968,
                            tissue: 'Liver', gene_id: 'ENSG00000134243' }}"
            ><i>SORT1</i></router-link>
            &bull;
            <router-link
              :to="{name: 'region',
                    query: {chrom: '2', start: 20501429, end: 21544073,
                            tissue: 'Esophagus_Gastroesophageal_Junction', gene_id: 'ENSG00000084674' }}"
            ><i>APOB</i></router-link></b>
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
