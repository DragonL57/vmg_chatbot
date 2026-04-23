# VMG MATE - Multi-Agent Tooling Ecosystem

**Version: 3.0.0** — Hệ sinh thái cộng tác thông minh dựa trên Agentic RAG và Multi-Agent Orchestration.

## 🌟 Tầm nhìn "Mate Vibe"
**VMG MATE** (Multi-Agent Tooling Ecosystem) là một người đồng hành kỹ thuật số chuyên nghiệp, có độ tin cậy cao, được thiết kế riêng cho cán bộ nhân viên VMG English Center. Hệ thống không chỉ trả lời câu hỏi mà còn chủ động phân tích, định tuyến và cung cấp bằng chứng xác thực từ kho dữ liệu nội bộ.

## 🚀 Tính năng nổi bật

### 1. Agentic RAG (Advanced)
- **Semantic Router**: Tự động phân loại và định tuyến câu hỏi tới đúng kho tri thức (ESL, Du học, HR, v.v.).
- **Chit-Chat Detection**: Phản hồi tức thì các câu chào hỏi xã giao, tối ưu chi phí và tốc độ.
- **Evidence Grading**: Chỉ cung cấp thông tin khi có bằng chứng xác thực từ tài liệu.

### 2. Enterprise Security
- **Google OAuth**: Đăng nhập tập trung bằng tài khoản tổ chức.
- **Domain Restriction**: Chỉ cho phép email `@vmg.edu.vn`.
- **Role-Based Access (RBAC)**: Phân quyền Admin, Staff và User chặt chẽ.

### 3. Trải nghiệm "Cộng sự" (Mate UX)
- **Persistent History**: Lưu trữ và đồng bộ hội thoại theo người dùng.
- **Auto-Titling**: Tự động đặt tên hội thoại thông minh bằng AI.
- **Management**: Gắn dấu sao (Star), đổi tên và xóa hội thoại linh hoạt.

## 🛠 Hướng dẫn thiết lập (Developer)

### Yêu cầu hệ thống
- Node.js 20+
- PNPM 10+
- Supabase Project (Transaction Pooler enabled)

### Cài đặt
1. Clone repository và cài đặt thư viện:
```bash
pnpm install
```

2. Cấu hình biến môi trường (`.env.local`):
   - Sử dụng **Port 6543** cho `DATABASE_URL` (Supabase Transaction Pooler).
   - Đảm bảo `LLM_PROVIDER="inception"` hoặc `"poe"`.

3. Khởi tạo cơ sở dữ liệu:
```bash
npm run db:push
npm run db:migrate
```

4. Chạy môi trường phát triển:
```bash
pnpm dev
```

---
**VMG MATE** — *Your Intelligent Partner for a Smarter Workspace.*
Copyright 2026 VMG English Center.
