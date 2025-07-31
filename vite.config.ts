import { defineConfig } from "vite";
import htmlInline from 'vite-plugin-html-inline';

export default defineConfig({
  root: '.',
  plugins: [
    htmlInline({
      inline: ['ui.html'], // inline the ui.html file
      minify: true         // minify the HTML
    })
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'esnext',
    minify: false,
    rollupOptions: {
      input: {
        code: 'code.ts',
        ui: "ui.html"
      },
      output: {
        entryFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      }
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        // optional: include global variables here
        additionalData: ''
      },
    },
  }
});
