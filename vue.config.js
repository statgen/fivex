module.exports = {
  devServer: {
    proxy: {
      // Development settings: fetches data from the flask web server via a proxy
      // In production, apache would serve this role via a ReverseProxy
      '/backend': {
        target: 'http://localhost:5000',
        ws: false,
        changeOrigin: true,
        pathRewrite: { '^/backend': '' },
      },
    },
  },
};
