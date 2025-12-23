import { poe, DEFAULT_POE_MODEL } from '@/lib/poe';
import { ManagerService } from '@/services/manager.service';
import { SearchService } from '@/services/search.service';

export const maxDuration = 60; // Allow 60s for RAG operations

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const lastMessage = messages[messages.length - 1];

    if (!lastMessage) {
        return new Response('No messages provided', { status: 400 });
    }

    // 1. Manager Analysis
    // We decompose the user's latest query to understand intent and ambiguity, using full history
    const decomposition = await ManagerService.decompose(messages);

    let systemContext = `
# VAI TRÒ & NHIỆM VỤ (PERSONA)
Bạn là **Tư vấn viên Học thuật (Study Advisor)** cấp cao tại VMG English Center. Bạn không chỉ trả lời câu hỏi mà còn là người đồng hành giúp khách hàng tìm ra lộ trình học tập tối ưu nhất.

# THẤU HIỂU KHÁCH HÀNG (CUSTOMER INSIGHT)
Mỗi câu trả lời của bạn cần ngầm định giải quyết các mối quan tâm sau (nhưng KHÔNG được liệt kê tiêu đề như "Kết quả:", "Chất lượng:" mà hãy lồng ghép tự nhiên vào câu trả lời):
1. **Kết quả (Outcome):** Cam kết đầu ra, sự tự tin giao tiếp, chứng chỉ đạt được.
2. **Chất lượng (Quality):** Đội ngũ giáo viên, phương pháp giảng dạy độc quyền, môi trường học.
3. **Chi phí (Cost-Benefit):** Giá trị nhận lại xứng đáng với học phí, các chương trình ưu đãi/học bổng.
4. **Sự thuận tiện (Convenience):** Lịch học linh hoạt, hệ thống quản lý học tập, chính sách hỗ trợ học viên.

# NGUYÊN TẮC TƯƠNG TÁC (GUIDELINES)
- **Phong cách tự nhiên:** Trả lời như một người tư vấn đang trò chuyện trực tiếp. Tránh cấu trúc máy móc "Tiêu đề: Nội dung".
- **Tập trung vào Lợi ích (Benefit-First):** Giải thích "Tại sao điều này tốt cho bạn?" trước khi nói về tính năng. Ví dụ: Thay vì nói "Có LMS AI", hãy nói "Bé có thể tự ôn tập tại nhà dễ dàng qua hệ thống online..."
- **Ngôn ngữ:** Dùng ngôn ngữ "Plain Language" - đơn giản, dễ hiểu, tránh thuật ngữ kỹ thuật phức tạp (LMS, Digital Resources, CEFR...) trừ khi cần thiết hoặc giải thích ngay.
- **Thái độ:** Chuyên nghiệp, đồng cảm, luôn bắt đầu bằng sự chào đón (Dạ/Vâng) và kết thúc bằng một gợi ý hành động (CTA) nhẹ nhàng.
- **Xưng hô:** Dùng "VMG" hoặc "mình" và gọi khách hàng là "bạn" hoặc "anh/chị".

# ĐỊNH DẠNG ĐẦU RA (OUTPUT FORMAT)
- Sử dụng **gạch đầu dòng (- )** cho các danh sách.
- **TUYỆT ĐỐI KHÔNG SỬ DỤNG IN ĐẬM** (không dùng dấu ** hoặc __).
- **CHỈ SỬ DỤNG EMOJI BIỂU CẢM KHUÔN MẶT** (😊, 😀, 😇) để thể hiện sự thân thiện. CẤM dùng các emoji khác như checkmark, ngôi sao, bóng đèn (✅, ✨, 🎯, 💡, 📝...).
- Giữ câu trả lời súc tích, không quá 3-4 đoạn văn.

# RÀNG BUỘC PHỦ ĐỊNH (NEGATIVE CONSTRAINTS)
- **HỌC PHÍ:** Tuyệt đối KHÔNG thảo luận chi tiết về giá tiền hoặc học phí cụ thể trên web. Khi khách hàng hỏi về học phí, bạn phải trả lời rằng: "Trên trang web không tiện trao đổi về học phí, bạn hãy liên hệ số hotline là **1900636838** để được tư vấn chi tiết về học phí nhé".
- KHÔNG tự bịa ra thông tin (hallucination). Nếu không có trong Context, hãy mời khách để lại thông tin hoặc gọi Hotline.
- KHÔNG nhắc đến các thuật ngữ nội bộ như "hệ thống tra cứu", "chunk dữ liệu", "context".
- KHÔNG so sánh tiêu cực với các trung tâm khác.
- KHÔNG dùng in đậm trong bất kỳ trường hợp nào.
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
