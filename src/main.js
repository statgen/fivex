import Vue from 'vue';
import VueGtag from 'vue-gtag';

import App from './App.vue';
import router from './router';

Vue.config.productionTip = false;

if (process.env.VUE_APP_GOOGLE_ANALYTICS) {
    // Track page and router views in google analytics
    Vue.use(VueGtag, {
        config: { id: process.env.VUE_APP_GOOGLE_ANALYTICS },
        appName: 'FIVEx',
        pageTrackerScreenviewEnabled: true,
    }, router);
}


new Vue({
    router,
    render: (h) => h(App),
}).$mount('#app');
