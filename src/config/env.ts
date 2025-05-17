import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Validate required environment variables
const requiredEnvVars = ['DATABASE_URL', 'API_BASE_URL'] as const;
const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingEnvVars.join(', ')}`
  );
}

// Export typed environment variables
export const env = {
  // Database
  DATABASE_URL: process.env.DATABASE_URL!,

  // API Configuration
  API_BASE_URL: process.env.API_BASE_URL!,
  PORT: process.env.PORT || '3000',

  // Optional configurations
  NODE_ENV: process.env.NODE_ENV || 'development',
} as const;

// Type for environment variables
export type Env = typeof env;
