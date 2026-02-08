import { serve } from '@hono/node-server';
import app from './src/index.js';

const port = Number(process.env.PORT ?? 3002);
console.log(`[users] http://localhost:${port}`);
serve({ fetch: app.fetch, port });
