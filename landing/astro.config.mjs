import { defineConfig } from 'astro/config';
export default defineConfig({
  site: 'https://DeadlyDeadlars.github.io',
  base: '/Messenger',
  outDir: './deploy',
  i18n: {
    defaultLocale: 'ru',
    locales: ['ru', 'en'],
  }
});
