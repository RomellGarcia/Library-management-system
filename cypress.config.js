const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: false,
    viewportWidth: 1280,
    viewportHeight: 720,
  }
});