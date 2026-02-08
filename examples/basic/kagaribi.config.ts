import { defineConfig } from '@kagaribi/core';

export default defineConfig({
  packages: {
    root: {
      target: 'node',
    },
    auth: {
      colocateWith: 'root',
    },
    users: {
      colocateWith: 'root',
    },
    articles: {
      colocateWith: 'root',
    },
  },
  environments: {
    development: {
      packages: {
        '*': { colocateWith: 'root' },
      },
    },
    production: {
      packages: {
        users: { target: 'aws-lambda', url: '$USERS_URL' },
      },
    },
  },
});
