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
        pathRewrite: { '^/api': '' },
      },
    },
  },
  configureWebpack: {
    // Ensure that (decent) source maps are used, even in development
    devtool: (process.env.NODE_ENV === 'development') ? 'eval-source-map' : 'source-map',
  },
};
