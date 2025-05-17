/**
 * API Key Management Routes
 *
 * This module handles the creation and management of API keys for the QR code generation service.
 * It provides endpoints for creating new API keys and managing their lifecycle.
 *
 * @module routes/apikey
 */

import { Router, Request, Response } from 'express';
import { db } from '../db';
import { apiKeys } from '../db/schema';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';
import { formatResponse } from '../utils/response';

const router = Router();

/**
 * Create a new API key
 *
 * @route POST /api/v1/apikey
 * @description Creates a new API key with default settings for the free tier
 * @returns {Object} JSON response containing the new API key and its metadata
 *
 * @example
 * // Request
 * POST /api/v1/apikey
 *
 * // Response
 * {
 *   "success": true,
 *   "message": "API key created successfully",
 *   "data": {
 *     "apiKey": {
 *       "id": 1,
 *       "key": "uuid-string",
 *       "status": "active",
 *       "tier": "free",
 *       "usage": {
 *         "total": 0,
 *         "daily": 0,
 *         "monthly": 0
 *       },
 *       "limits": {
 *         "rateLimit": 1000,
 *         "rateLimitInterval": "day"
 *       },
 *       "metadata": {
 *         "createdAt": "2024-03-14T12:00:00.000Z",
 *         "expiresAt": null
 *       },
 *       "endpoints": {
 *         "base": "/api/v1",
 *         "qr": {
 *           "generate": "/qr/generate",
 *           "dynamic": {
 *             "create": "/qr/dynamic/create",
 *             "update": "/qr/dynamic/:shortId/update",
 *             "analytics": "/qr/dynamic/:shortId/analytics"
 *           },
 *           "bulk": {
 *             "generate": "/qr/bulk/generate"
 *           }
 *         }
 *       },
 *       "documentation": {
 *         "baseUrl": "http://localhost:3000",
 *         "docsUrl": "http://localhost:3000/docs"
 *       }
 *     }
 *   }
 * }
 */
router.post('/', async (req: Request, res: Response) => {
  logger.info('Creating new API key');

  try {
    const newApiKey = uuidv4();
    const createdAt = new Date();

    // Create the API key with default values
    const [apiKey] = await db
      .insert(apiKeys)
      .values({
        key: newApiKey,
        createdAt,
        status: 'active',
        tier: 'free',
        usageCount: 0,
        dailyUsageCount: 0,
        monthlyUsageCount: 0,
        rateLimit: 1000, // Default rate limit
        rateLimitInterval: 'day', // Default interval
      })
      .returning();

    if (!apiKey) {
      throw new Error('Failed to create API key record');
    }

    logger.info('API key created successfully', {
      apiKeyId: apiKey.id,
      tier: apiKey.tier,
    });

    return res.status(201).json(
      formatResponse(
        {
          apiKey: {
            id: apiKey.id,
            key: apiKey.key,
            status: apiKey.status,
            tier: apiKey.tier,
            usage: {
              total: apiKey.usageCount,
              daily: apiKey.dailyUsageCount,
              monthly: apiKey.monthlyUsageCount,
            },
            limits: {
              rateLimit: apiKey.rateLimit,
              rateLimitInterval: apiKey.rateLimitInterval,
            },
            metadata: {
              createdAt: apiKey.createdAt.toISOString(),
              expiresAt: apiKey.expiresAt?.toISOString() || null,
            },
            endpoints: {
              base: '/api/v1',
              qr: {
                generate: '/qr/generate',
                dynamic: {
                  create: '/qr/dynamic/create',
                  update: '/qr/dynamic/:shortId/update',
                  analytics: '/qr/dynamic/:shortId/analytics',
                },
                bulk: {
                  generate: '/qr/bulk/generate',
                },
              },
            },
            documentation: {
              baseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
              docsUrl: `${
                process.env.API_BASE_URL || 'http://localhost:3000'
              }/docs`,
            },
          },
        },
        'API key created successfully'
      )
    );
  } catch (error) {
    logger.error('Failed to create API key', { error });
    return res.status(500).json({
      success: false,
      message: 'Failed to create API key',
      error:
        error instanceof Error
          ? error.message
          : 'Internal server error during API key creation',
    });
  }
});

export default router;
