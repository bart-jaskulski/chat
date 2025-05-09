import type { InferSelectModel } from 'drizzle-orm';
import {
  sqliteTable,
  text,
  integer,
  primaryKey,
  foreignKey,
  boolean,
} from 'drizzle-orm/sqlite-core';
import { generateUUID } from '../utils';

export const user = sqliteTable('User', {
  id: text('id').primaryKey().$defaultFn(() => generateUUID()),
  email: text('email').notNull(),
  password: text('password'),
});

export type User = InferSelectModel<typeof user>;

export const chat = sqliteTable('Chat', {
  id: text('id').primaryKey().$defaultFn(() => generateUUID()),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
  title: text('title').notNull(),
  userId: text('userId')
    .notNull()
    .references(() => user.id),
  visibility: text('visibility', { enum: ['public', 'private'] })
    .notNull()
    .default('private'),
});

export type Chat = InferSelectModel<typeof chat>;

// DEPRECATED: The following schema is deprecated and will be removed in the future.
// Read the migration guide at https://chat-sdk.dev/docs/migration-guides/message-parts
export const messageDeprecated = sqliteTable('Message', {
  id: text('id').primaryKey().$defaultFn(() => generateUUID()),
  chatId: text('chatId')
    .notNull()
    .references(() => chat.id),
  role: text('role').notNull(),
  content: text('content', { mode: 'json' }).notNull(),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
});

export type MessageDeprecated = InferSelectModel<typeof messageDeprecated>;

export const message = sqliteTable('Message_v2', {
  id: text('id').primaryKey().$defaultFn(() => generateUUID()),
  chatId: text('chatId')
    .notNull()
    .references(() => chat.id),
  role: text('role').notNull(),
  parts: text('parts', { mode: 'json' }).notNull(),
  attachments: text('attachments', { mode: 'json' }).notNull(),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
});

export type DBMessage = InferSelectModel<typeof message>;

export const vote = sqliteTable(
  'Vote_v2',
  {
    chatId: text('chatId')
      .notNull()
      .references(() => chat.id),
    messageId: text('messageId')
      .notNull()
      .references(() => message.id),
    isUpvoted: integer('isUpvoted', { mode: 'boolean' }).notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    };
  },
);

export type Vote = InferSelectModel<typeof vote>;

export const document = sqliteTable(
  'Document',
  {
    id: text('id').notNull().$defaultFn(() => generateUUID()),
    createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
    title: text('title').notNull(),
    content: text('content'),
    kind: text('kind', { enum: ['text', 'code', 'image', 'sheet'] }) // Corrected column name from 'text' to 'kind'
      .notNull()
      .default('text'),
    userId: text('userId')
      .notNull()
      .references(() => user.id),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.id, table.createdAt] }),
    };
  },
);

export type Document = InferSelectModel<typeof document>;

export const suggestion = sqliteTable(
  'Suggestion',
  {
    id: text('id').notNull().$defaultFn(() => generateUUID()),
    documentId: text('documentId').notNull(),
    documentCreatedAt: integer('documentCreatedAt', { mode: 'timestamp_ms' }).notNull(),
    originalText: text('originalText').notNull(),
    suggestedText: text('suggestedText').notNull(),
    description: text('description'),
    isResolved: integer('isResolved', { mode: 'boolean' }).notNull().default(false),
    userId: text('userId')
      .notNull()
      .references(() => user.id),
    createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    documentRef: foreignKey({
      columns: [table.documentId, table.documentCreatedAt],
      foreignColumns: [document.id, document.createdAt],
    }),
  }),
);

export type Suggestion = InferSelectModel<typeof suggestion>;

export const stream = sqliteTable(
  'Stream',
  {
    id: text('id').notNull().$defaultFn(() => generateUUID()),
    chatId: text('chatId').notNull(),
    createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    chatRef: foreignKey({
      columns: [table.chatId],
      foreignColumns: [chat.id],
    }),
  }),
);

export type Stream = InferSelectModel<typeof stream>;
