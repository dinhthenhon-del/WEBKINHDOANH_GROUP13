/**
 * ============================================================================
 * [THÀNH VIÊN 4 - CUSTOM 2D & CHATBOT AI]
 * Chatbot Controller (modules/chatbot/chatbot.controller.js)  - UC-C09
 * Luồng xử lý một câu hỏi:
 *   1. Đối chiếu từ khóa FAQ (nhanh, không cần key, luôn hoạt động)
 *   2. Nếu không khớp và có cấu hình GEMINI_API_KEY + GEMINI_MODEL trong .env
 *      thì nhờ AI trả lời (gọi từ server, không lộ key ra trình duyệt)
 *   3. Nếu vẫn không có thì trả câu trả lời mặc định kèm gợi ý
 * Chatbot không lưu gì vào database.
 * ============================================================================
 */

const faq = require('./faq');

const MAX_MESSAGE_LENGTH = 500;
const AI_TIMEOUT_MS = 8000;

const SYSTEM_PROMPT =
  'Bạn là trợ lý tư vấn của cửa hàng gốm thủ công Gốm Mộc (làng nghề Bát Tràng). ' +
  'Chỉ trả lời các câu hỏi về gốm sứ, các sản phẩm, thiết kế gốm 2D, đặt hàng và đổi trả. ' +
  'Trả lời bằng tiếng Việt, thân thiện, ngắn gọn (tối đa 4 câu). ' +
  'Không bịa giá, phí vận chuyển hay chính sách. Nếu không chắc, hãy nói bạn chưa có thông tin và gợi ý khách liên hệ cửa hàng. ' +
  'Từ chối nhẹ nhàng các câu hỏi không liên quan đến gốm sứ.';

const DEFAULT_REPLY =
  'Mình chưa có thông tin cho câu hỏi này. Bạn thử hỏi về: thiết kế gốm 2D, sắc men, họa tiết, chữ khắc, thanh toán, đơn hàng hoặc đổi trả nhé.';

// Bỏ dấu tiếng Việt, về chữ thường, bỏ ký tự đặc biệt
function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchFaq(message) {
  const text = ' ' + normalize(message) + ' ';
  let best = null;
  let bestScore = 0;

  for (const item of faq) {
    let score = 0;
    for (const keyword of item.keywords) {
      if (text.includes(' ' + keyword + ' ')) {
        score += keyword.split(' ').length; // cụm dài khớp thì điểm cao hơn
      }
    }
    if (score > bestScore) {
      best = item;
      bestScore = score;
    }
  }
  return best;
}

async function askAI(message) {
  const key = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL; // xem tên model hiện hành trên Google AI Studio
  if (!key || !model) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: 'user', parts: [{ text: message }] }],
          generationConfig: { maxOutputTokens: 300, temperature: 0.4 }
        }),
        signal: controller.signal
      }
    );
    if (!response.ok) return null;

    const data = await response.json();
    const parts = data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts;
    const reply = parts ? parts.map((p) => p.text || '').join('').trim() : '';
    return reply || null;
  } catch (err) {
    return null; // hết giờ hoặc lỗi mạng: quay về câu trả lời mặc định
  } finally {
    clearTimeout(timer);
  }
}

// POST /api/chatbot   body: { message: "..." }
exports.ask = async (req, res) => {
  const message = String((req.body && req.body.message) || '').trim();

  if (!message) {
    return res.status(400).json({ success: false, message: 'Vui lòng nhập câu hỏi.' });
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({ success: false, message: 'Câu hỏi quá dài (tối đa ' + MAX_MESSAGE_LENGTH + ' ký tự).' });
  }

  const hit = matchFaq(message);
  if (hit) {
    return res.json({ success: true, data: { reply: hit.answer, source: 'faq' } });
  }

  const aiReply = await askAI(message);
  if (aiReply) {
    return res.json({ success: true, data: { reply: aiReply, source: 'ai' } });
  }

  return res.json({ success: true, data: { reply: DEFAULT_REPLY, source: 'fallback' } });
};