/**
 * ============================================================================
 * [THÀNH VIÊN 4 - CUSTOM 2D & CHATBOT AI]
 * Widget Chatbot AI Tư vấn Gốm Bát Tràng (modules/chatbot/tv4_chatbot.js) - UC-C09
 * 
 * Tính năng chính:
 * 1. Tích hợp Google Gemini AI từ Google AI Studio (nhập & quản lý API Key ngay trên khung chat).
 * 2. Lưu trữ API Key an toàn trong LocalStorage để dùng lâu dài.
 * 3. Nạp toàn bộ tài liệu tri thức mẫu của Xưởng (Studio 2D, 5 dáng phôi, 5 sắc men,
 *    quy chuẩn 20 ký tự khắc chữ UC-C04 E1, chính sách đổi trả 7 ngày, quy trình nung 1.300°C...).
 * 4. Luôn điều hướng người dùng đến các tác phẩm gốm sứ tinh hoa của xưởng.
 * 5. Khi khách hàng hỏi ngoài lề, AI trả lời lịch sự ngắn gọn rồi khéo léo chuyển hướng về gốm sứ.
 * 6. Hỗ trợ bộ nhớ hội thoại đa lượt (multi-turn memory) và định dạng Markdown sắc nét.
 * ============================================================================
 */

(function (window, document) {
  'use strict';

  var ROOT_ID = 'tv4-chatbot';
  var STORAGE_KEY = 'bat_trang_gemini_api_key';
  var MAX_LEN = 500;
  var GEMINI_MODELS = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'];

  // HỆ THỐNG TRI THỨC MẪU CỐT LÕI CỦA LÀNG GỐM THANH XUÂN (GỐM MỘC BÁT TRÀNG)
  var SYSTEM_KNOWLEDGE_INSTRUCTION = `Bạn là "Trợ lý Nghệ nhân AI" cao cấp của Làng Gốm Thanh Xuân (hội tụ tinh hoa Gốm Mộc Bát Tràng - làng cổ Bát Tràng, Gia Lâm, Hà Nội).

TÀI LIỆU TRI THỨC VÀ QUY CHUẨN XƯỞNG GỐM (DỰA VÀO ĐÂY ĐỂ TRẢ LỜI):
1. Không Gian Trưng Bày & Địa Chỉ:
- Cơ sở 1 (Lò Bầu Di Sản & Xưởng Chế Tác): Thôn 1 Giang Cao, Làng Cổ Bát Tràng, Gia Lâm, Hà Nội (Có bãi đỗ ô tô miễn phí, trải nghiệm vuốt nặn gốm và tham quan lò nung củi 1.380°C).
- Cơ sở 2 (Bảo Phủ Giám Tuyển - Showroom Phố Cổ): Tầng 2, 24 Tràng Tiền, Quận Hoàn Kiếm, Hà Nội (Không gian thưởng trà, chiêm ngưỡng ngự tác gốm sứ độc bản).
- Giờ mở cửa: 08:30 – 21:00 hàng ngày (kể cả Thứ 7, Chủ Nhật và ngày Lễ Tết).
- Tổng đài nghệ nhân 24/7: 1800 1705 (Miễn phí cước gọi).
- Email: Thuongkhach@langgomthanhxuan.vn / hotro@gomthanhxuan.vn.

2. Danh Mục Sản Phẩm Đa Dạng Của Shop:
- Bộ bàn ăn & Bát đĩa gia đình: Bộ đồ ăn Jasmine Thạch Vân 09 món (988.200₫), 22 món (1.710.720₫), Jasmine Chỉ Vàng (911.520₫), chén cơm (63.000₫), tô thố men ngọc.
- Bộ ấm chén trà đạo: Bộ trà Camellia Chỉ Vàng, Bộ ấm chén Men Rạn bọc đồng cổ, Tách trà hoàng gia có nắp (380.000₫).
- Bình hút lộc & Bình hoa phong thủy: Mai Bình Dáng Cao (2.850.000₫ - hút tài lộc phong thủy), Bình Hoa Tròn Cổ Sóng (1.850.000₫ - thanh nhã phòng trà), Bình Men Hỏa Biến 1.380°C kỳ ảo độc bản.
- Đĩa sứ nghệ thuật: Đĩa Sứ Trưng Bày kèm giá gỗ tiện cao cấp (1.200.000₫ - vẽ hoa sen, phố cổ, rồng phượng).
- Quà tặng doanh nghiệp & Ngoại giao: Chế tác theo yêu cầu, in logo thương hiệu, mạ dát vàng 24K, hộp xi lụa lót nhung cao cấp, chiết khấu hấp dẫn theo số lượng.

3. Phân Hệ Studio Tự Thiết Kế Gốm 2D (UC-C04):
- 5 bước tự phối tác phẩm: Chọn 1 trong 5 dáng phôi thủ công -> Chọn 1 trong 13 mẫu vẽ tay truyền thống -> Căn chỉnh 360 độ (phóng to/thu nhỏ 25%-150%) -> Khắc chữ nghệ thuật -> Thêm vào giỏ.
- QUY ĐỊNH CHỮ KHẮC NGHỆ THUẬT (Chuẩn UC-C04 E1): Giới hạn TỐI ĐA 20 KÝ TỰ (để nét chữ thanh thoát mỹ thuật trên đường cong phôi gốm, không che khuất họa tiết chính).

4. 5 Sắc Men Danh Tiếng Bát Tràng:
- Men Lam (thế kỷ XIV, xanh cobalt vĩnh cửu), Men Rạn (vân rạn tự nhiên thời Lê - Nguyễn), Men Ngọc Celadon (xanh ngọc thạch hoàng cung), Men Hỏa Biến (nung củi 1.380°C liên tục 72 giờ), Dát Vàng Kim Sa (vàng ròng 24K phú quý).

5. Chính Sách Bán Hàng & Hậu Mãi:
- Thanh toán: COD đồng kiểm tận tay (mở hộp kiểm tra trước khi trả tiền), QR VietQR, thẻ ngân hàng.
- Giao hàng: Hàng sẵn 2-3 ngày, hàng 2D chế tác 5-7 ngày. Giao toàn quốc bọc chống sốc 3 lớp.
- Chính sách đổi trả (UC-A05, UC-C08): Đổi mới 100% trong vòng 7 ngày nếu nứt vỡ do vận chuyển (chỉ cần quay video lúc khui kiện).

QUY TẮC CỐT LÕI BẮT BUỘC VỀ PHONG THÁI TRẢ LỜI:
1. TRẢ LỜI NGẮN GỌN & SÚC TÍCH: Chỉ trả lời đúng trọng tâm trong khoảng 2 ĐẾN 4 CÂU (hoặc 2-3 gạch đầu dòng ngắn). Tuyệt đối KHÔNG viết dài lê thê để khách hàng đọc nhanh và thoải mái trên khung chat.
2. PHONG PHÚ & CHỦ ĐỘNG GỢI MỞ: Tùy ý khách, linh hoạt giới thiệu sản phẩm phù hợp và LUÔN KẾT THÚC BẰNG 1 CÂU HỎI GỢI MỞ TINH TẾ (Ví dụ: hỏi khách cần tìm ấm trà hay bình hút lộc, dùng cho gia đình hay làm quà tặng, dự định ghé thăm cơ sở Bát Tràng hay Tràng Tiền...).
3. KHI KHÁCH HỎI NGOÀI LỀ (toán, lập trình, thời tiết, chuyện vui...): Trả lời nhã nhặn trong 1 câu, sau đó khéo léo chuyển hướng về các tuyệt tác gốm sứ Bát Tràng.`;

  var SUGGESTIONS = [
    'Địa chỉ showroom & xưởng gốm?',
    'Shop có những sản phẩm gì?',
    'Làm sao để tự thiết kế gốm 2D?',
    'Chữ khắc tối đa bao nhiêu ký tự?',
    'Bảng giá 5 dáng phôi gốm 2D?',
    'Quà tặng doanh nghiệp in logo?',
    'Các sắc men Bát Tràng có gì khác nhau?',
    'Chính sách đổi trả hàng nứt vỡ?'
  ];

  var el = {};
  var busy = false;
  var chatHistory = []; // Bộ nhớ hội thoại đa lượt cho AI

  // ---------------------------------------------------------------- Tiện ích DOM & Markdown
  function make(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function cleanApiKey(key) {
    if (!key) return '';
    return String(key).trim().replace(/^['"`\s]+|['"`\s]+$/g, '');
  }

  function getApiKey() {
    try {
      return cleanApiKey(localStorage.getItem(STORAGE_KEY) || '');
    } catch (e) {
      return '';
    }
  }

  function saveApiKey(key) {
    key = cleanApiKey(key);
    if (!key) return false;
    try {
      localStorage.setItem(STORAGE_KEY, key);
      updateKeyUIState();
      return true;
    } catch (e) {
      return false;
    }
  }

  function clearApiKey() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      updateKeyUIState();
    } catch (e) {}
  }

  function formatMarkdown(text) {
    if (!text) return '';
    var escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // In đậm **nội dung**
    var html = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // In nghiêng *nội dung*
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Inline code `code`
    html = html.replace(/`(.*?)`/g, '<code class="bg-stone-100 text-stone-800 px-1 py-0.5 rounded text-xs">$1</code>');
    // Gạch đầu dòng
    html = html.replace(/(?:^|\n)[•\-\*]\s+(.+)/g, '<div class="flex items-start gap-1.5 my-1"><span class="text-[#8B4513] shrink-0 mt-0.5">•</span><span>$1</span></div>');
    // Đoạn văn & xuống dòng
    html = html.replace(/\n\n/g, '<div class="h-2"></div>');
    html = html.replace(/\n/g, '<br>');
    return html;
  }

  // ---------------------------------------------------------------- Giao diện Tin nhắn
  function addMessage(role, text, opts) {
    var isUser = role === 'user';
    var bubble = make('div', isUser
      ? 'ml-auto max-w-[85%] bg-[#0a2540] text-white rounded-2xl rounded-br-sm px-3.5 py-2.5 text-sm whitespace-pre-line break-words shadow-sm leading-relaxed animate-fadeIn'
      : 'mr-auto max-w-[88%] bg-white border border-stone-200 text-stone-800 rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-sm break-words shadow-xs leading-relaxed animate-fadeIn');

    if (isUser) {
      bubble.textContent = text;
    } else {
      bubble.innerHTML = formatMarkdown(text);
    }

    if (opts && opts.isError) {
      bubble.classList.add('border-red-200', 'bg-red-50/70', 'text-red-900');
    }

    if (opts && opts.showKeyBtn) {
      var keyActionBtn = make('button', 'mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-[#8B4513] hover:bg-[#6e350d] px-3 py-1.5 rounded-lg shadow-xs cursor-pointer transition-colors', '🔑 Cấu hình Google AI Key');
      keyActionBtn.type = 'button';
      keyActionBtn.addEventListener('click', function () {
        openKeyTray();
      });
      bubble.appendChild(keyActionBtn);
    }

    if (opts && opts.retry) {
      var retry = make('button', 'block mt-2 text-xs font-semibold text-[#8B4513] hover:underline cursor-pointer', 'Thử lại');
      retry.type = 'button';
      retry.addEventListener('click', function () {
        if (bubble.parentNode) bubble.parentNode.removeChild(bubble);
        send(opts.retry, true);
      });
      bubble.appendChild(retry);
    }

    el.messages.appendChild(bubble);
    el.messages.scrollTop = el.messages.scrollHeight;
    return bubble;
  }

  function setBusy(value) {
    busy = value;
    el.send.disabled = value;
    el.send.classList.toggle('opacity-50', value);
    el.input.disabled = value;
  }

  // ---------------------------------------------------------------- Bộ Tri thức Nghệ nhân AI Nội bộ (Dự phòng thông minh)
  function generateLocalKnowledgeReply(userText) {
    var raw = (userText || '').toLowerCase().trim();
    var norm = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');

    // 1. Địa chỉ, Showroom, Xưởng, Bản đồ, Giờ mở cửa, Đến thăm, Đỗ xe
    if (norm.includes('dia chi') || norm.includes('o dau') || norm.includes('showroom') || norm.includes('cua hang') || norm.includes('den xem') || norm.includes('gio mo cua') || norm.includes('vi tri') || norm.includes('ban do') || norm.includes('do xe') || norm.includes('lo bau')) {
      return 'Dạ, Làng Gốm Thanh Xuân trân trọng đón tiếp quý khách tại 2 không gian di sản:\n\n• **Cơ sở 1 (Lò Bầu Di Sản & Xưởng):** Thôn 1 Giang Cao, Bát Tràng, Gia Lâm, HN *(có bãi đỗ ô tô miễn phí, trải nghiệm vuốt nặn gốm lò củi 1.380°C)*.\n• **Cơ sở 2 (Bảo Phủ Giám Tuyển):** Tầng 2, 24 Tràng Tiền, Hoàn Kiếm, HN *(thưởng trà & ngắm các ngự tác độc bản)*.\n\n*Giờ mở cửa: 08:30 – 21:00 hàng ngày (Hotline: 1800 1705)*. Quý khách dự định ghé thăm cơ sở nào để em chuẩn bị đón tiếp chu đáo ạ?';
    }

    // 2. Sản phẩm của shop / Có những loại gì / Danh mục mặt hàng
    if (norm.includes('san pham') || norm.includes('co nhung gi') || norm.includes('ban gi') || norm.includes('danh muc') || norm.includes('loai nao') || norm.includes('mat hang') || norm.includes('bo do an') || norm.includes('am chen') || norm.includes('bat dia')) {
      return 'Dạ, xưởng hiện có 4 dòng sản phẩm gốm sứ nghệ thuật tiêu biểu:\n\n• **Bộ đồ ăn cao cấp:** Bát đĩa Jasmine Thạch Vân, viền Chỉ Vàng (set 9 – 22 món, chén cơm từ 63k).\n• **Bộ ấm chén trà đạo:** Bộ trà Camellia, ấm men rạn bọc đồng, tách hoàng gia có nắp (380k).\n• **Bình phong thủy & Bình hoa:** Mai bình hút lộc (2.850k), bình hoa cổ sóng (1.850k), bình men hỏa biến.\n• **Studio 2D tự thiết kế:** Tự tay phối phôi và khắc chữ nghệ thuật theo bản vẽ riêng.\n\nQuý khách đang tìm sản phẩm để dùng cho gia đình, bài trí phong thủy hay làm quà tặng ạ?';
    }

    // 3. Quà tặng doanh nghiệp / Sự kiện / In logo
    if (norm.includes('qua tang') || norm.includes('doanh nghiep') || norm.includes('in logo') || norm.includes('so luong lon') || norm.includes('chiet khau') || norm.includes('su kien') || norm.includes('dai hoi')) {
      return 'Dạ, xưởng chuyên chế tác **Quà tặng doanh nghiệp & Ngoại giao** cao cấp:\n\n• In logo thương hiệu, khắc niên hiệu, mạ dát vàng kim sa 24K tinh xảo.\n• Đóng hộp xi lụa lót nhung sang trọng kèm chứng thư bảo vật độc bản.\n• Chiết khấu hấp dẫn theo số lượng và hỗ trợ chế tác mẫu duyệt trước.\n\nQuý khách dự kiến đặt cho sự kiện nào hoặc cần số lượng khoảng bao nhiêu bộ để em gửi mẫu thiết kế phù hợp ạ?';
    }

    // 4. Lời chào, biểu cảm vui vẻ (Ha ha, hihi, cười, xin chào, hello...)
    if (/^(ha\s*)+$/i.test(raw) || /^(hi\s*)+$/i.test(raw) || raw.includes('haha') || raw.includes('hihi') || raw.includes('cười') || raw.includes('vui') || norm.includes('xin chao') || norm.includes('hello') || norm === 'hi' || norm === 'alo' || norm.includes('ban la ai') || norm.includes('tro ly')) {
      return 'Dạ, tiếng cười hoan hỷ của quý khách làm xưởng gốm Thanh Xuân thêm phần rộn rã! Chúc quý khách một ngày an vui, vạn sự cát tường.\n\nNhân lúc vui vẻ, quý khách có muốn ngắm các mẫu bình hút tài lộc phong thủy hay thử tự tay thiết kế bình gốm 2D khắc chữ riêng của mình không ạ?';
    }

    // 5. Chữ khắc tối đa bao nhiêu ký tự & Quy chuẩn khắc chữ UC-C04 E1
    if (norm.includes('chu khac') || norm.includes('bao nhieu ky tu') || norm.includes('gioi han ky tu') || norm.includes('khac chu') || norm.includes('20 ky tu')) {
      return 'Dạ, theo quy chuẩn nghệ thuật của xưởng (**Chuẩn UC-C04 E1**):\n\n• Chữ khắc nghệ thuật được giới hạn **TỐI ĐA 20 KÝ TỰ** (bao gồm khoảng trắng và số).\n• **Lý do nghệ nhân:** Đường cong phôi gốm đòi hỏi chữ khắc phải thanh thoát, cân đối mỹ thuật thị giác và không che khuất họa tiết chính.\n\nQuý khách dự định khắc tên, lời chúc hay niên hiệu kỷ niệm gì trên tác phẩm ạ?';
    }

    // 6. Hướng dẫn tự thiết kế gốm 2D
    if (norm.includes('tu thiet ke') || norm.includes('studio 2d') || norm.includes('lam sao de') || norm.includes('cach thiet ke') || norm.includes('2d')) {
      return 'Dạ, để tự tạo tác phẩm độc bản trên phân hệ **Studio 2D (UC-C04)**, quý khách chỉ cần 5 bước:\n\n1. **Chọn phôi:** Mai bình, Bình hoa cổ sóng, Ấm trà, Đĩa sứ hoặc Tách trà.\n2. **Chọn họa tiết:** 13 mẫu vẽ tay truyền thống (Sen lam, Rồng mây, Song ngư...).\n3. **Căn chỉnh:** Kéo chuột xoay 360 độ, phóng to thu nhỏ (25% - 150%).\n4. **Khắc chữ:** Nhập lời chúc tối đa 20 ký tự.\n5. **Thêm vào giỏ:** Nghệ nhân sẽ nung củi 1.380°C và hoàn thiện trong 5 - 7 ngày.\n\nQuý khách muốn thử tạo mẫu trên dáng Mai bình hay Bình hoa tròn cổ sóng ạ?';
    }

    // 7. Bảng giá 5 dáng phôi Studio 2D
    if (norm.includes('gia') || norm.includes('bao nhieu tien') || norm.includes('bang gia') || norm.includes('phoi') || norm.includes('mai binh') || norm.includes('binh hoa')) {
      return 'Dạ, xưởng xin gửi quý khách **Bảng giá 5 dáng phôi thủ công Studio 2D**:\n\n• **Mai Bình Dáng Cao:** 2.850.000₫ (Hút tài lộc phong thủy)\n• **Bình Hoa Tròn Cổ Sóng:** 1.850.000₫ (Thanh nhã phòng trà)\n• **Ấm Trà Sứ Trắng:** 1.450.000₫ (Thấu quang cao cấp)\n• **Đĩa Sứ Nghệ Thuật (Kèm giá gỗ):** 1.200.000₫\n• **Tách Trà Có Nắp Hoàng Gia:** 380.000₫\n\nQuý khách ưng ý dáng phôi nào để em mở ngay giao diện thiết kế 2D hỗ trợ mình ạ?';
    }

    // 8. 5 Sắc men danh tiếng
    if (norm.includes('men') || norm.includes('sac men') || norm.includes('men lam') || norm.includes('men ran') || norm.includes('hoa bien') || norm.includes('celadon') || norm.includes('dat vang')) {
      return 'Dạ, xưởng sở hữu **5 sắc men danh tiếng Bát Tràng**:\n\n• **Men Lam:** Xanh cobalt cổ kính thế kỷ XIV, nét vẽ ẩn dưới men vĩnh cửu.\n• **Men Rạn:** Đường rạn tự nhiên gia truyền thời Lê - Nguyễn độc bản.\n• **Men Ngọc Celadon:** Sắc xanh ngọc bích mịn màng hoàng cung.\n• **Men Hỏa Biến:** Biến ảo kỳ diệu từ ngọn lửa lò nung củi 1.380°C.\n• **Dát Vàng Kim Sa:** Điểm xuyết vàng ròng 24K vương giả, thịnh vượng.\n\nQuý khách chuộng vẻ cổ kính của Men Rạn hay nét sang trọng của Dát Vàng 24K ạ?';
    }

    // 9. Thanh toán, vận chuyển & Đổi trả 7 ngày
    if (norm.includes('thanh toan') || norm.includes('giao hang') || norm.includes('doi tra') || norm.includes('nut vo') || norm.includes('bao hanh') || norm.includes('ship')) {
      return 'Dạ, chính sách mua sắm tại xưởng cam kết an tâm tuyệt đối:\n\n• **Giao hàng toàn quốc:** Bọc chống sốc 3 lớp, thượng khách được **đồng kiểm mở hộp** trước khi thanh toán (COD).\n• **Đổi trả (UC-A05, UC-C08):** Đổi mới 100% trong **7 ngày** nếu nứt vỡ do vận chuyển (chỉ cần quay video lúc khui kiện).\n• **Tổng đài nghệ nhân 24/7:** 1800 1705 (miễn cước gọi).';
    }

    // 10. Bảo quản gốm sứ
    if (norm.includes('bao quan') || norm.includes('ve sinh') || norm.includes('rua') || norm.includes('lau')) {
      return 'Dạ, để đồ gốm luôn sáng bóng và bền đẹp:\n\n• Vệ sinh bằng nước ấm pha giấm trắng dịu nhẹ và khăn vải mềm/bọt biển.\n• Tuyệt đối không dùng bùi nhùi sắt ráp cọ xát làm xước men và bong vàng dát.\n• Tránh làm gốm bị sốc nhiệt độ đột ngột.\n\nQuý khách cần tư vấn bảo quản dòng gốm men bóng hay gốm dát vàng ạ?';
    }

    // 11. Khi khách hỏi ngoài vấn đề (toán, lập trình, thời tiết, đời sống...)
    return 'Dạ, câu hỏi của quý khách thật thú vị! Dù ngày đêm gắn bó cùng đất sét và lửa lò nung 1.380°C, em thấy điều gì trong cuộc sống cũng cần sự tinh tế, bền bỉ hệt như cách người nghệ nhân chuốt nên từng dáng gốm Bát Tràng.\n\nNhân duyên gặp gỡ, em mời quý khách cùng ngắm nhìn những tác phẩm gốm mộc tinh hoa của xưởng hoặc thử tự tay thiết kế bình gốm 2D nhé ạ! Quý khách thích dòng bình phong thủy hay bộ ấm chén thưởng trà ạ?';
  }

  // ---------------------------------------------------------------- Gọi API Google Gemini & Fallback
  async function callGeminiAI(userText) {
    var apiKey = cleanApiKey(getApiKey());
    if (!apiKey) {
      throw new Error('MISSING_API_KEY');
    }

    if (apiKey.length < 15) {
      throw new Error('INVALID_API_KEY: Khóa Google AI Studio API Key quá ngắn hoặc không đúng định dạng!');
    }

    // Xây dựng contents cho Gemini API (đa lượt)
    var contents = [];
    var recentTurns = chatHistory.slice(-6); // Lấy tối đa 6 lượt gần nhất
    for (var i = 0; i < recentTurns.length; i++) {
      contents.push({
        role: recentTurns[i].role === 'user' ? 'user' : 'model',
        parts: [{ text: recentTurns[i].text }]
      });
    }
    contents.push({
      role: 'user',
      parts: [{ text: userText }]
    });

    var payload = {
      system_instruction: {
        parts: [{ text: SYSTEM_KNOWLEDGE_INSTRUCTION }]
      },
      contents: contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024
      }
    };

    // 1. Thử gọi trực tiếp Google Gemini API từ trình duyệt (timeout 8 giây)
    for (var m = 0; m < GEMINI_MODELS.length; m++) {
      var modelName = GEMINI_MODELS[m];
      var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + modelName + ':generateContent?key=' + encodeURIComponent(apiKey);

      var controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
      var timeoutId = controller ? setTimeout(function () { controller.abort(); }, 8000) : null;

      try {
        var response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey
          },
          body: JSON.stringify(payload),
          signal: controller ? controller.signal : undefined
        });

        if (timeoutId) clearTimeout(timeoutId);

        if (response.status === 404) {
          continue;
        }

        var resData = await response.json();

        if (!response.ok) {
          var errMsg = (resData && resData.error && resData.error.message) || ('Lỗi Google AI (' + response.status + ')');
          var reason = resData && resData.error && resData.error.details && resData.error.details[0] && resData.error.details[0].reason;
          if (response.status === 400 && (reason === 'API_KEY_INVALID' || errMsg.includes('API key') || errMsg.includes('API_KEY_INVALID') || errMsg.includes('not valid'))) {
            throw new Error('INVALID_API_KEY: ' + errMsg);
          }
          if (response.status === 429) {
            throw new Error('RATE_LIMITED: ' + errMsg);
          }
          continue;
        }

        var candidate = resData && resData.candidates && resData.candidates[0];
        var parts = candidate && candidate.content && candidate.content.parts;
        var replyText = '';
        if (Array.isArray(parts)) {
          replyText = parts.map(function (p) { return p.text || ''; }).join('\n').trim();
        }

        if (replyText) {
          chatHistory.push({ role: 'user', text: userText });
          chatHistory.push({ role: 'model', text: replyText });
          return replyText;
        }

        if (candidate && candidate.finishReason === 'SAFETY') {
          var safeReply = 'Dạ, câu hỏi trên có yếu tố chưa phù hợp tiêu chuẩn an toàn của Google Gemini. Em xin phép mời quý khách cùng quay trở lại tìm hiểu các dáng phôi gốm sứ Bát Tràng và nghệ thuật men lam, men rạn truyền thống nhé ạ!';
          chatHistory.push({ role: 'user', text: userText });
          chatHistory.push({ role: 'model', text: safeReply });
          return safeReply;
        }
      } catch (err) {
        if (timeoutId) clearTimeout(timeoutId);
        if (err.message && (err.message.includes('INVALID_API_KEY') || err.message === 'MISSING_API_KEY')) {
          throw err;
        }
      }
    }

    // 2. Thử gọi qua Backend Proxy (/api/chatbot) nếu client fetch bị chặn mạng quốc tế / CORS
    try {
      var backendUrls = ['/api/chatbot', 'http://localhost:5000/api/chatbot', 'http://127.0.0.1:5000/api/chatbot'];
      for (var b = 0; b < backendUrls.length; b++) {
        try {
          var bCtrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
          var bTimeout = bCtrl ? setTimeout(function () { bCtrl.abort(); }, 6000) : null;
          var bRes = await fetch(backendUrls[b], {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: userText,
              apiKey: apiKey,
              history: chatHistory
            }),
            signal: bCtrl ? bCtrl.signal : undefined
          });
          if (bTimeout) clearTimeout(bTimeout);
          if (bRes.ok) {
            var bData = await bRes.json();
            var bReply = bData && bData.data && bData.data.reply;
            if (bReply) {
              chatHistory.push({ role: 'user', text: userText });
              chatHistory.push({ role: 'model', text: bReply });
              return bReply;
            }
          }
        } catch (bErr) {
          // Bỏ qua thử endpoint tiếp theo
        }
      }
    } catch (proxyErr) {}

    // 3. Fallback thông minh: Dùng Bộ Tri thức Nghệ nhân Bát Tràng nội bộ nếu Google AI bị chậm / mất mạng
    var fallbackReply = generateLocalKnowledgeReply(userText);
    chatHistory.push({ role: 'user', text: userText });
    chatHistory.push({ role: 'model', text: fallbackReply });
    return fallbackReply + '\n\n*(💡 Phản hồi từ Kho tri thức Nghệ nhân Bát Tràng)*';
  }

  // ---------------------------------------------------------------- Xử lý gửi tin nhắn
  async function send(text, isRetry) {
    text = (text || '').trim();
    if (!text || busy) return;
    if (text.length > MAX_LEN) text = text.slice(0, MAX_LEN);

    var apiKey = getApiKey();
    if (!apiKey) {
      if (!isRetry) addMessage('user', text);
      el.input.value = '';
      openKeyTray();
      addMessage('bot', 'Kính xin quý khách dán **Google AI Studio API Key** vào khung cấu hình phía trên để kích hoạt Trợ lý Nghệ nhân AI phản hồi nhé ạ!\n\n*(Quý khách có thể bấm liên kết phía trên để lấy API Key hoàn toàn miễn phí từ Google)*', {
        showKeyBtn: true
      });
      return;
    }

    if (!isRetry) addMessage('user', text);
    el.input.value = '';
    setBusy(true);

    // Indicator đang suy nghĩ với animation mượt
    var typing = make('div', 'mr-auto max-w-[85%] bg-white border border-stone-200 text-stone-500 rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-xs flex items-center gap-2 shadow-xs');
    typing.innerHTML = '<span class="material-symbols-outlined text-[16px] text-amber-700 animate-spin">progress_activity</span><span>Nghệ nhân AI đang tra cứu tri thức & suy nghĩ...</span>';
    el.messages.appendChild(typing);
    el.messages.scrollTop = el.messages.scrollHeight;

    try {
      var aiReply = await callGeminiAI(text);
      if (typing.parentNode) typing.parentNode.removeChild(typing);
      addMessage('bot', aiReply);
    } catch (err) {
      if (typing.parentNode) typing.parentNode.removeChild(typing);
      var errStr = String(err.message || err);
      console.error('Lỗi Gemini Chatbot:', err);

      if (errStr.includes('INVALID_API_KEY')) {
        addMessage('bot', '⚠️ **Google AI Studio API Key không hợp lệ hoặc đã hết hạn!**\n\nKính xin quý khách kiểm tra hoặc dán lại API Key chuẩn xác từ Google AI Studio (bắt đầu bằng ký tự `AIzaSy...`).', {
          isError: true,
          showKeyBtn: true
        });
        openKeyTray();
      } else if (errStr.includes('MISSING_API_KEY')) {
        addMessage('bot', 'Kính xin quý khách dán Google AI Studio API Key vào ô cấu hình phía trên để bắt đầu trò chuyện ạ!', {
          showKeyBtn: true
        });
        openKeyTray();
      } else if (errStr.includes('RATE_LIMITED')) {
        addMessage('bot', '⚠️ **Google AI Studio API Key tạm thời vượt hạn mức (Quota)!**\n\nQuý khách vui lòng đợi 1 phút hoặc thử lại sau nhé ạ.', {
          isError: true,
          retry: text
        });
      } else {
        // Fallback tức thì để khách hàng không bao giờ bị gián đoạn hay kẹt lỗi
        var quickReply = generateLocalKnowledgeReply(text);
        addMessage('bot', quickReply + '\n\n*(💡 Phản hồi từ Kho tri thức Nghệ nhân Bát Tràng)*');
      }
    } finally {
      setBusy(false);
      el.input.focus();
    }
  }

  // ---------------------------------------------------------------- Quản lý Khay cấu hình API Key
  function openKeyTray() {
    el.keyTray.classList.remove('hidden');
    el.keyInput.focus();
    el.trayToggleIcon.textContent = 'expand_less';
  }

  function closeKeyTray() {
    el.keyTray.classList.add('hidden');
    el.trayToggleIcon.textContent = 'expand_more';
  }

  function toggleKeyTray() {
    if (el.keyTray.classList.contains('hidden')) {
      openKeyTray();
    } else {
      closeKeyTray();
    }
  }

  function updateKeyUIState() {
    var key = getApiKey();
    var hasKey = Boolean(key);

    if (el.keyBadge) {
      el.keyBadge.className = 'absolute top-1 right-1 w-2 h-2 rounded-full ' + (hasKey ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse');
    }
    if (el.headerAvatarBadge) {
      el.headerAvatarBadge.className = 'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-[#0a2540] ' + (hasKey ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse');
    }
    if (el.keyStatus) {
      el.keyStatus.textContent = hasKey ? '● AI Gemini sẵn sàng' : '○ Chưa nhập Key';
      el.keyStatus.className = 'text-[11px] ' + (hasKey ? 'text-emerald-700 font-semibold' : 'text-amber-700 font-medium');
    }
    if (el.removeKeyBtn) {
      el.removeKeyBtn.classList.toggle('hidden', !hasKey);
    }
    if (el.keyInput) {
      if (hasKey && !el.keyInput.value) {
        el.keyInput.value = key;
      }
    }
  }

  // ---------------------------------------------------------------- Mở / Đóng cửa sổ Chat
  function open() {
    el.panel.classList.remove('hidden');
    el.panel.classList.add('flex');
    el.toggle.setAttribute('aria-expanded', 'true');
    el.toggle.classList.add('rotate-90');
    el.toggleIcon.textContent = 'close';

    // Nếu chưa có API key, tự động mở khay cấu hình để người dùng nhập
    if (!getApiKey()) {
      openKeyTray();
    }
    el.input.focus();
  }

  function close() {
    el.panel.classList.add('hidden');
    el.panel.classList.remove('flex');
    el.toggle.setAttribute('aria-expanded', 'false');
    el.toggle.classList.remove('rotate-90');
    el.toggleIcon.textContent = 'smart_toy';
    el.toggle.focus();
  }

  function isOpen() {
    return !el.panel.classList.contains('hidden');
  }

  // ---------------------------------------------------------------- Dựng HTML & CSS
  function build() {
    var root = make('div', 'fixed bottom-6 right-6 z-50 flex flex-col items-end');
    root.id = ROOT_ID;

    var hasKey = Boolean(getApiKey());

    // Cửa sổ chat
    var panel = make('div', 'hidden mb-3 w-[calc(100vw-3rem)] max-w-sm sm:max-w-md h-[36rem] max-h-[82vh] bg-white rounded-2xl shadow-2xl border border-stone-200/90 flex flex-col overflow-hidden transition-all duration-200');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Trò chuyện cùng Trợ lý Nghệ nhân AI');

    // 1. Header sang trọng gốm Bát Tràng
    var head = make('div', 'bg-[#0a2540] text-white px-3.5 py-3 flex items-center justify-between border-b border-white/10 shadow-sm shrink-0');
    
    var headLeft = make('div', 'flex items-center gap-2.5');
    var avatarWrap = make('div', 'relative w-9 h-9 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0');
    avatarWrap.appendChild(make('span', 'material-symbols-outlined text-[20px]', 'smart_toy'));
    var headerAvatarBadge = make('span', 'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-[#0a2540] ' + (hasKey ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'));
    avatarWrap.appendChild(headerAvatarBadge);
    headLeft.appendChild(avatarWrap);

    var headText = make('div');
    var headTitle = make('div', 'font-serif text-sm font-bold leading-tight tracking-wide text-white flex items-center gap-1.5');
    headTitle.textContent = 'Trợ lý Nghệ nhân AI ';
    var geminiBadge = make('span', 'text-[10px] uppercase font-sans font-semibold px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30', 'Gemini');
    headTitle.appendChild(geminiBadge);
    headText.appendChild(headTitle);
    headText.appendChild(make('div', 'text-[11px] text-stone-300 mt-0.5', 'Tri thức Gốm Bát Tràng & Thiết kế 2D'));
    headLeft.appendChild(headText);

    var headActions = make('div', 'flex items-center gap-1');
    
    // Nút Cấu hình API Key
    var keyBtn = make('button', 'p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition-colors relative cursor-pointer', '');
    keyBtn.type = 'button';
    keyBtn.title = 'Cấu hình Google AI Studio Key';
    keyBtn.appendChild(make('span', 'material-symbols-outlined text-[19px]', 'vpn_key'));
    var keyBadge = make('span', 'absolute top-1 right-1 w-2 h-2 rounded-full ' + (hasKey ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'));
    keyBtn.appendChild(keyBadge);
    keyBtn.addEventListener('click', toggleKeyTray);
    headActions.appendChild(keyBtn);

    // Nút Đóng
    var closeBtn = make('button', 'p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer');
    closeBtn.type = 'button';
    closeBtn.title = 'Đóng cửa sổ chat';
    closeBtn.appendChild(make('span', 'material-symbols-outlined text-[19px]', 'close'));
    closeBtn.addEventListener('click', close);
    headActions.appendChild(closeBtn);

    head.appendChild(headLeft);
    head.appendChild(headActions);

    // 2. Khay cài đặt API Key (Google AI Studio)
    var keyTray = make('div', (hasKey ? 'hidden ' : '') + 'bg-[#f8f5f0] border-b border-amber-900/15 p-3.5 shadow-inner transition-all duration-200 shrink-0');
    
    var trayHead = make('div', 'flex items-center justify-between mb-1.5');
    var trayTitle = make('div', 'flex items-center gap-1.5 text-xs font-bold text-[#0a2540]');
    trayTitle.appendChild(make('span', 'material-symbols-outlined text-base text-[#8B4513]', 'key'));
    trayTitle.appendChild(document.createTextNode('Cấu hình Google AI Studio Key'));
    trayHead.appendChild(trayTitle);

    var trayToggleBtn = make('button', 'text-stone-400 hover:text-stone-700 text-xs flex items-center cursor-pointer');
    trayToggleBtn.type = 'button';
    var trayToggleIcon = make('span', 'material-symbols-outlined text-[18px]', hasKey ? 'expand_more' : 'expand_less');
    trayToggleBtn.appendChild(trayToggleIcon);
    trayToggleBtn.addEventListener('click', toggleKeyTray);
    trayHead.appendChild(trayToggleBtn);
    keyTray.appendChild(trayHead);

    var trayDesc = make('p', 'text-[11px] text-stone-600 mb-2 leading-relaxed', 'Dán khóa API từ Google AI Studio để kích hoạt mô hình Gemini AI trả lời theo tài liệu tri thức của xưởng.');
    keyTray.appendChild(trayDesc);

    var keyInputRow = make('div', 'flex items-center gap-1.5');
    var keyInputWrapper = make('div', 'relative flex-1');
    var keyInput = make('input', 'w-full text-xs px-3 py-1.5 pr-8 rounded-lg border border-stone-300 focus:outline-none focus:border-[#0a2540] bg-white text-stone-800 font-mono shadow-xs');
    keyInput.type = 'password';
    keyInput.placeholder = 'Dán API Key (AIzaSy...)';
    keyInput.autocomplete = 'off';
    if (hasKey) keyInput.value = getApiKey();

    var eyeBtn = make('button', 'absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer flex items-center');
    eyeBtn.type = 'button';
    var eyeIcon = make('span', 'material-symbols-outlined text-[16px]', 'visibility');
    eyeBtn.appendChild(eyeIcon);
    eyeBtn.addEventListener('click', function () {
      if (keyInput.type === 'password') {
        keyInput.type = 'text';
        eyeIcon.textContent = 'visibility_off';
      } else {
        keyInput.type = 'password';
        eyeIcon.textContent = 'visibility';
      }
    });

    keyInputWrapper.appendChild(keyInput);
    keyInputWrapper.appendChild(eyeBtn);
    keyInputRow.appendChild(keyInputWrapper);

    var saveKeyBtn = make('button', 'px-3 py-1.5 bg-[#8B4513] hover:bg-[#6e350d] text-white text-xs font-semibold rounded-lg cursor-pointer transition-colors shadow-xs whitespace-nowrap', 'Lưu Key');
    saveKeyBtn.type = 'button';
    saveKeyBtn.addEventListener('click', function () {
      var val = cleanApiKey(keyInput.value);
      if (!val) {
        alert('Vui lòng dán Google AI Studio API Key hợp lệ!');
        keyInput.focus();
        return;
      }
      if (val.startsWith('http://') || val.startsWith('https://')) {
        alert('Vui lòng dán mã API Key (thường bắt đầu bằng AIzaSy...), không dán đường link trang web!');
        keyInput.focus();
        return;
      }
      if (val.length < 15) {
        alert('Khóa API Key quá ngắn hoặc không đúng định dạng Google AI Studio (bắt đầu bằng AIzaSy...).');
        keyInput.focus();
        return;
      }
      keyInput.value = val;
      saveApiKey(val);
      closeKeyTray();
      addMessage('bot', '✅ **Đã lưu Google AI Key thành công!**\n\nNghệ nhân Trợ lý AI Bát Tràng đã sẵn sàng phục vụ. Quý khách có thể thoải mái hỏi về dáng phôi, 5 sắc men, cách tự thiết kế 2D khắc chữ, báo giá hay bất kỳ câu hỏi nào.');
    });
    keyInputRow.appendChild(saveKeyBtn);

    var removeKeyBtn = make('button', (hasKey ? '' : 'hidden ') + 'px-2 py-1.5 border border-red-200 hover:bg-red-50 text-red-600 text-xs rounded-lg cursor-pointer transition-colors', '');
    removeKeyBtn.type = 'button';
    removeKeyBtn.title = 'Xóa API Key';
    removeKeyBtn.appendChild(make('span', 'material-symbols-outlined text-[16px]', 'delete'));
    removeKeyBtn.addEventListener('click', function () {
      if (confirm('Quý khách có chắc chắn muốn xóa API Key này không?')) {
        clearApiKey();
        keyInput.value = '';
        addMessage('bot', 'Đã xóa API Key. Để tiếp tục trò chuyện cùng AI, vui lòng nhập lại API Key mới.');
      }
    });
    keyInputRow.appendChild(removeKeyBtn);

    keyTray.appendChild(keyInputRow);

    var trayFooter = make('div', 'flex items-center justify-between mt-2 pt-1 border-t border-amber-900/10 text-[11px]');
    var studioLink = make('a', 'text-[#8B4513] hover:underline font-medium inline-flex items-center gap-0.5');
    studioLink.href = 'https://aistudio.google.com/app/apikey';
    studioLink.target = '_blank';
    studioLink.rel = 'noopener noreferrer';
    studioLink.appendChild(document.createTextNode('Lấy API Key miễn phí tại Google AI Studio'));
    studioLink.appendChild(make('span', 'material-symbols-outlined text-[12px]', 'open_in_new'));
    trayFooter.appendChild(studioLink);

    var keyStatus = make('span', 'text-[11px] ' + (hasKey ? 'text-emerald-700 font-semibold' : 'text-amber-700 font-medium'), hasKey ? '● AI Gemini sẵn sàng' : '○ Chưa nhập Key');
    trayFooter.appendChild(keyStatus);
    keyTray.appendChild(trayFooter);

    // 3. Vùng hiển thị tin nhắn
    var messages = make('div', 'flex-1 overflow-y-auto p-3.5 space-y-3 bg-[#fdfcfa]');
    messages.setAttribute('aria-live', 'polite');

    // 4. Vùng câu hỏi gợi ý nhanh
    var chips = make('div', 'px-3 py-2 flex flex-wrap gap-1.5 bg-stone-50 border-t border-stone-200/70 max-h-24 overflow-y-auto shrink-0');
    SUGGESTIONS.forEach(function (q) {
      var chip = make('button', 'text-xs px-2.5 py-1 rounded-full border border-stone-300 bg-white text-stone-700 hover:border-[#0a2540] hover:text-[#0a2540] transition-colors cursor-pointer shadow-2xs text-left', q);
      chip.type = 'button';
      chip.addEventListener('click', function () { send(q); });
      chips.appendChild(chip);
    });

    // 5. Form nhập câu hỏi
    var form = make('form', 'flex items-center gap-2 p-2.5 border-t border-stone-200 bg-white shrink-0');
    var input = make('input', 'flex-1 text-sm px-3.5 py-2 rounded-full border border-stone-300 focus:outline-none focus:border-[#0a2540] bg-stone-50/50');
    input.type = 'text';
    input.maxLength = MAX_LEN;
    input.placeholder = 'Hỏi nghệ nhân AI về gốm 2D, sắc men, phôi...';
    input.setAttribute('aria-label', 'Nhập câu hỏi');
    input.autocomplete = 'off';

    var sendBtn = make('button', 'w-9 h-9 shrink-0 rounded-full bg-[#8B4513] hover:bg-[#72370f] text-white flex items-center justify-center cursor-pointer transition-colors shadow-xs');
    sendBtn.type = 'submit';
    sendBtn.setAttribute('aria-label', 'Gửi');
    sendBtn.appendChild(make('span', 'material-symbols-outlined text-[18px]', 'send'));

    form.appendChild(input);
    form.appendChild(sendBtn);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      send(input.value);
    });

    panel.appendChild(head);
    panel.appendChild(keyTray);
    panel.appendChild(messages);
    panel.appendChild(chips);
    panel.appendChild(form);

    // 6. Nút tròn nổi chính (Góc dưới phải màn hình)
    var toggle = make('button', 'flex items-center justify-center w-14 h-14 rounded-full bg-[#0a2540] hover:bg-[#06182a] text-white shadow-2xl transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer ring-4 ring-[#0a2540]/15');
    toggle.type = 'button';
    toggle.setAttribute('aria-label', 'Trò chuyện cùng Trợ lý Nghệ nhân AI');
    toggle.setAttribute('aria-expanded', 'false');

    var toggleIcon = make('span', 'material-symbols-outlined text-[26px]', 'smart_toy');
    toggle.appendChild(toggleIcon);
    toggle.addEventListener('click', function () {
      if (isOpen()) close();
      else open();
    });

    root.appendChild(panel);
    root.appendChild(toggle);
    document.body.appendChild(root);

    el = {
      root: root,
      panel: panel,
      messages: messages,
      input: input,
      send: sendBtn,
      toggle: toggle,
      toggleIcon: toggleIcon,
      keyTray: keyTray,
      keyInput: keyInput,
      keyBtn: keyBtn,
      keyBadge: keyBadge,
      keyStatus: keyStatus,
      removeKeyBtn: removeKeyBtn,
      headerAvatarBadge: headerAvatarBadge,
      trayToggleIcon: trayToggleIcon
    };

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen()) close();
    });

    // Lời chào khởi đầu
    var welcomeMsg = hasKey
      ? 'Xin chào quý khách! Mình là **Trợ lý Nghệ nhân AI** của Làng Gốm Thanh Xuân, được vận hành bởi mô hình Google Gemini AI.\n\nMình đã nắm rõ toàn bộ tri thức xưởng gốm và sẵn sàng tư vấn chi tiết về: các dáng phôi gốm, 5 sắc men cổ, tự thiết kế 2D khắc chữ, báo giá hoặc chính sách bảo hành. Quý khách cần mình hỗ trợ điều gì hôm nay ạ?'
      : 'Xin chào quý khách! Mình là **Trợ lý Nghệ nhân AI** của Làng Gốm Thanh Xuân.\n\nĐể trò chuyện thông minh cùng mình thông qua Google Gemini AI, quý khách vui lòng dán **Google AI Studio API Key** vào khung cấu hình phía trên nhé ạ! (Nhấn vào nút *"Lấy API Key miễn phí tại Google AI Studio"* nếu quý khách chưa có key).';

    addMessage('bot', welcomeMsg);
  }

  function init() {
    if (document.getElementById(ROOT_ID)) return;
    build();
  }

  window.Chatbot = {
    init: init,
    open: function () { if (el.panel) open(); },
    close: function () { if (el.panel) close(); },
    toggle: function () { if (el.panel) { if (isOpen()) close(); else open(); } },
    setApiKey: saveApiKey,
    getApiKey: getApiKey,
    openKeySettings: openKeyTray
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window, document);