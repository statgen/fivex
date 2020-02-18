<script>
/**
 * Single-variant view: PheWAS plot with interactive display options
 */

import SearchBox from '@/components/SearchBox.vue';

export default {
  name: 'VariantView',
  components: {
    SearchBox,
  },
};
</script>

<template>
  <div>
    <search-box></search-box>
  </div>
</template>
