<template>
  <div id="app" style="position:relative" class="min-vh-100">
    <!-- Add any "base layout" stuff here (things to appear on every page) -->
    <div>
      <b-navbar toggleable="lg" type="light" variant="white">
        <b-navbar-brand :to="{ name: 'home' }"><i class="fas fa-dna"></i> FIVEx</b-navbar-brand>

        <b-navbar-toggle target="nav-collapse" />

        <b-collapse id="nav-collapse" is-nav>
          <!-- Right aligned nav items -->
          <b-navbar-nav class="ml-auto">
            <b-nav-item :to="{ name: 'about' }" right>About</b-nav-item>
            <b-nav-item :to="{ name: 'help' }" right>Help</b-nav-item>
            <b-nav-item :to="{ name: 'tutorial' }" right>Tutorial</b-nav-item>
          </b-navbar-nav>
        </b-collapse>
      </b-navbar>
    </div>

    <router-view class="pb-5" />

    <footer class="footer">
      <small>&copy; {{ (new Date()).getFullYear() }} - The University of Michigan - Center for Statistical Genetics</small>
    </footer>
  </div>
</template>

<style></style>
