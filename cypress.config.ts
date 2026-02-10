import { defineConfig } from "cypress";
import fs from "fs";

export default defineConfig({
  e2e: {
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
      LOGIN: "example@example.com",
      PASSWORD: "Password123",
      KEEP_SCREENSHOTS: true,
      KEEP_JSON_RECORDS: true,
    },
  },
  screenshotsFolder: "pontos",
});
