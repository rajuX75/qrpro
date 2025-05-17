import { Router, Request, Response, NextFunction } from 'express';
import qrcode from 'qrcode';
import sharp from 'sharp';
import apiKeyAuth from '../middleware/apiKeyAuth';
import { db } from '../db';
import { apiKeys, dynamicQRCodes, scanEvents } from '../db/schema';
import { eq, sql, count } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { env } from '../config/env';
import logger from '../utils/logger';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define a type for a single job in the bulk request
interface BulkJob {
  data: string;
  size?: number;
  format?: string;
  foregroundColor?: string;
  backgroundColor?: string;
  logoUrl?: string;
  logoScale?: number;
  logoMargin?: number;
  logoBackgroundColor?: string;
  quietZone?: number;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  // Add other potential customization parameters here
}

// Add interface for generated file
interface GeneratedFile {
  originalData: string;
  filePath: string;
  format: string;
  size: number;
  foregroundColor: string;
  backgroundColor: string;
  logoUrl?: string;
  logoScale: number;
  logoMargin: number;
  logoBackgroundColor?: string;
  quietZone: number;
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H';
  downloadUrl: string;
}

// Add interface for customization parameters
interface QRCodeCustomization {
  size?: number;
  format?: string;
  foregroundColor?: string;
  backgroundColor?: string;
  logoUrl?: string;
  logoScale?: number;
  logoMargin?: number;
  logoBackgroundColor?: string;
  quietZone?: number;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
}

const router = Router();

// Helper function to reset daily/monthly usage counts
const resetUsageCounts = (apiKey: typeof apiKeys.$inferSelect) => {
  const now = new Date();
  const lastUsed = apiKey.lastUsedAt;

  let dailyReset = false;
  let monthlyReset = false;

  if (!lastUsed) {
    dailyReset = true;
    monthlyReset = true;
  } else {
    const lastUsedDate = new Date(lastUsed);
    if (
      now.getDate() !== lastUsedDate.getDate() ||
      now.getMonth() !== lastUsedDate.getMonth() ||
      now.getFullYear() !== lastUsedDate.getFullYear()
    ) {
      dailyReset = true;
    }
    if (
      now.getMonth() !== lastUsedDate.getMonth() ||
      now.getFullYear() !== lastUsedDate.getFullYear()
    ) {
      monthlyReset = true;
    }
  }

  return { dailyReset, monthlyReset };
};

// Helper function to generate tracking parameters
const generateTrackingParams = (
  type: 'static' | 'dynamic' | 'bulk',
  id: string
) => {
  const timestamp = Date.now();
  const trackingId = nanoid(8);
  return `?t=${timestamp}&id=${trackingId}&type=${type}`;
};

// Helper function to format response
const formatResponse = (data: any, message: string) => ({
  success: true,
  message,
  data,
});

// Helper function to format QR code metadata
const formatQRMetadata = (params: any, hash: string) => ({
  data: params.data,
  size: params.size,
  format: params.format,
  customization: {
    foregroundColor: params.foregroundColor,
    backgroundColor: params.backgroundColor,
    logoUrl: params.logoUrl,
    logoScale: params.logoScale,
    logoMargin: params.logoMargin,
    logoBackgroundColor: params.logoBackgroundColor,
    quietZone: params.quietZone,
    errorCorrectionLevel: params.errorCorrectionLevel,
  },
  generatedHash: hash,
  timestamp: new Date().toISOString(),
});

// Helper function to validate URL
const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Helper function to measure performance
const measurePerformance = async <T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> => {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;
    logger.debug(`${operation} completed in ${duration.toFixed(2)}ms`);
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    logger.error(`${operation} failed after ${duration.toFixed(2)}ms`, {
      error,
    });
    throw error;
  }
};

// Apply API key authentication middleware to all QR routes
router.use(apiKeyAuth);

router.post('/generate', async (req: Request, res: Response) => {
  logger.info('Generating static QR code', {
    size: req.body.size,
    format: req.body.format,
    hasLogo: !!req.body.logoUrl,
  });

  const {
    data,
    size = 256,
    format = 'png',
    foregroundColor = '#000000',
    backgroundColor = '#FFFFFF',
    logoUrl,
    logoScale = 0.2,
    logoMargin = 4,
    logoBackgroundColor,
    quietZone = 4,
    errorCorrectionLevel = 'M',
  } = req.body;

  if (!data) {
    return res.status(400).json({ error: '"data" is required' });
  }

  const apiKey = (req as any).apiKey; // Assuming apiKey is attached by middleware

  if (!apiKey) {
    return res
      .status(500)
      .json({ error: 'API key not found on request object' });
  }

  // Generate a unique filename based on data and customizations
  const hash = crypto
    .createHash('md5')
    .update(
      JSON.stringify({
        data,
        size,
        format,
        foregroundColor,
        backgroundColor,
        logoUrl,
        logoScale,
        logoMargin,
        logoBackgroundColor,
        quietZone,
        errorCorrectionLevel,
      })
    )
    .digest('hex');
  const apiKeyIdentifier = apiKey.id; // Using API key ID for path
  const uploadDir = path.join(
    __dirname,
    '..',
    '..',
    'data',
    'static',
    'qrcode',
    apiKeyIdentifier.toString(),
    'static'
  );
  const fileName = `${hash}.${format === 'svg' && !logoUrl ? 'svg' : 'png'}`;
  const filePath = path.join(uploadDir, fileName);

  try {
    // Ensure the directory exists
    await fs.mkdir(uploadDir, { recursive: true });

    const result = await measurePerformance('QR code generation', async () => {
      // Generate basic QR code
      const qrCodeBuffer = await qrcode.toBuffer(data, {
        errorCorrectionLevel: errorCorrectionLevel as any,
        version: undefined, // auto-detect
        width: size,
        color: {
          dark: foregroundColor,
          light: backgroundColor,
        },
        margin: quietZone,
      });

      let finalImageBuffer = qrCodeBuffer;

      // Embed logo if logoUrl is provided
      if (logoUrl) {
        try {
          const logoResponse = await fetch(logoUrl);
          if (!logoResponse.ok) {
            return res
              .status(400)
              .json({ error: `Failed to fetch logo from ${logoUrl}` });
          }
          const logoBuffer = await logoResponse.arrayBuffer();

          const logoSize = Math.round(size * logoScale);
          const logo = await sharp(Buffer.from(logoBuffer))
            .resize(logoSize, logoSize, { fit: 'contain' })
            .toBuffer();

          const qrImage = sharp(qrCodeBuffer);
          const qrMetadata = await qrImage.metadata();

          const logoPosition = {
            left: Math.round((qrMetadata.width! - logoSize) / 2),
            top: Math.round((qrMetadata.height! - logoSize) / 2),
          };

          // Handle logo background if specified
          if (logoBackgroundColor) {
            const backgroundRect = Buffer.from(
              `<svg width="${logoSize}" height="${logoSize}"><rect width="${logoSize}" height="${logoSize}" fill="${logoBackgroundColor}"/></svg>`
            );

            finalImageBuffer = await qrImage
              .composite([
                {
                  input: backgroundRect,
                  left: logoPosition.left,
                  top: logoPosition.top,
                },
                {
                  input: logo,
                  left: logoPosition.left,
                  top: logoPosition.top,
                  blend: 'over',
                },
              ])
              .toBuffer();
          } else {
            finalImageBuffer = await qrImage
              .composite([
                {
                  input: logo,
                  left: logoPosition.left,
                  top: logoPosition.top,
                  blend: 'over',
                },
              ])
              .toBuffer();
          }
        } catch (logoError) {
          console.error('Error embedding logo:', logoError);
          // Decide whether to return an error or generate QR without logo
          // For now, returning error as per failing to fetch in PRD
          return res.status(500).json({ error: 'Failed to embed logo' });
        }
      }

      // Update usage count for the API key
      const { dailyReset, monthlyReset } = resetUsageCounts(apiKey);

      await db
        .update(apiKeys)
        .set({
          usageCount: sql`${apiKeys.usageCount} + 1`,
          dailyUsageCount: dailyReset ? 1 : sql`${apiKeys.dailyUsageCount} + 1`,
          monthlyUsageCount: monthlyReset
            ? 1
            : sql`${apiKeys.monthlyUsageCount} + 1`,
          lastUsedAt: new Date(),
        })
        .where(eq(apiKeys.key, apiKey.key));

      // Set appropriate content type header
      let contentType = 'image/png';
      if (format === 'svg') {
        contentType = 'image/svg+xml';
        // For SVG, generate directly if no logo, otherwise conversion issues with sharp's raster output.
        if (!logoUrl) {
          const svgQrCode = await qrcode.toString(data, {
            errorCorrectionLevel: errorCorrectionLevel as any,
            type: 'svg',
            margin: quietZone,
            color: { dark: foregroundColor, light: backgroundColor },
          });
          // Save SVG to file
          await fs.writeFile(filePath, svgQrCode);
          return {
            qrCode: {
              filePath: `/data/static/qrcode/${apiKeyIdentifier}/static/${fileName}`,
              downloadUrl: `${
                env.API_BASE_URL
              }/data/static/qrcode/${apiKeyIdentifier}/static/${fileName}${generateTrackingParams(
                'static',
                hash
              )}`,
              metadata: formatQRMetadata(req.body, hash),
            },
          };
        }
        // If logo is present, sharp output is likely PNG/JPEG, need conversion or separate SVG logo handling
        // For simplicity now, we are handling logo embedding via sharp which outputs raster by default.
        // A more robust solution for SVG with logo would require SVG manipulation or a different library.
        // For this implementation, we will return PNG if logo is present, even if SVG is requested.
        if (format === 'svg' && logoUrl) {
          console.warn(
            'SVG format requested with logo. Returning PNG instead as logo embedding is done via sharp (raster).'
          );
          res.setHeader('Content-Type', 'image/png');
          res.send(finalImageBuffer);
        }
      } else if (format === 'jpeg') {
        // Sharp can output JPEG too
        contentType = 'image/jpeg';
        finalImageBuffer = await sharp(finalImageBuffer).jpeg().toBuffer();
      }
      // default is png
      // Save the final image buffer to file
      await fs.writeFile(filePath, finalImageBuffer);
      return {
        qrCode: {
          filePath: `/data/static/qrcode/${apiKeyIdentifier}/static/${fileName}`,
          downloadUrl: `${
            env.API_BASE_URL
          }/data/static/qrcode/${apiKeyIdentifier}/static/${fileName}${generateTrackingParams(
            'static',
            hash
          )}`,
          metadata: formatQRMetadata(req.body, hash),
        },
      };
    });

    logger.info('Static QR code generated successfully', {
      hash,
      filePath: `/data/static/qrcode/${apiKeyIdentifier}/static/${fileName}`,
    });

    return res
      .status(200)
      .json(formatResponse(result, 'QR code generated successfully'));
  } catch (error) {
    logger.error('Failed to generate QR code', { error });
    return res.status(500).json({
      success: false,
      message: 'Failed to generate QR code',
      error:
        error instanceof Error
          ? error.message
          : 'Internal server error during QR code generation',
    });
  }
});

router.post('/dynamic/create', async (req: Request, res: Response) => {
  logger.info('Creating dynamic QR code', {
    targetUrl: req.body.targetUrl,
    size: req.body.size,
    format: req.body.format,
    hasLogo: !!req.body.logoUrl,
  });

  const {
    targetUrl,
    size = 256,
    format = 'png',
    foregroundColor = '#000000',
    backgroundColor = '#FFFFFF',
    logoUrl,
    logoScale = 0.2,
    logoMargin = 4,
    logoBackgroundColor,
    quietZone = 4,
    errorCorrectionLevel = 'M',
  } = req.body;

  // Validate required fields
  if (!targetUrl) {
    return res.status(400).json({
      success: false,
      message: 'Missing required field',
      error: 'targetUrl is required for dynamic QR codes',
    });
  }

  // Validate URL format
  if (!isValidUrl(targetUrl)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid URL format',
      error: 'The provided targetUrl is not a valid URL',
    });
  }

  const apiKey = (req as any).apiKey;
  if (!apiKey) {
    return res.status(500).json({
      success: false,
      message: 'Authentication error',
      error: 'API key not found on request object',
    });
  }

  try {
    const shortId = nanoid(10);
    const encodedData = `${env.API_BASE_URL}/r/${shortId}`;
    const createdAt = new Date();

    const apiKeyIdentifier = apiKey.id;
    const uploadDir = path.join(
      __dirname,
      '..',
      '..',
      'data',
      'static',
      'qrcode',
      apiKeyIdentifier.toString(),
      'dynamic'
    );
    const fileName = `${shortId}.${
      format === 'svg' && !logoUrl ? 'svg' : 'png'
    }`;
    const filePath = path.join(uploadDir, fileName);

    // Ensure the directory exists
    await fs.mkdir(uploadDir, { recursive: true });

    // Store dynamic QR code info in the database
    const [dynamicQR] = await db
      .insert(dynamicQRCodes)
      .values({
        shortId,
        apiKeyId: apiKey.id,
        targetUrl,
        originalDataEncoded: encodedData,
        customizationParams: {
          size,
          format,
          foregroundColor,
          backgroundColor,
          logoUrl,
          logoScale,
          logoMargin,
          logoBackgroundColor,
          quietZone,
          errorCorrectionLevel,
        } as any,
        createdAt,
        updatedAt: createdAt,
      })
      .returning();

    if (!dynamicQR) {
      throw new Error('Failed to create dynamic QR code record');
    }

    // Generate QR code for the encoded URL
    const qrCodeBuffer = await qrcode.toBuffer(encodedData, {
      errorCorrectionLevel: errorCorrectionLevel as any,
      version: undefined,
      width: size,
      color: {
        dark: foregroundColor,
        light: backgroundColor,
      },
      margin: quietZone,
    });

    let finalImageBuffer = qrCodeBuffer;
    let logoEmbedded = false;

    // Embed logo if logoUrl is provided
    if (logoUrl) {
      try {
        const logoResponse = await fetch(logoUrl);
        if (!logoResponse.ok) {
          logger.warn(
            `Failed to fetch logo from ${logoUrl}. Generating without logo.`
          );
        } else {
          const logoBuffer = await logoResponse.arrayBuffer();
          const logoSize = Math.round(size * logoScale);
          const logo = await sharp(Buffer.from(logoBuffer))
            .resize(logoSize, logoSize, { fit: 'contain' })
            .toBuffer();

          const qrImage = sharp(qrCodeBuffer);
          const qrMetadata = await qrImage.metadata();

          const logoPosition = {
            left: Math.round((qrMetadata.width! - logoSize) / 2),
            top: Math.round((qrMetadata.height! - logoSize) / 2),
          };

          if (logoBackgroundColor) {
            const backgroundRect = Buffer.from(
              `<svg width="${logoSize}" height="${logoSize}"><rect width="${logoSize}" height="${logoSize}" fill="${logoBackgroundColor}"/></svg>`
            );

            finalImageBuffer = await qrImage
              .composite([
                {
                  input: backgroundRect,
                  left: logoPosition.left,
                  top: logoPosition.top,
                },
                {
                  input: logo,
                  left: logoPosition.left,
                  top: logoPosition.top,
                  blend: 'over',
                },
              ])
              .toBuffer();
          } else {
            finalImageBuffer = await qrImage
              .composite([
                {
                  input: logo,
                  left: logoPosition.left,
                  top: logoPosition.top,
                  blend: 'over',
                },
              ])
              .toBuffer();
          }
          logoEmbedded = true;
        }
      } catch (logoError) {
        logger.error('Error embedding logo:', logoError);
        logger.warn('Continuing without logo due to error');
      }
    }

    // Update usage count for the API key
    const { dailyReset, monthlyReset } = resetUsageCounts(apiKey);
    const [updatedApiKey] = await db
      .update(apiKeys)
      .set({
        usageCount: sql`${apiKeys.usageCount} + 1`,
        dailyUsageCount: dailyReset ? 1 : sql`${apiKeys.dailyUsageCount} + 1`,
        monthlyUsageCount: monthlyReset
          ? 1
          : sql`${apiKeys.monthlyUsageCount} + 1`,
        lastUsedAt: createdAt,
      })
      .where(eq(apiKeys.key, apiKey.key))
      .returning();

    // Handle different formats
    let finalFormat = format;
    if (format === 'svg' && !logoUrl) {
      const svgQrCode = await qrcode.toString(encodedData, {
        errorCorrectionLevel: errorCorrectionLevel as any,
        type: 'svg',
        margin: quietZone,
        color: { dark: foregroundColor, light: backgroundColor },
      });
      await fs.writeFile(filePath, svgQrCode);
    } else {
      if (format === 'jpeg') {
        finalImageBuffer = await sharp(finalImageBuffer).jpeg().toBuffer();
      }
      await fs.writeFile(filePath, finalImageBuffer);
    }

    logger.info('Dynamic QR code created successfully', {
      shortId,
      filePath: `/data/static/qrcode/${apiKeyIdentifier}/dynamic/${fileName}`,
    });

    return res.status(201).json(
      formatResponse(
        {
          qrCode: {
            shortId,
            filePath: `/data/static/qrcode/${apiKeyIdentifier}/dynamic/${fileName}`,
            downloadUrl: `${
              env.API_BASE_URL
            }/data/static/qrcode/${apiKeyIdentifier}/dynamic/${fileName}${generateTrackingParams(
              'dynamic',
              shortId
            )}`,
            targetUrl,
            originalDataEncoded: encodedData,
            metadata: {
              data: encodedData,
              size,
              format: finalFormat,
              customization: {
                foregroundColor,
                backgroundColor,
                logoUrl,
                logoScale,
                logoMargin,
                logoBackgroundColor,
                quietZone,
                errorCorrectionLevel,
                logoEmbedded,
              },
              generatedHash: shortId,
              timestamp: createdAt.toISOString(),
            },
            analytics: {
              totalScans: 0,
              lastScanned: null,
              createdAt: createdAt.toISOString(),
              updatedAt: createdAt.toISOString(),
            },
            apiKey: {
              id: apiKey.id,
              name: apiKey.name,
              usage: {
                total: updatedApiKey.usageCount,
                daily: updatedApiKey.dailyUsageCount,
                monthly: updatedApiKey.monthlyUsageCount,
                lastUsed: updatedApiKey.lastUsedAt?.toISOString(),
              },
            },
          },
        },
        'Dynamic QR code created successfully'
      )
    );
  } catch (error) {
    logger.error('Failed to create dynamic QR code', { error });
    return res.status(500).json({
      success: false,
      message: 'Failed to create dynamic QR code',
      error:
        error instanceof Error
          ? error.message
          : 'Internal server error during dynamic QR code creation',
    });
  }
});

router.put('/dynamic/:shortId/update', async (req: Request, res: Response) => {
  const { shortId } = req.params;
  const { newTargetUrl } = req.body;

  logger.info('Updating dynamic QR code', { shortId, newTargetUrl });

  const apiKey = (req as any).apiKey; // Assuming apiKey is attached by middleware

  if (!apiKey) {
    return res
      .status(500)
      .json({ error: 'API key not found on request object' });
  }

  try {
    const result = await measurePerformance(
      'Dynamic QR code update',
      async () => {
        return db
          .update(dynamicQRCodes)
          .set({ targetUrl: newTargetUrl, updatedAt: new Date() })
          .where(
            sql`${dynamicQRCodes.shortId} = ${shortId} AND ${dynamicQRCodes.apiKeyId} = ${apiKey.id}`
          )
          .returning({ id: dynamicQRCodes.id });
      }
    );

    if (result.length === 0) {
      logger.warn('Dynamic QR code not found for update', { shortId });
      return res.status(404).json({
        success: false,
        message: 'Dynamic QR code not found',
        error:
          'The requested dynamic QR code does not exist or does not belong to this API key',
      });
    }

    logger.info('Dynamic QR code updated successfully', { shortId });
    return res.status(200).json(
      formatResponse(
        {
          update: {
            shortId,
            newTargetUrl,
            updatedAt: new Date().toISOString(),
          },
        },
        'Target URL updated successfully'
      )
    );
  } catch (error) {
    logger.error('Failed to update dynamic QR code', { error, shortId });
    return res.status(500).json({
      success: false,
      message: 'Failed to update dynamic QR code',
      error:
        error instanceof Error
          ? error.message
          : 'Internal server error during dynamic QR code update',
    });
  }
});

router.get(
  '/dynamic/:shortId/analytics',
  async (req: Request, res: Response) => {
    const { shortId } = req.params;
    logger.info('Fetching dynamic QR code analytics', { shortId });

    const apiKey = (req as any).apiKey; // Assuming apiKey is attached by middleware

    if (!apiKey) {
      return res
        .status(500)
        .json({ error: 'API key not found on request object' });
    }

    try {
      const result = await measurePerformance('Analytics fetch', async () => {
        // Find the dynamic QR code and ensure it belongs to the API key
        const qrCode = await db
          .select()
          .from(dynamicQRCodes)
          .where(
            sql`${dynamicQRCodes.shortId} = ${shortId} AND ${dynamicQRCodes.apiKeyId} = ${apiKey.id}`
          )
          .limit(1);

        if (qrCode.length === 0) {
          // Either shortId not found or it doesn't belong to this API key
          return null;
        }

        const dynamicQr = qrCode[0];

        // Count the scan events for this dynamic QR code
        const scanCountResult = await db
          .select({
            count: count(scanEvents.id),
          })
          .from(scanEvents)
          .where(eq(scanEvents.dynamicQRCodeId, dynamicQr.id));

        const totalScans = scanCountResult[0]?.count || 0;

        // TODO: Add more detailed analytics based on scanEvents data

        return {
          qrCode: dynamicQr,
          totalScans,
        };
      });

      if (!result) {
        logger.warn('Dynamic QR code not found for analytics', { shortId });
        return res.status(404).json({
          success: false,
          message: 'Dynamic QR code not found',
          error:
            'The requested dynamic QR code does not exist or does not belong to this API key',
        });
      }

      logger.info('Analytics retrieved successfully', {
        shortId,
        totalScans: result.totalScans,
      });

      return res.status(200).json(
        formatResponse(
          {
            analytics: {
              shortId: result.qrCode.shortId,
              totalScans: result.totalScans,
              createdAt: result.qrCode.createdAt,
              lastUpdated: result.qrCode.updatedAt,
              targetUrl: result.qrCode.targetUrl,
              scanMetrics: {
                total: result.totalScans,
                // TODO: Add more detailed metrics when implemented
              },
            },
          },
          'Analytics retrieved successfully'
        )
      );
    } catch (error) {
      logger.error('Failed to fetch analytics', { error, shortId });
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch analytics',
        error:
          error instanceof Error
            ? error.message
            : 'Internal server error during analytics fetch',
      });
    }
  }
);

router.post(
  '/bulk/generate',
  apiKeyAuth,
  async (req: Request, res: Response) => {
    const { jobs } = req.body as { jobs: BulkJob[] };

    logger.info('Starting bulk QR code generation', {
      totalJobs: jobs.length,
    });

    if (!Array.isArray(jobs) || jobs.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request',
        error: 'Request body must be an array of at least one job object',
      });
    }

    const apiKey = (req as any).apiKey;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: 'Authentication error',
        error: 'API key not found on request object',
      });
    }

    try {
      const result = await measurePerformance(
        'Bulk QR code generation',
        async () => {
          const apiKeyIdentifier = apiKey.id;
          const bulkRequestId = nanoid(8);
          const generatedFiles: GeneratedFile[] = [];

          // Update usage count for the API key
          const { dailyReset, monthlyReset } = resetUsageCounts(apiKey);
          await db
            .update(apiKeys)
            .set({
              usageCount: sql`${apiKeys.usageCount} + ${jobs.length}`,
              dailyUsageCount: dailyReset
                ? jobs.length
                : sql`${apiKeys.dailyUsageCount} + ${jobs.length}`,
              monthlyUsageCount: monthlyReset
                ? jobs.length
                : sql`${apiKeys.monthlyUsageCount} + ${jobs.length}`,
              lastUsedAt: new Date(),
            })
            .where(eq(apiKeys.key, apiKey.key));

          const uploadDir = path.join(
            __dirname,
            '..',
            '..',
            'data',
            'static',
            'qrcode',
            apiKeyIdentifier.toString(),
            'bulk',
            bulkRequestId
          );

          // Ensure the directory exists
          await fs.mkdir(uploadDir, { recursive: true });

          for (const job of jobs) {
            const {
              data,
              size = 256,
              format = 'png',
              foregroundColor = '#000000',
              backgroundColor = '#FFFFFF',
              logoUrl,
              logoScale = 0.2,
              logoMargin = 4,
              logoBackgroundColor,
              quietZone = 4,
              errorCorrectionLevel = 'M',
            } = job;

            if (!data) {
              logger.warn('Skipping bulk job due to missing data');
              continue;
            }

            try {
              // Generate QR code
              const qrCodeBuffer = await qrcode.toBuffer(data, {
                errorCorrectionLevel: errorCorrectionLevel as any,
                version: undefined,
                width: size,
                color: {
                  dark: foregroundColor,
                  light: backgroundColor,
                },
                margin: quietZone,
              });

              let finalImageBuffer = qrCodeBuffer;

              // Handle logo if present
              if (logoUrl) {
                try {
                  const logoResponse = await fetch(logoUrl);
                  if (!logoResponse.ok) {
                    logger.warn(
                      `Failed to fetch logo from ${logoUrl}. Generating without logo.`
                    );
                  } else {
                    const logoBuffer = await logoResponse.arrayBuffer();
                    const logoSize = Math.round(size * logoScale);
                    const logo = await sharp(Buffer.from(logoBuffer))
                      .resize(logoSize, logoSize, { fit: 'contain' })
                      .toBuffer();

                    const qrImage = sharp(qrCodeBuffer);
                    const qrMetadata = await qrImage.metadata();

                    const logoPosition = {
                      left: Math.round((qrMetadata.width! - logoSize) / 2),
                      top: Math.round((qrMetadata.height! - logoSize) / 2),
                    };

                    if (logoBackgroundColor) {
                      const backgroundRect = Buffer.from(
                        `<svg width="${logoSize}" height="${logoSize}"><rect width="${logoSize}" height="${logoSize}" fill="${logoBackgroundColor}"/></svg>`
                      );

                      finalImageBuffer = await qrImage
                        .composite([
                          {
                            input: backgroundRect,
                            left: logoPosition.left,
                            top: logoPosition.top,
                          },
                          {
                            input: logo,
                            left: logoPosition.left,
                            top: logoPosition.top,
                            blend: 'over',
                          },
                        ])
                        .toBuffer();
                    } else {
                      finalImageBuffer = await qrImage
                        .composite([
                          {
                            input: logo,
                            left: logoPosition.left,
                            top: logoPosition.top,
                            blend: 'over',
                          },
                        ])
                        .toBuffer();
                    }
                  }
                } catch (logoError) {
                  logger.error('Error embedding logo for bulk job', {
                    error: logoError,
                  });
                  // Continue without logo
                }
              }

              // Handle different formats
              let outputFormat = format.toLowerCase();
              let fileExtension = 'png';

              if (outputFormat === 'svg' && !logoUrl) {
                const svgQrCode = await qrcode.toString(data, {
                  errorCorrectionLevel: errorCorrectionLevel as any,
                  type: 'svg',
                  margin: quietZone,
                  color: { dark: foregroundColor, light: backgroundColor },
                });
                fileExtension = 'svg';
                const jobFileName = `${nanoid(8)}.${fileExtension}`;
                const jobFilePath = path.join(uploadDir, jobFileName);
                await fs.writeFile(jobFilePath, svgQrCode);
                generatedFiles.push({
                  originalData: data,
                  filePath: `/data/static/qrcode/${apiKeyIdentifier}/bulk/${bulkRequestId}/${jobFileName}`,
                  format: 'svg',
                  size,
                  foregroundColor,
                  backgroundColor,
                  logoUrl,
                  logoScale,
                  logoMargin,
                  logoBackgroundColor,
                  quietZone,
                  errorCorrectionLevel,
                  downloadUrl: `${
                    env.API_BASE_URL
                  }/data/static/qrcode/${apiKeyIdentifier}/bulk/${bulkRequestId}/${jobFileName}${generateTrackingParams(
                    'bulk',
                    bulkRequestId
                  )}`,
                });
              } else {
                if (outputFormat === 'jpeg') {
                  fileExtension = 'jpeg';
                  finalImageBuffer = await sharp(finalImageBuffer)
                    .jpeg()
                    .toBuffer();
                }
                const jobFileName = `${nanoid(8)}.${fileExtension}`;
                const jobFilePath = path.join(uploadDir, jobFileName);
                await fs.writeFile(jobFilePath, finalImageBuffer);
                generatedFiles.push({
                  originalData: data,
                  filePath: `/data/static/qrcode/${apiKeyIdentifier}/bulk/${bulkRequestId}/${jobFileName}`,
                  format: outputFormat,
                  size,
                  foregroundColor,
                  backgroundColor,
                  logoUrl,
                  logoScale,
                  logoMargin,
                  logoBackgroundColor,
                  quietZone,
                  errorCorrectionLevel,
                  downloadUrl: `${
                    env.API_BASE_URL
                  }/data/static/qrcode/${apiKeyIdentifier}/bulk/${bulkRequestId}/${jobFileName}${generateTrackingParams(
                    'bulk',
                    bulkRequestId
                  )}`,
                });
              }
            } catch (error) {
              logger.error('Error generating QR code for bulk job', { error });
              // Skip problematic job
              continue;
            }
          }

          return {
            bulkRequestId,
            generatedFiles,
          };
        }
      );

      logger.info('Bulk QR codes generated successfully', {
        bulkRequestId: result.bulkRequestId,
        totalGenerated: result.generatedFiles.length,
      });

      return res.status(200).json(
        formatResponse(
          {
            bulkRequest: {
              bulkRequestId: result.bulkRequestId,
              totalGenerated: result.generatedFiles.length,
              qrCodes: result.generatedFiles.map((file: GeneratedFile) => ({
                filePath: file.filePath,
                downloadUrl: file.downloadUrl,
                metadata: {
                  data: file.originalData,
                  size: file.size,
                  format: file.format,
                  customization: {
                    foregroundColor: file.foregroundColor,
                    backgroundColor: file.backgroundColor,
                    logoUrl: file.logoUrl,
                    logoScale: file.logoScale,
                    logoMargin: file.logoMargin,
                    logoBackgroundColor: file.logoBackgroundColor,
                    quietZone: file.quietZone,
                    errorCorrectionLevel: file.errorCorrectionLevel,
                  },
                  timestamp: new Date().toISOString(),
                },
              })),
            },
          },
          'Bulk QR codes generated successfully'
        )
      );
    } catch (error) {
      logger.error('Failed to generate bulk QR codes', { error });
      return res.status(500).json({
        success: false,
        message: 'Failed to generate bulk QR codes',
        error:
          error instanceof Error
            ? error.message
            : 'Internal server error during bulk QR code generation',
      });
    }
  }
);

/**
 * Get a single QR code by ID
 *
 * @route GET /api/v1/qr/:id
 * @description Retrieves a single QR code by its ID, supporting both static and dynamic QR codes
 * @param {string} id - The ID of the QR code (can be shortId for dynamic or hash for static)
 * @returns {Object} JSON response containing the QR code details
 */
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  logger.info('Fetching QR code by ID', { id });

  const apiKey = (req as any).apiKey;
  if (!apiKey) {
    return res.status(500).json({
      success: false,
      message: 'Authentication error',
      error: 'API key not found on request object',
    });
  }

  try {
    const result = await measurePerformance('QR code fetch', async () => {
      // First try to find a dynamic QR code
      const dynamicQR = await db
        .select()
        .from(dynamicQRCodes)
        .where(
          sql`${dynamicQRCodes.shortId} = ${id} AND ${dynamicQRCodes.apiKeyId} = ${apiKey.id}`
        )
        .limit(1);

      if (dynamicQR.length > 0) {
        const qr = dynamicQR[0];
        const scanCountResult = await db
          .select({
            count: count(scanEvents.id),
          })
          .from(scanEvents)
          .where(eq(scanEvents.dynamicQRCodeId, qr.id));

        const totalScans = scanCountResult[0]?.count || 0;
        const customizationParams =
          qr.customizationParams as QRCodeCustomization;

        return {
          type: 'dynamic',
          qrCode: {
            shortId: qr.shortId,
            filePath: `/data/static/qrcode/${apiKey.id}/dynamic/${qr.shortId}.png`,
            downloadUrl: `${env.API_BASE_URL}/data/static/qrcode/${apiKey.id}/dynamic/${qr.shortId}.png`,
            targetUrl: qr.targetUrl,
            originalDataEncoded: qr.originalDataEncoded,
            metadata: {
              ...customizationParams,
              generatedHash: qr.shortId,
              timestamp: qr.createdAt.toISOString(),
            },
            analytics: {
              totalScans,
              lastScanned: null, // TODO: Add last scan time
              createdAt: qr.createdAt.toISOString(),
              updatedAt: qr.updatedAt.toISOString(),
            },
          },
        };
      }

      // If not found as dynamic, check if it's a static QR code
      const staticFilePath = path.join(
        __dirname,
        '..',
        '..',
        'data',
        'static',
        'qrcode',
        apiKey.id.toString(),
        'static',
        `${id}.png`
      );

      try {
        await fs.access(staticFilePath);
        return {
          type: 'static',
          qrCode: {
            filePath: `/data/static/qrcode/${apiKey.id}/static/${id}.png`,
            downloadUrl: `${env.API_BASE_URL}/data/static/qrcode/${apiKey.id}/static/${id}.png`,
            metadata: {
              generatedHash: id,
              timestamp: (await fs.stat(staticFilePath)).mtime.toISOString(),
            },
          },
        };
      } catch (fileError) {
        return null; // File not found
      }
    });

    if (!result) {
      logger.warn('QR code not found', { id });
      return res.status(404).json({
        success: false,
        message: 'QR code not found',
        error:
          'The requested QR code does not exist or does not belong to this API key',
      });
    }

    logger.info('QR code retrieved successfully', { id, type: result.type });

    return res.status(200).json(
      formatResponse(
        {
          type: result.type,
          qrCode: result.qrCode,
        },
        'QR code retrieved successfully'
      )
    );
  } catch (error) {
    logger.error('Failed to fetch QR code', { error, id });
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch QR code',
      error:
        error instanceof Error
          ? error.message
          : 'Internal server error during QR code fetch',
    });
  }
});

export default router;
