<script>
/**
 * A generic error page. In the future, it may include error messaging.
 */
export default {
    name: 'Error',
    data() {
        return {
            message: 'An error has occurred.',
            previous: null,
        };
    },
    beforeRouteEnter(to, from, next) {
        next((vm) => {
            vm.previous = from.fullPath;
        });
    },
};
</script>

<template>
  <div>
    <h1>An error has occurred</h1>
    The requested page could not be loaded. Please check the URL and try again. If the problem
    persists, please report the error.
    <template v-if="previous">
      (<a :href="previous">back</a>)
    </template>
  </div>
</template>

<style scoped></style>
