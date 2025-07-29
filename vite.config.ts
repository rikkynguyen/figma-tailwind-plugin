import { defineConfig } from "vite";
import htmlInline from 'vite-plugin-html-inline';

export default defineConfig({
  plugins: [
    htmlInline({
      inline: ['ui.html'], // inline the ui.html file
      minify: true         // minify the HTML
    })
  ],
  build: {
    rollupOptions: {
      input: {
        code: 'code.ts',
        ui: 'ui.html',
      },
      output: {
        entryFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      }
    },
    outDir: 'dist',
    emptyOutDir: true,
    target: 'esnext',
    minify: false
  }
});
