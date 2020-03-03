// Load dependencies (for their side effects)
import 'jquery';
import 'popper.js';
import 'bootstrap/dist/js/bootstrap';

import 'bootstrap/dist/css/bootstrap.css';
import '@fortawesome/fontawesome-free/css/all.css';
import * as Sentry from '@sentry/browser';
import * as Integrations from '@sentry/integrations';

import Vue from 'vue';
import VueRouter from 'vue-router';
import Home from '../views/Home.vue';

import '@/assets/common.css';

Vue.use(VueRouter);

// Activate remote error monitoring (if a DSN is provided in the `.env` file that is shared by Flask and Vue)
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [new Integrations.Vue({ Vue, logErrors: true, attachProps: true })],
});

const routes = [
  {
    path: '/',
    name: 'home',
    component: Home,
    meta: { title: 'Home | PheGET: eQTL browser' },
  },
  {
    path: '/variant/:variant/',
    name: 'variant',
    meta: { title: 'Variant | PheGET: eQTL browser' },
    // route level code-splitting
    // this generates a separate chunk (variant.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import(/* webpackChunkName: "variant" */ '../views/Variant.vue'),
  },
  {
    path: '/region/',
    name: 'region',
    meta: { title: 'Region | PheGET: eQTL browser' },
    component: () => import(/* webpackChunkName: "region" */ '../views/Region.vue'),
  },
  {
    path: '*',
    name: '404',
    meta: { title: 'Not found | PheGET: eQTL browser' },
    component: () => import(/* webpackChunkName: "errors" */ '../views/NotFound.vue'),
  },
];

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes,
});

export default router;
