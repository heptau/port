import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

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
  integrations: [sitemap()],
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
