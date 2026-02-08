import { definePackage } from '@kagaribi/core';

export default definePackage({
  name: 'users',
  dependencies: ['auth'],
  runtime: ['node', 'cloudflare-workers', 'deno'],
});
