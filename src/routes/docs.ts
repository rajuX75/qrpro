import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yaml';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// Load and parse the OpenAPI specification
const loadOpenAPISpec = async () => {
  try {
    const specPath = path.join(__dirname, '..', 'docs', 'openapi.yaml');
    const specContent = await fs.readFile(specPath, 'utf-8');
    return YAML.parse(specContent);
  } catch (error) {
    console.error('Error loading OpenAPI specification:', error);
    throw error;
  }
};

// Serve Swagger UI
router.use('/', swaggerUi.serve);

router.get('/', async (req, res, next) => {
  try {
    const spec = await loadOpenAPISpec();
    return swaggerUi.setup(spec, {
      explorer: true,
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'QR Code API Documentation',
      customfavIcon: '/favicon.ico',
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        docExpansion: 'list',
        filter: true,
        showExtensions: true,
        showCommonExtensions: true,
        syntaxHighlight: {
          activated: true,
          theme: 'monokai',
        },
      },
    })(req, res, next);
  } catch (error) {
    next(error);
  }
});

export default router;
