import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { z } from 'zod';
import * as schema from './schema';

// Only the database URL, not the whole app env: the import and migrate
// scripts need a database and nothing to do with sign-in.
const url = z.string().url().parse(process.env.DATABASE_URL);

const client = postgres(url, { max: 5 });

export const db = drizzle(client, { schema });
export { client };
