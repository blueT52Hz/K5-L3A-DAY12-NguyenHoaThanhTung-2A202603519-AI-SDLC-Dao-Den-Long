import { defineConfig } from 'vite';

// Public demo domain (reverse proxy / tunnel) must be allowed explicitly by vite dev and preview.
const allowedHosts = ['demo.bluet52hz.io.vn'];

export default defineConfig({
  server: { allowedHosts },
  preview: { allowedHosts },
});
