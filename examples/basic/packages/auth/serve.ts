import { serve } from '@hono/node-server';
import app from './src/index.js';

const port = Number(process.env.PORT ?? 3003);
console.log(`[auth] http://localhost:${port}`);
serve({ fetch: app.fetch, port });
