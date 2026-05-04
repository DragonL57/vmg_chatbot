import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/core/lib/supabase-server';
import { DrizzleAuthRepositoryAdapter } from '@core/infrastructure/adapters';
import { db } from '@/core/db';
import { users, conversations, userMemories, agentTraces, reports } from '@/core/db/schema';
import { eq } from 'drizzle-orm';

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

    const [userConversations, userMemoryRecords, userTraces, userReports] = await Promise.all([
      db.select().from(conversations).where(eq(conversations.userId, internalUserId)),
      db.select().from(userMemories).where(eq(userMemories.userId, internalUserId)),
      db.select().from(agentTraces).where(eq(agentTraces.userId, internalUserId)),
      db.select().from(reports).where(eq(reports.userId, internalUserId)),
    ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      userId: internalUserId,
      profile: {
        id: user.id,
        email: user.email,
        fullName: user.user_metadata?.full_name || null,
      },
      conversations: userConversations.map((c) => ({
        id: c.id,
        title: c.title,
        messageCount: c.messageCount,
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
        createdAt: t.createdAt,
      })),
      reports: userReports.map((r) => ({
        id: r.id,
        createdAt: r.createdAt,
      })),
    };

    return NextResponse.json(exportData);
  } catch (error: unknown) {
    console.error('[User Data Export API] Error:', error);
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

    await db.transaction(async (tx) => {
      // Anonymize user profile
      await tx.update(users)
        .set({
          email: `anon-${internalUserId.slice(0, 8)}@anonymized.local`,
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

      // Anonymize traces (keep for audit, remove user link)
      await tx.update(agentTraces)
        .set({ userId: null })
        .where(eq(agentTraces.userId, internalUserId));

      // Anonymize reports
      await tx.update(reports)
        .set({
          userId: null,
          reportedMessage: 'Anonymized',
          note: null,
        })
        .where(eq(reports.userId, internalUserId));
    });

    return NextResponse.json({ success: true, message: 'Dữ liệu đã được ẩn danh hóa' });
  } catch (error: unknown) {
    console.error('[User Data Delete API] Error:', error);
    return NextResponse.json({ error: 'Anonymization failed' }, { status: 500 });
  }
}
