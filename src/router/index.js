import Vue from 'vue';
import VueRouter from 'vue-router';
import Home from '../views/Home.vue';

Vue.use(VueRouter);

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
    meta: {
      title: 'PheGET eQTL browser',
    },
  },
  {
    path: '/variant/:variant/',
    name: 'variant',
    meta: {
      title: 'Variant data | PheGET',
    },
    // route level code-splitting
    // this generates a separate chunk (variant.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import(/* webpackChunkName: "variant" */ '../views/Variant.vue'),
  },
  {
    path: '/region/:region/',
    name: 'region',
    meta: {
      title: 'Region view | PheGET',
    },
    component: () => import(/* webpackChunkName: "region" */ '../views/Region.vue'),
  },
];

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes,
});

export default router;
