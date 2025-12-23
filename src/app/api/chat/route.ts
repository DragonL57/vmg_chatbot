import { poe, DEFAULT_POE_MODEL } from '@/lib/poe';
import { ManagerService } from '@/services/manager.service';
import { SearchService } from '@/services/search.service';
import { GuardrailsService } from '@/services/guardrails.service';

export const maxDuration = 60; // Allow 60s for RAG operations

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const lastMessage = messages[messages.length - 1];

    if (!lastMessage) {
        return new Response('No messages provided', { status: 400 });
    }

    // 0. Policy Check (Guardrails)
    const guardrail = await GuardrailsService.validate(lastMessage.content);
    if (!guardrail.safe) {
      return new Response(guardrail.reason || "Yêu cầu của bạn bị từ chối do vi phạm chính sách.", { status: 400 });
    }

    // 1. Manager Analysis
    // We decompose the user's latest query to understand intent and ambiguity, using full history
    const decomposition = await ManagerService.decompose(messages);

    const staticKnowledge = `
# TỔNG QUAN CHƯƠNG TRÌNH ĐÀO TẠO VMG (KNOWLEDGE)
VMG English hiện có 5 chương trình đào tạo chính:
1. E-PIONEER (Tiếng Anh Mầm Non): 4 - 6 tuổi. Lộ trình 3 Cấp độ - 12 Khóa học. Giáo trình Learn with Ollie.
2. E-CONTENDER (Tiếng Anh Tiền Tiểu Học): 5 - 6 tuổi. Giai đoạn chuyển tiếp lên tiểu học. Giáo trình Happy Campers.
3. E-GENIUS (Tiếng Anh Thiếu Nhi): 6 - 11 tuổi. Chinh phục chứng chỉ Cambridge (Starters, Movers, Flyers). Giáo trình Share It!
4. NEXTGEN IELTS (Tiếng Anh Thiếu Niên): 12 - 17 tuổi. Lộ trình từ Onset (A2) đến Milestone 7.0+.
5. E-PLUS (Tiếng Anh Giao Tiếp): 17 tuổi trở lên. Tập trung phản xạ, 50% thời lượng với GV bản xứ.

Lưu ý: Luôn dựa vào độ tuổi và mục tiêu của khách hàng để tư vấn chương trình phù hợp nhất.
`.trim();

    let systemContext = `
# VAI TRÒ & NHIỆM VỤ (PERSONA)
Bạn là **Tư vấn viên Học thuật (Study Advisor)** cấp cao tại VMG English Center. Bạn không chỉ trả lời câu hỏi mà còn là người đồng hành giúp khách hàng tìm ra lộ trình học tập tối ưu nhất.

${staticKnowledge}

# THẤU HIỂU KHÁCH HÀNG (CUSTOMER INSIGHT)
`.trim();

    if (decomposition.isAmbiguous) {
      // If ambiguous, instructions are just to ask the clarification question.
      systemContext += `\n\n# TÌNH HUỐNG: CẦN THÊM THÔNG TIN
Câu hỏi hiện tại đang bị thiếu ngữ cảnh. Hãy đặt câu hỏi làm rõ một cách lịch sự dựa trên gợi ý sau:
"${decomposition.clarificationQuestion}"
(Lưu ý: Chỉ đặt câu hỏi, không trả lời lan man).`;
    } else {
      // 2. Retrieval (Parallel Execution)
      // Search for the first subquery (primary intent) and the original query in FAQs
      const primaryQuery = decomposition.subQueries[0] || lastMessage.content;
      
      const [docResults, faqResults] = await Promise.all([
        SearchService.searchDocuments(primaryQuery),
        SearchService.searchFaqs(lastMessage.content) // Use original query for exact match FAQs
      ]);

      // Format Context
      const contextBlock = docResults.length > 0 
        ? docResults.map(r => `[THÔNG TIN CHI TIẾT]\n${r.content}`).join('\n\n')
        : "Không tìm thấy tài liệu liên quan.";
        
      const faqBlock = faqResults.length > 0
        ? faqResults.map(f => `[CÂU HỎI THƯỜNG GẶP]\n${f.content}`).join('\n\n')
        : "Không tìm thấy FAQ liên quan.";

      systemContext += `\n\n# DỮ LIỆU TRA CỨU (CONTEXT)
${contextBlock}
${faqBlock}

# VÍ DỤ MẪU (FEW-SHOT EXAMPLES)
Dưới đây là các ví dụ về cách trả lời CHUẨN MỰC mà bạn cần mô phỏng:

**Q: Con tôi chưa biết chữ thì có học được không?**
**A:**
Hoàn toàn được ạ! Chương trình EPI được thiết kế dành riêng cho lứa tuổi mẫu giáo, nên không yêu cầu bé biết chữ.
- Mục tiêu chính là giúp trẻ phát triển phản xạ tiếng Anh, nhận diện âm thanh và từ vựng thông qua hình ảnh, vận động, bài hát và trò chơi.
- Lớp học có cả giáo viên Việt Nam và giáo viên nước ngoài, kết hợp linh hoạt để phù hợp với khả năng tiếp thu của trẻ.

**Q: Làm sao tôi biết giáo viên bên em phát âm có chuẩn không? Tôi sợ phát âm sai ảnh hưởng bé.**
**A:**
Trung tâm luôn tuyển chọn giáo viên theo quy trình nghiêm ngặt, bao gồm phỏng vấn chuyên môn, kiểm tra phát âm, và thử giảng thực tế.
- Ngoài ra, đội ngũ chuyên môn của trung tâm thường xuyên dự giờ, tập huấn và đánh giá định kỳ để đảm bảo chất lượng giảng dạy và phát âm của giáo viên luôn đạt chuẩn quốc tế.

**Q: Học phí cao vậy có đảm bảo bé đạt được chứng chỉ IELTS không, nếu theo đúng lộ trình?**
**A:**
Trung tâm có chương trình IELTS 5.5+ cam kết đầu ra bằng văn bản.
- Trong trường hợp học viên không đạt được mức điểm cam kết, trung tâm sẽ hỗ trợ học lại miễn phí.
- Tuy nhiên, chương trình này yêu cầu sự cam kết học tập nghiêm túc từ học viên (bài tập đầy đủ, đi học đúng giờ, chuyên cần).

**Q: Thời gian học bao lâu thì thấy hiệu quả?**
**A:**
Với lộ trình từ 4 đến 8 tuần, học viên sẽ có thể cảm nhận được sự cải thiện rõ rệt chỉ sau 2–3 buổi học:
- Nói tự tin hơn.
- Phản xạ nhanh hơn.
- Diễn đạt rõ ràng hơn.

# CHỈ THỊ THỰC THI
Dựa trên lịch sử trò chuyện và Dữ liệu tra cứu, hãy đóng vai Tư vấn viên để phản hồi khách hàng. Hãy mô phỏng giọng điệu và cấu trúc của các ví dụ trên. Luôn ưu tiên thông tin từ FAQ nếu có sự trùng khớp cao.`;
    }

    // 3. Generate Response Stream
    const completion = await poe.chat.completions.create({
      model: DEFAULT_POE_MODEL,
      stream: true,
      messages: [
        { role: 'system', content: systemContext },
        ...messages.map((m: { role: string; content: string }) => ({ role: m.role, content: m.content })),
      ],
    });

    // Create a readable stream from the OpenAI stream
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              controller.enqueue(encoder.encode(content));
            }
          }
        } catch (error) {
          controller.error(error);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-URASys-Ambiguous': decomposition.isAmbiguous ? 'true' : 'false',
      },
    });

  } catch (error) {
    console.error('Error in chat route:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
    });
  }
}
