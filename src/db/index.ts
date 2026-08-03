import { relations } from './relations';
import { drizzle } from 'drizzle-orm/node-postgres';

export const db = drizzle({
    connection: {
        connectionString: process.env.DATABASE_URL as string,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
    },
    relations,
});