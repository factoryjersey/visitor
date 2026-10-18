import '@/lib/load-env';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { client, db } from '@/lib/db';

await migrate(db, { migrationsFolder: 'lib/db/migrations' });
console.log('migrated');
await client.end();
