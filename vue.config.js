module.exports = {
  devServer: {
    proxy: {
      '/backend': {
        target: 'http://localhost:5000',
        ws: false,
        changeOrigin: true,
        pathRewrite: { '^/backend': '' },
      },
    },
  },
};
