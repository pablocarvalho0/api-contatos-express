import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import * as relations from './relations';

const client = postgres(process.env.DATABASE_URL as string, {
    max: 20,
    idle_timeout: 30,     // segundos (postgres.js usa segundos, não ms)
    connect_timeout: 2,   // segundos
});

// as relations entram no mesmo objeto que as tabelas: é daí que o
// db.query.* lê os joins do `with`
export const db = drizzle(client, { schema: { ...schema, ...relations } });
export { client };      // pra shutdown gracioso: await client.end()
