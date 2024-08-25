// next.config.cjs

const withWS = require('next-ws');

module.exports = withWS({
  experimental: {
    appDir: true,
  },
});
