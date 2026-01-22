import { defineConfig } from 'astro/config';
export default defineConfig({
  site: 'https://DeadlyDeadlars.github.io',
  base: '/nodus',
  outDir: './deploy',
  i18n: {
    defaultLocale: 'ru',
    locales: ['ru', 'en'],
  }
});
