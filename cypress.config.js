import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
    supportFile: "cypress/support/e2e.js",
    viewportWidth: 1920,
    viewportHeight: 1080,
    env: {
      LOGIN: "gustavo.alves@e-deploy.com.br",
      PASSWORD: "C0nnect123?",
    },
  },
});
