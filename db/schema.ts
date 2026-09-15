import { sqliteTable, text, integer, primaryKey, index } from "drizzle-orm/sqlite-core";
export const drafts = sqliteTable("drafts", {
  ownerId: text("owner_id").notNull(), id: text("id").notNull(),
  account: text("account").notNull(), title: text("title").notNull(),
  content: text("content").notNull(), materials: text("materials").notNull(),
  source: text("source").notNull(), updatedAt: integer("updated_at").notNull(),
}, table => [primaryKey({ columns: [table.ownerId, table.id] }), index("idx_drafts_owner_updated").on(table.ownerId, table.updatedAt)]);
export const profiles = sqliteTable("profiles", {
  ownerId: text("owner_id").notNull(), account: text("account").notNull(),
  name: text("name").notNull(), audience: text("audience").notNull(), focus: text("focus").notNull(),
  persona: text("persona").notNull().default(""),
  tone: text("tone").notNull().default(""),
  pillars: text("pillars").notNull().default(""),
}, table => [primaryKey({ columns: [table.ownerId, table.account] })]);
export const topicPools = sqliteTable("topic_pools", {
  ownerId: text("owner_id").notNull(), account: text("account").notNull(),
  topics: text("topics").notNull(), source: text("source").notNull(),
  subject: text("subject").notNull(), engine: text("engine").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, table => [primaryKey({ columns: [table.ownerId, table.account] })]);
