import OpenAI from 'openai';
const client = new OpenAI({ apiKey: process.env.INCEPTION_API_KEY, baseURL: 'https://api.inceptionlabs.ai/v1' });
const res = await client.chat.completions.create({
  model: process.env.INCEPTION_MODEL,
  stream: false,
  extra_body: { reasoning_effort: process.env.INCEPTION_MODEL_EFFORT },
  messages: [
    { role: 'system', content: 'Bạn là chuyên gia tạo câu hỏi thường gặp (FAQ).\nNhiệm vụ: Dựa trên đoạn văn bản được cung cấp, tạo ra tối đa 5 cặp hỏi-đáp (Q&A).\nTrả về JSON theo định dạng:\n{"pairs": [{"question": "...", "answer": "..."}, ...]}' },
    { role: 'user', content: 'Tiêu đề: VMG English\n\nNội dung: Trung tâm Anh ngữ VMG thành lập năm 2010, chuyên đào tạo tiếng Anh cho trẻ em và người đi làm.' },
  ],
});
console.log('RAW CONTENT:', JSON.stringify(res.choices[0].message.content));
console.log('FINISH REASON:', res.choices[0].finish_reason);
console.log('USAGE:', JSON.stringify(res.usage));
