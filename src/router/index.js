// Load dependencies (for their side effects)
import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap-vue/dist/bootstrap-vue.css';
import '@fortawesome/fontawesome-free/css/all.css';
import * as Sentry from '@sentry/browser';
import * as Integrations from '@sentry/integrations';

import Vue from 'vue';
import { BootstrapVue } from 'bootstrap-vue';

import VueRouter from 'vue-router';

import 'locuszoom/dist/locuszoom.css';
import '@/assets/common.css';

import About from '@/views/About.vue';
import Help from '@/views/Help.vue';
import Home from '@/views/Home.vue';
import Tutorial from '@/views/Tutorial.vue';

Vue.use(BootstrapVue);
Vue.use(VueRouter);

// Activate remote error monitoring (if a DSN is provided in the `.env` file that is shared by Flask and Vue)
Sentry.init({
    dsn: process.env.VUE_APP_SENTRY_DSN,
    integrations: [new Integrations.Vue({ Vue, logErrors: true, attachProps: true })],
});

const routes = [
    {
        path: '/',
        name: 'home',
        component: Home,
        meta: { title: 'Home' },
    },
    {
        path: '/about',
        name: 'about',
        component: About,
        meta: { title: 'About' },
    },
    {
        path: '/help/',
        name: 'help',
        component: Help,
        meta: { title: 'Help' },
    },
    {
        path: '/tutorial/',
        name: 'tutorial',
        component: Tutorial,
        meta: { title: 'Tutorial' },
    },
    {
        path: '/variant/:variant/',
        name: 'variant',
        meta: { title: 'Variant' },
        // route level code-splitting
        // this generates a separate chunk (variant.[hash].js) for this route
        // which is lazy-loaded when the route is visited.
        component: () => import(/* webpackChunkName: "variant" */ '../views/Variant.vue'),
    },
    {
        path: '/region/',
        name: 'region',
        meta: { title: 'Region' },
        component: () => import(/* webpackChunkName: "region" */ '../views/Region.vue'),
    },
    {
        path: '/error/',
        name: 'error',
        meta: { title: 'Error' },
        component: () => import(/* webpackChunkName: "errors" */ '../views/Error.vue'),
    },
    {
        path: '*',
        name: '404',
        meta: { title: 'Not found' },
        component: () => import(/* webpackChunkName: "errors" */ '../views/NotFound.vue'),
    },
];

const router = new VueRouter({
    mode: 'history',
    base: process.env.BASE_URL,
    routes,
});

router.beforeEach((to, from, next) => {
    const base = to.meta.title || 'Explore';
    document.title = `${base} | FIVEx: eQTL browser`;
    next();
});

export default router;
