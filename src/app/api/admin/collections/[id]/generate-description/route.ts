import { NextRequest, NextResponse } from 'next/server';
import { listKnowledgeFiles, updateCollectionRecord } from '@core/services/supabase.service';
import { PoeService } from '@core/services/poe.service';
import { ChatCompletion } from 'openai/resources/chat/completions';
import { createServerSupabase } from '@/core/lib/supabase-server';
import { isAdmin } from '@/core/services/auth.service';

/**
 * Generates a collection description by summarizing all its files' summaries.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isUserAdmin = await isAdmin(user.id);
    if (!isUserAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const { qdrantName } = await req.json();

    if (!qdrantName) return NextResponse.json({ error: 'Missing collection name' }, { status: 400 });

    const allFiles = await listKnowledgeFiles();
    const siloFiles = allFiles.filter(f => f.mode === qdrantName && f.summary);

    if (siloFiles.length === 0) {
      return NextResponse.json({ error: 'No indexed files with summaries found to generate description.' }, { status: 400 });
    }

    const aggregatedSummaries = siloFiles.map(f => `- ${f.filename}: ${f.summary}`).join('\n\n');

    const systemPrompt = `Bạn là một chuyên gia quản lý tri thức. Hãy viết một mô tả ngắn gọn (khoảng 2-3 câu) cho không gian tri thức này dựa trên danh sách các tài liệu sau đây. 
    Mô tả nên làm nổi bật chủ đề chính và giá trị cốt lõi của không gian này.
    
    YÊU CẦU: Viết bằng tiếng Việt, súc tích, chuyên nghiệp. Không dùng các từ như "Đây là...", "Không gian này...". Hãy đi thẳng vào nội dung chính.`;

    const userPrompt = `DANH SÁCH TÀI LIỆU:\n${aggregatedSummaries}`;

    const response = await PoeService.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]);

    const description = (response as ChatCompletion).choices[0].message.content || '';
    
    await updateCollectionRecord(id, { description: description.trim() });

    return NextResponse.json({ description: description.trim() });
  } catch (error: any) {
    console.error('Generate silo description error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
