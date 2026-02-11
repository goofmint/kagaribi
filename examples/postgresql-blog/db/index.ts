import { drizzle } from 'drizzle-orm/node-postgres';
import { createDbHelper } from '@kagaribi/core';
import * as schema from './schema.js';

const { initDb, getDb } = createDbHelper((url) => drizzle(url, { schema }));

export { initDb, getDb, schema };
