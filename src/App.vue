<template>
  <div id="app">
    <!-- Add any "base layout" stuff here (things to appear on every page) -->
    <router-view />

    <footer
      style="text-align: center; background: #eeeeee;"
      class="mt-3"
    >
      <router-link :to="{ name: 'home' }">
        Home
      </router-link> -
      <router-link :to="{ name: 'about' }">
        About
      </router-link> -
      <a href="https://github.com/statgen/fivex">Contribute</a>
    </footer>
  </div>
</template>

<style></style>
