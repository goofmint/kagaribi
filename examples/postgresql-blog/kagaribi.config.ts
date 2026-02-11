import { defineConfig } from '@kagaribi/core';

export default defineConfig({
  packages: {
    root: { target: 'node' },
    posts: { colocateWith: 'root' },
  },
  environments: {
    development: {
      packages: {
        '*': { colocateWith: 'root' },
      },
    },
  },
  db: {
    dialect: 'postgresql',
  },
});
