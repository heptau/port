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
  redirects: {
    '/2026-11-10_zasuvky-typ-n': '/2026-11-10_socket-type-n',
    '/cs/2026-11-10_zasuvky-typ-n': '/cs/2026-11-10_socket-type-n',
    '/de/2026-11-10_zasuvky-typ-n': '/de/2026-11-10_socket-type-n',
    '/es/2026-11-10_zasuvky-typ-n': '/es/2026-11-10_socket-type-n',
    '/pt/2026-11-10_zasuvky-typ-n': '/pt/2026-11-10_socket-type-n',
  },
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
