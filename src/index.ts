import app from './app';
import { env } from './config/env';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure required directories exist
async function ensureDirectories() {
  const dataDir = path.join(__dirname, '..', 'data');
  const staticDir = path.join(dataDir, 'static');
  const qrcodeDir = path.join(staticDir, 'qrcode');

  try {
    await fs.mkdir(dataDir, { recursive: true });
    await fs.mkdir(staticDir, { recursive: true });
    await fs.mkdir(qrcodeDir, { recursive: true });
    console.log('Required directories created successfully');
  } catch (error) {
    console.error('Error creating directories:', error);
    process.exit(1);
  }
}

// Start the server
async function startServer() {
  await ensureDirectories();

  app.listen(env.PORT, () => {
    console.log(`Server is running on port ${env.PORT}`);
    console.log(`API Base URL: ${env.API_BASE_URL}`);
    console.log(`Environment: ${env.NODE_ENV}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
