import { defineConfig } from "cypress";
import fs from "fs";

export default defineConfig({
  e2e: {
    trashAssetsBeforeRuns: false,
    setupNodeEvents(on, _config) {
      on("after:screenshot", (details) => {
        const newPath = details.path.replace(/autoponto\.cy\.ts[\/\\]/, "");

        return new Promise((resolve, reject) => {
          fs.rename(details.path, newPath, (err) => {
            if (err) return reject(err);

            resolve({ path: newPath });
          });
        });
      });
    },
    env: {
      LOGIN: "gustavo.alves@e-deploy.com.br",
      PASSWORD: "C0nnect123?",
      KEEP_SCREENSHOTS: true,
      KEEP_JSON_RECORDS: true,
    },
  },
  screenshotsFolder: "pontos",
});
