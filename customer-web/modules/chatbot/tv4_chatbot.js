/**
 * ============================================================================
 * [THÀNH VIÊN 4 - CUSTOM 2D & CHATBOT AI]
 * Widget Chatbot Tư vấn Gốm Mộc (modules/chatbot/tv4_chatbot.js) - UC-C09
 * Nhiệm vụ:
 *   - Icon chat nổi ở góc phải dưới, bấm để mở/đóng cửa sổ chat
 *   - Tư vấn toàn bộ kiến thức chuyên sâu về gốm sứ Bát Tràng (dáng phôi, sắc men,
 *     tác chế 2D, quy chuẩn 20 ký tự chữ khắc UC-C04, đơn hàng, đổi trả 7 ngày).
 *   - Hoạt động độc lập, tức thì, bảo mật và không phụ thuộc API bên ngoài.
 * Cách dùng: nhúng <script src="modules/chatbot/tv4_chatbot.js"></script> sau core/api.js.
 * ============================================================================
 */

(function (window, document) {
  'use strict';

  var ROOT_ID = 'tv4-chatbot';
  var MAX_LEN = 300;
  var WELCOME = 'Xin chào quý khách! Mình là Trợ lý Nghệ nhân của Gốm Mộc. Quý khách cần tư vấn về dáng phôi gốm, sắc men Bát Tràng, hướng dẫn thiết kế 2D, khắc chữ nghệ thuật hay chính sách đổi trả?';

  var SUGGESTIONS = [
    'Làm sao để tự thiết kế gốm 2D?',
    'Chữ khắc tối đa bao nhiêu ký tự?',
    'Các sắc men Bát Tràng có gì khác nhau?',
    'Các dáng phôi gốm hiện có giá bao nhiêu?',
    'Thanh toán & giao hàng thế nào?',
    'Cách bảo quản đồ gốm sứ dát vàng?',
    'Chính sách đổi trả hàng nứt vỡ?'
  ];

  var el = {};
  var busy = false;

  // HỆ THỐNG TRI THỨC ĐỒ ÁN / MÔN HỌC PHÁT TRIỂN WEB KINH DOANH (GỐM MỘC BÁT TRÀNG)
  function getCourseKnowledgeReply(text) {
    var lower = (text || '').toLowerCase();

    if (lower.includes('2d') || lower.includes('tự thiết kế') || lower.includes('tác chế') || lower.includes('thiết kế gốm')) {
      return '🎨 **Quy trình tự thiết kế gốm 2D tại Gốm Mộc (UC-C04):**\n\n' +
        '1. **Chọn phôi gốm:** Chọn 1 trong 5 dáng phôi thủ công (Đĩa sứ nghệ thuật kèm giá gỗ, Mai bình dáng cao, Bình hoa cổ sóng, Ấm trà sứ trắng, Tách trà hoàng gia).\n' +
        '2. **Chọn họa tiết:** Chọn trong 13 mẫu truyền thống (Rồng vàng vân mây, Sen lam, Mai vàng, Phượng hoàng, Song ngư, Tùng hạc...).\n' +
        '3. **Căn chỉnh tự do:** Kéo chuột trực tiếp trên thân bình, điều chỉnh kích cỡ phóng to/thu nhỏ (25% - 150%), xoay góc 360° và bấm *Căn giữa chuẩn*.\n' +
        '4. **Khắc chữ nghệ thuật:** Nhập chữ khắc (tối đa **20 ký tự** theo chuẩn nghệ nhân), chọn màu men và tùy chỉnh độ cao (Lên / Xuống), dịch ngang hoặc thay đổi cỡ chữ.\n' +
        '5. **Thêm vào giỏ:** Nhấn *"Hoàn tất & Thêm vào giỏ"* để nghệ nhân xưởng tiếp nhận chế tác theo đúng bản vẽ.';
    }

    if (lower.includes('kí tự') || lower.includes('ký tự') || lower.includes('chữ khắc') || lower.includes('bao nhiêu ký tự') || lower.includes('tối đa')) {
      return '✍️ **Quy định số lượng ký tự chữ khắc (Chuẩn UC-C04 E1):**\n\n' +
        '• Chữ khắc nghệ thuật trên thân phôi gốm được giới hạn **tối đa 20 ký tự**.\n' +
        '• **Lý do từ nghệ nhân:** Giới hạn này đảm bảo khi khắc chìm hay vẽ men ôm theo dáng cong của phôi gốm, các con chữ giữ được độ thanh thoát, cân đối mỹ thuật và không bị che khuất họa tiết chính.';
    }

    if (lower.includes('phôi') || lower.includes('dáng gốm') || lower.includes('giá bao nhiêu') || lower.includes('giá phôi') || lower.includes('bình')) {
      return '🏺 **Bảng giá 5 dáng phôi gốm thủ công tại Studio 2D:**\n\n' +
        '1. **Mai Bình Dáng Cao:** 2.850.000₫ (Dáng cao sang trọng, hút tài lộc).\n' +
        '2. **Bình Hoa Tròn Cổ Sóng:** 1.850.000₫ (Nét uốn lượn mềm mại, tao nhã).\n' +
        '3. **Ấm Trà Sứ Trắng:** 1.450.000₫ (Gốm sứ thấu quang cao cấp Bát Tràng).\n' +
        '4. **Đĩa Sứ Nghệ Thuật (Kèm giá gỗ):** 1.200.000₫ (Trưng bày phòng khách, quà tặng ngoại giao).\n' +
        '5. **Tách Trà Có Nắp Hoàng Gia:** 380.000₫ (Nắp ấm đậy kín hương trà thượng hạng).';
    }

    if (lower.includes('men') || lower.includes('sắc men') || lower.includes('màu men') || lower.includes('khác nhau')) {
      return '✨ **5 Dòng Men Danh Tiếng Của Gốm Bát Tràng:**\n\n' +
        '• **Men Lam:** Men cổ xưa nhất từ thế kỷ XIV, màu xanh lam cobalt sâu thẳm dưới lớp men bóng trong vắt.\n' +
        '• **Men Rạn:** Kỹ thuật gia truyền độc đáo thời Lê - Nguyễn, các đường rạn tự nhiên hình tam giác/tứ giác độc bản do kiểm soát chênh lệch nhiệt độ lò nung.\n' +
        '• **Men Ngọc (Celadon):** Sắc xanh lục bảo thanh khiết, mịn màng như ngọc thạch hoàng gia triều đình.\n' +
        '• **Men Hỏa Biến:** Màu men sinh ra hoàn toàn từ vũ điệu ngọn lửa 1.300°C, không có 2 sản phẩm nào trùng lặp.\n' +
        '• **Dát Vàng Kim Sa:** Điểm xuyết vàng ròng 24K thủ công lên thân gốm, mang lại vượng khí và đẳng cấp cao quý.';
    }

    if (lower.includes('thanh toán') || lower.includes('cod') || lower.includes('chuyển khoản') || lower.includes('trả tiền')) {
      return '💳 **Phương Thức Thanh Toán (UC-C06):**\n\n' +
        '1. **Thanh toán khi nhận hàng (COD):** Giao hàng tận nơi toàn quốc, quý khách được đồng kiểm hàng kỹ lưỡng trước khi thanh toán.\n' +
        '2. **Chuyển khoản ngân hàng (QR Code động):** Quét mã QR tiện lợi, hệ thống tự động xác nhận đơn hàng trong vài giây.\n' +
        '3. **Thẻ thanh toán:** Hỗ trợ thẻ ATM nội địa, Visa, Mastercard an toàn bảo mật.';
    }

    if (lower.includes('bảo quản') || lower.includes('vệ sinh') || lower.includes('rửa') || lower.includes('lau chùi')) {
      return '🛡️ **Bí Quyết Bảo Quản Gốm Sứ Bát Tràng Bền Đẹp:**\n\n' +
        '• Rửa đồ gốm bằng nước ấm pha chút giấm trắng hoặc nước rửa chén dịu nhẹ.\n' +
        '• Dùng khăn vải mềm hoặc bọt biển để lau. **Tuyệt đối không dùng búi sắt ráp** cọ rửa vì sẽ làm xước lớp men bóng và làm bong đường dát vàng.\n' +
        '• Đặt sản phẩm ở nơi bằng phẳng, tránh sát mép bàn, tránh thay đổi nhiệt độ đột ngột (sốc nhiệt).';
    }

    if (lower.includes('đổi trả') || lower.includes('bảo hành') || lower.includes('vỡ') || lower.includes('hỏng')) {
      return '📦 **Chính Sách Đổi Trả & Bảo Hành (UC-A05, UC-C08):**\n\n' +
        '• **Đổi mới 100% trong vòng 7 ngày** nếu sản phẩm bị nứt vỡ trong quá trình vận chuyển hoặc có lỗi chế tác từ nghệ nhân.\n' +
        '• Quý khách vui lòng quay video khi khui kiện hàng và gửi yêu cầu tại mục *"Đổi trả hàng"* trong trang tài khoản để được nghệ nhân xử lý ưu tiên.';
    }

    if (lower.includes('giao hàng') || lower.includes('thời gian') || lower.includes('bao lâu') || lower.includes('ship')) {
      return '🚚 **Thời Gian Giao Hàng:**\n\n' +
        '• **Sản phẩm có sẵn:** Giao trong 2 - 3 ngày làm việc trên toàn quốc.\n' +
        '• **Tác phẩm đặt thiết kế 2D:** Từ 5 - 7 ngày làm việc để nghệ nhân tạo phôi, nung men, vẽ họa tiết và khắc chữ thủ công trước khi đóng gói chống sốc 3 lớp xuất xưởng.';
    }

    if (lower.includes('hotline') || lower.includes('liên hệ') || lower.includes('địa chỉ') || lower.includes('số điện thoại')) {
      return '📞 **Thông Tin Liên Hệ Xưởng Gốm Mộc:**\n\n' +
        '• **Hotline tư vấn nghệ nhân 24/7:** 1800 1705 (Miễn phí cước gọi).\n' +
        '• **Email:** hotro@gommoc.vn\n' +
        '• **Địa chỉ xưởng:** Làng cổ gốm sứ Bát Tràng, Gia Lâm, Hà Nội.';
    }

    return 'Chào bạn! Mình là Trợ lý Nghệ nhân của Gốm Mộc. Bạn có thể hỏi mình chi tiết về:\n' +
      '• Cách tự thiết kế tác phẩm gốm 2D (chọn phôi, họa tiết, khắc chữ)\n' +
      '• Giới hạn 20 ký tự chữ khắc nghệ thuật (chuẩn UC-C04)\n' +
      '• Giá cả 5 dáng phôi gốm và đặc trưng 5 sắc men truyền thống\n' +
      '• Hình thức thanh toán COD/QR và chính sách đổi trả hàng nứt vỡ.';
  }

  function make(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  // ---------------------------------------------------------------- Tin nhắn
  function addMessage(role, text, opts) {
    var isUser = role === 'user';
    var bubble = make('div', isUser
      ? 'ml-auto max-w-[85%] bg-[#0a2540] text-white rounded-2xl rounded-br-sm px-3.5 py-2.5 text-sm whitespace-pre-line break-words shadow-sm leading-relaxed'
      : 'mr-auto max-w-[85%] bg-white border border-stone-200 text-stone-800 rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-sm whitespace-pre-line break-words shadow-2xs leading-relaxed', text);

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
  }

  function send(text, isRetry) {
    text = (text || '').trim();
    if (!text || busy) return;
    if (text.length > MAX_LEN) text = text.slice(0, MAX_LEN);

    if (!isRetry) addMessage('user', text);
    el.input.value = '';
    setBusy(true);
    var typing = addMessage('bot', 'Đang kết nối nghệ nhân tư vấn...');

    // Phản hồi tự nhiên với độ trễ nhẹ mô phỏng nghệ nhân đang phản hồi
    setTimeout(function () {
      if (typing.parentNode) typing.parentNode.removeChild(typing);
      var reply = getCourseKnowledgeReply(text);
      addMessage('bot', reply);
      setBusy(false);
    }, 400);
  }

  // ---------------------------------------------------------------- Mở / đóng
  function open() {
    el.panel.classList.remove('hidden');
    el.panel.classList.add('flex');
    el.toggle.setAttribute('aria-expanded', 'true');
    el.toggle.classList.add('rotate-90');
    el.toggleIcon.textContent = 'close';
    el.input.focus();
  }

  function close() {
    el.panel.classList.add('hidden');
    el.panel.classList.remove('flex');
    el.toggle.setAttribute('aria-expanded', 'false');
    el.toggle.classList.remove('rotate-90');
    el.toggleIcon.textContent = 'chat';
    el.toggle.focus();
  }

  function isOpen() { return !el.panel.classList.contains('hidden'); }

  // ---------------------------------------------------------------- Dựng giao diện
  function build() {
    var root = make('div', 'fixed bottom-6 right-6 z-50 flex flex-col items-end');
    root.id = ROOT_ID;

    // Cửa sổ chat
    var panel = make('div', 'hidden mb-3 w-[calc(100vw-3rem)] max-w-sm sm:max-w-md h-[34rem] max-h-[80vh] bg-white rounded-2xl shadow-2xl border border-stone-200/90 flex flex-col overflow-hidden transition-all duration-200');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Trò chuyện cùng Trợ lý Gốm Mộc');

    // Header chuẩn sang trọng gốm Bát Tràng (Gọn gàng, không có API Key)
    var head = make('div', 'bg-[#0a2540] text-white px-4 py-3.5 flex items-center justify-between border-b border-white/10 shadow-sm');
    var headLeft = make('div', 'flex items-center gap-2.5');
    var avatar = make('div', 'w-9 h-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-amber-300');
    avatar.appendChild(make('span', 'material-symbols-outlined text-[20px]', 'psychology'));
    headLeft.appendChild(avatar);

    var headText = make('div');
    headText.appendChild(make('div', 'font-serif text-base font-bold leading-tight tracking-wide text-white', 'Trợ lý Gốm Mộc'));
    headText.appendChild(make('div', 'text-[11px] text-stone-300 mt-0.5', 'Tư vấn dáng gốm, sắc men & tác chế 2D'));
    headLeft.appendChild(headText);

    // Nút đóng
    var closeBtn = make('button', 'p-1 rounded-full hover:bg-white/15 cursor-pointer text-white/80 hover:text-white transition-colors');
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Đóng cửa sổ chat');
    closeBtn.appendChild(make('span', 'material-symbols-outlined text-[20px]', 'close'));
    closeBtn.addEventListener('click', close);

    head.appendChild(headLeft);
    head.appendChild(closeBtn);

    // Vùng tin nhắn
    var messages = make('div', 'flex-1 overflow-y-auto p-4 space-y-3 bg-[#fdfcfa]');
    messages.setAttribute('aria-live', 'polite');

    // Vùng câu hỏi gợi ý nhanh theo chuẩn bài học
    var chips = make('div', 'px-3 py-2 flex flex-wrap gap-1.5 bg-stone-50 border-t border-stone-200/70 max-h-28 overflow-y-auto');
    SUGGESTIONS.forEach(function (q) {
      var chip = make('button', 'text-xs px-2.5 py-1 rounded-full border border-stone-300 bg-white text-stone-700 hover:border-[#0a2540] hover:text-[#0a2540] transition-colors cursor-pointer shadow-2xs text-left', q);
      chip.type = 'button';
      chip.addEventListener('click', function () { send(q); });
      chips.appendChild(chip);
    });

    // Form nhập tin nhắn
    var form = make('form', 'flex items-center gap-2 p-3 border-t border-stone-200 bg-white');
    var input = make('input', 'flex-1 text-sm px-3.5 py-2 rounded-full border border-stone-300 focus:outline-none focus:border-[#0a2540] bg-stone-50/50');
    input.type = 'text';
    input.maxLength = MAX_LEN;
    input.placeholder = 'Hỏi nghệ nhân về gốm 2D, men, đặt hàng...';
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
    panel.appendChild(messages);
    panel.appendChild(chips);
    panel.appendChild(form);

    // Nút tròn nổi chính
    var toggle = make('button', 'flex items-center justify-center w-14 h-14 rounded-full bg-[#0a2540] hover:bg-[#06182a] text-white shadow-2xl transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer ring-4 ring-[#0a2540]/15');
    toggle.type = 'button';
    toggle.setAttribute('aria-label', 'Trò chuyện cùng Trợ lý Gốm Mộc');
    toggle.setAttribute('aria-expanded', 'false');

    var toggleIcon = make('span', 'material-symbols-outlined text-[26px]', 'chat');
    toggle.appendChild(toggleIcon);
    toggle.addEventListener('click', function () { if (isOpen()) close(); else open(); });

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
      toggleIcon: toggleIcon
    };

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen()) close();
    });

    addMessage('bot', WELCOME);
  }

  function init() {
    if (document.getElementById(ROOT_ID)) return;
    build();
  }

  window.Chatbot = {
    init: init,
    open: function () { if (el.panel) open(); },
    close: function () { if (el.panel) close(); },
    toggle: function () { if (el.panel) { if (isOpen()) close(); else open(); } }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window, document);