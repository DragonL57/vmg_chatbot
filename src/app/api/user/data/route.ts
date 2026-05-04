import { NextResponse } from 'next/server';
import { createServerSupabase, createAdminSupabase } from '@/core/lib/supabase-server';
import { DrizzleAuthRepositoryAdapter, ConsoleLoggerAdapter } from '@core/infrastructure/adapters';
import { db } from '@/core/db';
import { users, conversations, userMemories, agentTraces, agentSpans, reports } from '@/core/db/schema';
import { eq, inArray } from 'drizzle-orm';

const logger = new ConsoleLoggerAdapter();

/**
 * GET /api/user/data — Export all personal data for the authenticated user.
 * Complies with Law 91/2025 §11: right to access and data portability.
 * Returns data in structured JSON format within 10-day response window.
 */
export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const authRepo = new DrizzleAuthRepositoryAdapter();
    const internalUserId = await authRepo.getInternalId(user.id);
    if (!internalUserId) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const [internalUser] = await Promise.all([
      db.select().from(users).where(eq(users.id, internalUserId)).limit(1),
    ]);

    const [userConversations, userMemoryRecords, userTraces, userReports] = await Promise.all([
      db.select().from(conversations).where(eq(conversations.userId, internalUserId)),
      db.select().from(userMemories).where(eq(userMemories.userId, internalUserId)),
      db.select().from(agentTraces).where(eq(agentTraces.userId, internalUserId)),
      db.select().from(reports).where(eq(reports.userId, internalUserId)),
    ]);

    const profileUser = internalUser[0] ?? { id: internalUserId, email: null, fullName: null };

    const exportData = {
      exportedAt: new Date().toISOString(),
      userId: internalUserId,
      profile: {
        id: profileUser.id,
        email: profileUser.email,
        fullName: profileUser.fullName,
      },
      conversations: userConversations.map((c) => ({
        id: c.id,
        title: c.title,
        messages: c.messages,
        messageCount: c.messageCount,
        tokenUsage: c.tokenUsage,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
      memories: userMemoryRecords.map((m) => ({
        id: m.id,
        fact: m.fact,
        category: m.category,
        createdAt: m.createdAt,
      })),
      agentTraces: userTraces.map((t) => ({
        id: t.id,
        totalTokens: t.totalTokens,
        totalCostUsd: t.totalCostUsd,
        latencyMs: t.latencyMs,
        feedback: t.feedback,
        error: t.error,
        createdAt: t.createdAt,
      })),
      reports: userReports.map((r) => ({
        id: r.id,
        reportedMessage: r.reportedMessage,
        note: r.note,
        createdAt: r.createdAt,
      })),
    };

    return NextResponse.json(exportData);
  } catch (error: unknown) {
    logger.error('Data export failed', error, { operation: 'user_data_export' });
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}

/**
 * DELETE /api/user/data — Anonymize all personal data for the authenticated user.
 * Complies with Law 91/2025 §11: right to erasure ('right to be forgotten').
 * Anonymizes user profile, clears conversations/memories/traces.
 * Response within 20-day window per Decree 356/2025.
 */
export async function DELETE() {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const authRepo = new DrizzleAuthRepositoryAdapter();
    const internalUserId = await authRepo.getInternalId(user.id);
    if (!internalUserId) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const supabaseAdmin = createAdminSupabase();
    const anonEmail = `anon-${internalUserId.slice(0, 8)}@anonymized.local`;

    // DB first — if this fails, Auth is untouched and user can retry
    await db.transaction(async (tx) => {
      // Anonymize user profile
      await tx.update(users)
        .set({
          email: anonEmail,
          fullName: null,
          avatarUrl: null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, internalUserId));

      // Clear conversations (keep structure, remove content)
      await tx.update(conversations)
        .set({
          title: 'Anonymized',
          messages: [],
          tokenUsage: null,
          locationCoords: null,
          locationAddress: null,
          updatedAt: new Date(),
        })
        .where(eq(conversations.userId, internalUserId));

      // Clear memories
      await tx.delete(userMemories).where(eq(userMemories.userId, internalUserId));

      // Find user traces to also scrub span payloads
      const userTraceIds = await tx.select({ id: agentTraces.id })
        .from(agentTraces)
        .where(eq(agentTraces.userId, internalUserId));

      if (userTraceIds.length > 0) {
        const traceIds = userTraceIds.map(t => t.id);
        // Scrub span payloads — input/output contain user conversation text
        await tx.update(agentSpans)
          .set({ input: null, output: null })
          .where(inArray(agentSpans.traceId, traceIds));
      }

      // Anonymize traces (keep for audit, remove user/conversation link, mark as anonymized)
      await tx.update(agentTraces)
        .set({
          userId: null,
          conversationId: null,
          isAnonymized: 1,
        })
        .where(eq(agentTraces.userId, internalUserId));

      // Anonymize reports — conversation is not-null so set to empty array
      await tx.update(reports)
        .set({
          userId: null,
          reportedMessage: 'Anonymized',
          conversation: [],
          note: null,
          sessionId: null,
        })
        .where(eq(reports.userId, internalUserId));
    });

    // DB transaction succeeded. Now scrub Supabase Auth record.
    // If this fails, DB is already safe — return 500 so user can retry to complete Auth scrub.
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      email: anonEmail,
      user_metadata: {},
    });

    if (authError) {
      logger.error('Auth anonymization failed after DB scrub', authError, { operation: 'user_data_anonymize', userId: internalUserId });
      return NextResponse.json({ error: 'Anonymization completed for stored data but failed for account email. Please try again.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Dữ liệu đã được ẩn danh hóa' });
  } catch (error: unknown) {
    logger.error('Data anonymization failed', error, { operation: 'user_data_anonymize' });
    return NextResponse.json({ error: 'Anonymization failed' }, { status: 500 });
  }
}
