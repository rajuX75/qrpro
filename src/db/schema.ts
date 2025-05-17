import {
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
  integer,
  jsonb,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const apiKeys = pgTable('api_keys', {
  id: serial('id').primaryKey(),
  key: varchar('key', { length: 256 }).unique().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastUsedAt: timestamp('last_used_at'),
  status: varchar('status', { length: 256 }).default('active').notNull(), // e.g., active, inactive
  tier: varchar('tier', { length: 256 }).default('free').notNull(), // e.g., free, premium_v1
  usageCount: serial('usage_count').notNull(),
  dailyUsageCount: integer('daily_usage_count').default(0).notNull(),
  monthlyUsageCount: integer('monthly_usage_count').default(0).notNull(),
  expiresAt: timestamp('expires_at'),
  rateLimit: integer('rate_limit'),
  rateLimitInterval: varchar('rate_limit_interval', { length: 50 }), // e.g., 'minute', 'hour', 'day'
});

export const dynamicQRCodes = pgTable('dynamic_qr_codes', {
  id: serial('id').primaryKey(),
  shortId: varchar('short_id', { length: 256 }).unique().notNull(),
  apiKeyId: integer('api_key_id')
    .references(() => apiKeys.id)
    .notNull(),
  targetUrl: text('target_url').notNull(),
  originalDataEncoded: text('original_data_encoded').notNull(), // The URL like /r/{shortId}
  customizationParams: jsonb('customization_params'), // Store customization options used
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const scanEvents = pgTable('scan_events', {
  id: serial('id').primaryKey(),
  dynamicQRCodeId: integer('dynamic_qr_code_id')
    .references(() => dynamicQRCodes.id)
    .notNull(),
  scannedAt: timestamp('scanned_at').defaultNow().notNull(),
  ipAddress: varchar('ip_address', { length: 256 }), // Consider privacy implications
  userAgent: text('user_agent'),
  geolocation: jsonb('geolocation'), // Optional, derived from IP
});

export const apiKeysRelations = relations(apiKeys, ({ many }) => ({
  dynamicQRCodes: many(dynamicQRCodes),
}));

export const dynamicQRCodesRelations = relations(
  dynamicQRCodes,
  ({ one, many }) => ({
    apiKey: one(apiKeys, {
      fields: [dynamicQRCodes.apiKeyId],
      references: [apiKeys.id],
    }),
    scanEvents: many(scanEvents),
  })
);

export const scanEventsRelations = relations(scanEvents, ({ one }) => ({
  dynamicQRCode: one(dynamicQRCodes, {
    fields: [scanEvents.dynamicQRCodeId],
    references: [dynamicQRCodes.id],
  }),
}));
