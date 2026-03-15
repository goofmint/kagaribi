import { definePackage } from '@kagaribi/core';

export default definePackage({
  name: 'protected-api',
  dependencies: ['auth'],
  routes: ['/api'],
});
