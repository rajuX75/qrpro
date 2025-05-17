import type { Config } from 'drizzle-kit';
import 'dotenv/config'; // Load environment variables

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
