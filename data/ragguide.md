# CHUẨN HÓA FILE KIẾN THỨC CHO RAG

## 1. Xử lý bảng biểu
- **Không để bảng markdown phức tạp.**
- Chuyển bảng thành danh sách bullet point phân cấp, mỗi dòng là một ý rõ ràng.
- Nếu bảng chỉ có 2 cột (key-value), có thể giữ dạng bảng đơn giản hoặc chuyển thành danh sách.
- Thêm mô tả ngắn phía trên bảng/danh sách để AI hiểu ngữ cảnh.

## 2. Loại bỏ nội dung nhiễu
- Xóa các trang/khối không mang giá trị kiến thức (warm-up, teabreak, slide trình chiếu, số trang, header/footer lặp lại).

## 3. Làm giàu từ khóa
- Bổ sung từ khóa truy vấn vào tiêu đề hoặc đầu mỗi mục lớn (ví dụ: "Lý do chọn Singapore", "Chi phí du học Úc").
- Đặt tiêu đề chứa các từ khóa mà người dùng hay hỏi, tránh tiêu đề quá chung chung.
- Nếu đoạn dài, thêm một câu tóm tắt ngắn ở đầu đoạn.

## 4. Chuẩn hóa định dạng
- Ngày tháng: Luôn dùng định dạng DD/MM/YYYY.
- Viết tắt: Thay thế toàn bộ từ viết tắt chuyên môn bằng từ đầy đủ (ví dụ: PH -> Phụ huynh).
- Đơn vị tiền tệ: Không dùng ký hiệu rút gọn như 2.0M, 1.5M. Luôn ghi rõ "2.000.000 VNĐ (hai triệu đồng)" hoặc "2 triệu VNĐ" để AI không nhầm lẫn.
- Đảm bảo ngôn ngữ nhất quán, không lẫn lộn tiếng Anh/Việt trừ khi là tên riêng.

## 5. Phân cấp thông tin rõ ràng
- Sử dụng các header markdown (#, ##, ###) để phân cấp chủ đề.
- Dùng --- để ngắt các khối kiến thức khác nhau.
- Mỗi mục lớn nên bắt đầu bằng một tiêu đề rõ ràng, giàu từ khóa.

## 6. Làm giàu ngữ cảnh
- Thêm các từ đồng nghĩa, từ khóa liên quan vào đầu mỗi mục lớn.
- Đặt các câu hỏi giả định (FAQ) và trả lời ngay trong file nếu có thể.

## 7. Làm giàu từ khóa song ngữ
Chính xác. Để hệ thống RAG hoạt động hoàn hảo nhất, bạn nên áp dụng quy tắc "Thuật ngữ tiếng Anh (Giải nghĩa tiếng Việt)" hoặc ngược lại.

Việc này giúp hệ thống của bạn có độ phủ từ khóa (Keyword Coverage) gấp đôi. Dưới đây là lý do và cách làm cụ thể:

1. Tại sao phải làm vậy?

• Khớp với mọi kiểu truy vấn: Nhân viên có thể hỏi "Thư mời nhập học là gì?" hoặc "LOA là gì?". Nếu tài liệu có cả hai, AI sẽ tìm thấy ngay lập tức mà không cần suy luận.
• Tăng độ chính xác cho Embedding: Các model Embedding (như của OpenAI) hiểu rất rõ mối liên hệ giữa "Letter of Acceptance" và "Thư mời nhập học". Khi bạn đặt chúng cạnh nhau, "vùng không gian vector" của đoạn văn đó sẽ trở nên cực kỳ mạnh mẽ cho cả hai ngôn ngữ.

2. Cách viết tối ưu trong file Markdown:

Nên viết theo các mẫu sau để AI dễ trích xuất:

• Mẫu 1 (Ưu tiên tiếng Việt): Thư chấp nhận nhập học (Letter of Acceptance - LOA)
• Mẫu 2 (Thuật ngữ chuyên ngành): Chứng minh tài chính (Financial Proof/Demonstration)
• Mẫu 3 (Chương trình học): Trại hè tiếng Anh (English Summer Camp)

**Lưu ý:**
- Mục tiêu là để AI tìm kiếm và trả lời chính xác, không bị nhầm lẫn do cấu trúc bảng, tiêu đề mơ hồ hoặc nội dung nhiễu.
- Sau khi chỉnh sửa, nên review lại toàn bộ file để đảm bảo không còn bảng markdown phức tạp và các tiêu chí trên đã được đáp ứng.
