const { join } = require('path');

/**
 * Only relevant to the non-Docker (native Node) Render deployment path
 * described in render.yaml. Render's native build step and the running
 * service do not always share the default $HOME/.cache/puppeteer
 * directory, so Chromium downloaded during "npm ci" can be missing at
 * runtime. Pointing the cache at a project-relative folder keeps it
 * inside the deployed filesystem.
 *
 * @type {import('puppeteer').Configuration}
 */
module.exports = {
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
