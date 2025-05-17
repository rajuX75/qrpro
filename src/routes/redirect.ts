import { Router } from 'express';
import { db } from '../db';
import { dynamicQRCodes, scanEvents } from '../db/schema';
import { eq } from 'drizzle-orm';

const router = Router();

router.get('/:shortId', async (req, res) => {
  const { shortId } = req.params;

  try {
    // Find the dynamic QR code by shortId
    const qrCode = await db
      .select()
      .from(dynamicQRCodes)
      .where(eq(dynamicQRCodes.shortId, shortId))
      .limit(1);

    if (qrCode.length === 0) {
      return res.status(404).send('QR Code not found');
    }

    const dynamicQr = qrCode[0];

    // Log the scan event (basic implementation)
    try {
      await db.insert(scanEvents).values({
        dynamicQRCodeId: dynamicQr.id,
        ipAddress: req.ip, // Basic IP address logging
        userAgent: req.headers['user-agent'], // Basic User Agent logging
      });
    } catch (scanError) {
      console.error('Error logging scan event:', scanError);
      // Continue with redirect even if logging fails
    }

    // Redirect to the target URL
    res.redirect(dynamicQr.targetUrl);
  } catch (error) {
    console.error('Error handling dynamic QR redirect:', error);
    res.status(500).send('Internal server error');
  }
});

export default router;
