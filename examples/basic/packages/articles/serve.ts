import { serve } from '@hono/node-server';
import app from './src/index.js';

const port = Number(process.env.PORT ?? 3004);
console.log(`[articles] http://localhost:${port}`);
serve({ fetch: app.fetch, port });
