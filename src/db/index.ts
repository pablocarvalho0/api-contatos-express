import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const client = postgres(process.env.DATABASE_URL as string, {
    max: 20,
    idle_timeout: 30,     // segundos (postgres.js usa segundos, não ms)
    connect_timeout: 2,   // segundos
});

export const db = drizzle(client, { schema });
export { client };      // pra shutdown gracioso: await client.end()
