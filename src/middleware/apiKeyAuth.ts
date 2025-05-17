import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { apiKeys } from '../db/schema';
import { eq } from 'drizzle-orm';

const apiKeyAuth = async (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.header('X-API-Key');

  if (!apiKey) {
    console.warn('API key missing in request header');
    return res.status(401).json({ error: 'API key missing' });
  }

  try {
    console.log(`Attempting to validate API key: ${apiKey}`);
    const validKey = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.key, apiKey))
      .limit(1);

    if (validKey.length === 0) {
      console.warn(`Invalid API key provided: ${apiKey}`);
      return res.status(401).json({ error: 'Invalid API key' });
    }

    console.log(`API key validated successfully for key: ${apiKey}`);
    (req as any).apiKey = validKey[0];

    next();
  } catch (error) {
    console.error('Error validating API key:', error);
    res
      .status(500)
      .json({ error: 'Internal server error during API key validation' });
  }
};

export default apiKeyAuth;
