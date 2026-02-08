import { definePackage } from '@kagaribi/core';

export default definePackage({
  name: 'articles',
  dependencies: ['users'],
  routes: ['/users/:userId/articles'],
  runtime: ['node', 'cloudflare-workers', 'deno'],
});
