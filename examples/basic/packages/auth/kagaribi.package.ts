import { definePackage } from '@kagaribi/core';

export default definePackage({
  name: 'auth',
  runtime: ['node', 'cloudflare-workers', 'deno'],
});
