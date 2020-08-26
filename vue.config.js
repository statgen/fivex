module.exports = {
    chainWebpack: (config) => {
        config.module
            .rule('source-map-loader')
            .test(/\.js$/)
            .enforce('pre')
            .use('source-map-loader')
            .loader('source-map-loader')
            .end();
    },
    devServer: {
        proxy: {
            // Development settings: fetches data from the flask web server via a proxy
            // In production, apache Reverse Proxy handles this (we don't use the vue dev server to deploy,
            //  because the Vue part is just static assets- they are built once and don't change)
            '/api': {
                target: 'http://localhost:5000',
                ws: false,
                changeOrigin: true,
                onProxyRes(proxyRes, req, res) {
                    // When flask redirects internally, it includes its own host and port, and we get CORS
                    //  errors as suddenly the proxied request is going to a different "server".
                    //  We fix that by rewriting the location header manually.
                    // TODO: This is an ugly hack related to limitations of webpack dev server; see:
                    //  https://github.com/chimurai/http-proxy-middleware/issues/140#issuecomment-275270924
                    //  (note this rewrite is crude and will break locally if flask is run on a port other than 5000)
                    if ([301, 302].includes(proxyRes.statusCode) && proxyRes.headers.location) {
                        let redirect = proxyRes.headers.location;
                        redirect = redirect.replace('http://localhost:5000', '/api');
                        proxyRes.headers.location = redirect;
                    }
                },
                pathRewrite: { '^/api': '' },
            },
        },
    },
    configureWebpack: {
    // Ensure that (decent) source maps are used, even in development
        devtool: (process.env.NODE_ENV === 'development') ? 'eval-source-map' : 'source-map',
    },
};
