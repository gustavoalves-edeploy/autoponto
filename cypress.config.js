import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {},
    env: { LOGIN: "example@e-deploy.com.br", PASSWORD: "Password123" },
  },
});
