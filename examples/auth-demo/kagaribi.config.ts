import { defineConfig } from '@kagaribi/core';

export default defineConfig({
  packages: {
    root: {
      target: 'node',
    },
    auth: {
      target: 'node',
    },
    'protected-api': {
      target: 'node',
    },
  },
  environments: {
    production: {
      packages: {
        auth: {
          target: 'cloudflare-workers',
          url: '$AUTH_SERVICE_URL',
        },
        'protected-api': {
          target: 'cloudflare-workers',
          url: '$PROTECTED_API_URL',
        },
        root: {
          target: 'node',
        },
      },
    },
  },
});
