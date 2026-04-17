import { pgTable, text, timestamp, uuid, jsonb, integer } from "drizzle-orm/pg-core";

export const knowledgeFiles = pgTable("knowledge_files", {
  id: uuid("id").primaryKey().defaultRandom(),
  filename: text("filename").notNull().unique(),
  sourceUrl: text("source_url"),
  status: text("status", { enum: ["pending", "indexing", "completed", "failed"] }).notNull(),
  errorMessage: text("error_message"),
  mode: text("mode").notNull(),
  progress: integer("progress").default(0),
  logs: jsonb("logs").default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const knowledgeCollections = pgTable("knowledge_collections", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  qdrantName: text("qdrant_name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey(),
  messages: jsonb("messages").notNull().default([]),
  locationCoords: jsonb("location_coords"),
  locationAddress: text("location_address"),
  tokenUsage: jsonb("token_usage"),
  messageCount: integer("message_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
