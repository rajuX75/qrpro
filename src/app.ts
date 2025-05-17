import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import apiKeyRoutes from './routes/apikey';
import qrRoutes from './routes/qr';
import redirectRoutes from './routes/redirect';
import docsRoutes from './routes/docs';
import logger, { stream } from './utils/logger';
import { env } from './config/env';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'validator.swagger.io'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
  })
);

// CORS configuration
app.use(
  cors({
    origin: env.NODE_ENV === 'production' ? env.API_BASE_URL : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-API-Key'],
  })
);

// Compression middleware
app.use(compression());

// Request logging
app.use(morgan('combined', { stream }));

// Body parsing
app.use(express.json());

// Serve static files from the data directory
app.use('/data', express.static(path.join(__dirname, '..', 'data')));

// Error handling for static files
app.use('/data', (req, res, next) => {
  if (req.path.startsWith('/static/qrcode')) {
    logger.warn(`QR code not found: ${req.path}`);
    res.status(404).json({
      success: false,
      error: 'QR code not found',
      message: 'The requested QR code file does not exist or has been deleted',
      path: req.path,
    });
  } else {
    next();
  }
});

// API routes
app.use('/api/v1/apikey', apiKeyRoutes);
app.use('/api/v1/qr', qrRoutes);
app.use('/r', redirectRoutes);

// Documentation routes
app.use('/docs', docsRoutes);

// Global error handler
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    logger.error(`Unhandled error: ${err.message}`, { stack: err.stack });
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message:
        env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    });
  }
);

// 404 handler
app.use((req, res) => {
  logger.warn(`Route not found: ${req.method} ${req.path}`);
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: 'The requested resource was not found',
  });
});

export default app;
