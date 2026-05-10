import { pgTable, text, timestamp, uuid, jsonb, integer, pgEnum, index, uniqueIndex, boolean } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["admin", "staff", "user"]);
export const fileStatusEnum = pgEnum("file_status", ["pending", "indexing", "completed", "failed"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  supabaseId: uuid("supabase_id").notNull().unique(),
  email: text("email").notNull().unique(),
  fullName: text("full_name"),
  avatarUrl: text("avatar_url"),
  role: userRoleEnum("role").notNull().default("user"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const knowledgeCollections = pgTable("knowledge_collections", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  /** Identifier linking files to this collection (the file.mode value) */
  collectionKey: text("collection_key").notNull().unique(),
  description: text("description"),
  allowedRoles: jsonb("allowed_roles").default(["admin", "staff", "user"]),
  createdAt: timestamp("created_at").defaultNow(),
});

export const knowledgeFiles = pgTable("knowledge_files", {
  id: uuid("id").primaryKey().defaultRandom(),
  filename: text("filename").notNull(),
  /** FK to knowledge_collections.collectionKey */
  collectionKey: text("collection_key").notNull().references(() => knowledgeCollections.collectionKey, { onDelete: 'cascade' }),
  folder: text("folder").default("root"),
  status: fileStatusEnum("status").notNull().default("pending"),
  progress: integer("progress").default(0),
  summary: text("summary"),
  /** Whether a PageIndex tree has been built (fast filter, avoids jsonb ? operator) */
  hasTree: boolean("has_tree").default(false),
  logs: jsonb("logs").default([]),
  /** { storagePath, pageindexTree } — pageindexTree is the full document tree */
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  folderFilenameUnique: uniqueIndex("knowledge_files_folder_filename_unique").on(table.folder, table.filename),
  collectionKeyIdx: index("knowledge_files_collection_key_idx").on(table.collectionKey),
  statusIdx: index("knowledge_files_status_idx").on(table.status),
  hasTreeIdx: index("knowledge_files_has_tree_idx").on(table.hasTree),
  createdAtIdx: index("knowledge_files_created_at_idx").on(table.createdAt),
}));

export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").references(() => users.id),
  title: text("title").default("Cuộc hội thoại mới"),
  isStarred: integer("is_starred").default(0),
  messages: jsonb("messages").notNull().default([]),
  locationCoords: jsonb("location_coords"),
  locationAddress: text("location_address"),
  tokenUsage: jsonb("token_usage"),
  messageCount: integer("message_count").default(0),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("user_id_idx").on(table.userId),
}));

export const reports = pgTable("reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  reportedMessage: text("reported_message").notNull(),
  conversation: jsonb("conversation").notNull(),
  note: text("note"),
  sessionId: text("session_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userMemories = pgTable("user_memories", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  fact: text("fact").notNull(),
  category: text("category").notNull().default("general"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("user_memories_user_id_idx").on(table.userId),
  userFactUnique: uniqueIndex("user_memories_user_fact_unique").on(table.userId, table.fact),
}));

export const userMemoryTasks = pgTable("user_memory_tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  batchId: text("batch_id").notNull().unique(),
  status: text("status").notNull().default("in_progress"),
  outputFileId: text("output_file_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const agentTraces = pgTable("agent_traces", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  conversationId: uuid("conversation_id").references(() => conversations.id),
  totalTokens: integer("total_tokens").notNull().default(0),
  totalCostUsd: text("total_cost_usd").notNull().default("0"),
  latencyMs: integer("latency_ms").notNull().default(0),
  /** PageIndex search trace: which documents and sections were explored */
  searchPath: text("search_path"),
  feedback: integer("feedback").default(0),
  error: text("error"),
  isAnonymized: integer("is_anonymized").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("agent_traces_user_id_idx").on(table.userId),
  createdAtIdx: index("agent_traces_created_at_idx").on(table.createdAt),
}));

export const agentSpans = pgTable("agent_spans", {
  id: uuid("id").primaryKey().defaultRandom(),
  traceId: uuid("trace_id").references(() => agentTraces.id).notNull(),
  nodeName: text("node_name").notNull(),
  model: text("model").notNull(),
  input: jsonb("input"),
  output: jsonb("output"),
  promptTokens: integer("prompt_tokens").notNull().default(0),
  completionTokens: integer("completion_tokens").notNull().default(0),
  cachedTokens: integer("cached_tokens").notNull().default(0),
  cacheCreationTokens: integer("cache_creation_tokens").notNull().default(0),
  costUsd: text("cost_usd").notNull().default("0"),
  latencyMs: integer("latency_ms").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});
