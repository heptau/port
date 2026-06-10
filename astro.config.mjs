import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://port.80.cz',
  compressHTML: true,
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'cs', 'es', 'de', 'pt'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  trailingSlash: 'never',
  devToolbar: { enabled: false },
  markdown: {
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      defaultColor: false,
    },
  },
});
