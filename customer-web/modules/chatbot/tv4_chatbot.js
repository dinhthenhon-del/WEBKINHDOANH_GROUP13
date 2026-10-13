/**
 * ============================================================================
 * [THÀNH VIÊN 4 - CUSTOM 2D & CHATBOT AI]
 * Widget Chatbot (modules/chatbot/tv4_chatbot.js)  - UC-C09
 * Nhiệm vụ:
 *   - Icon chat nổi ở góc phải dưới, bấm để mở/đóng cửa sổ chat
 *   - Câu hỏi gợi ý (kịch bản thường gặp), gửi tin nhắn tới POST /api/chatbot
 *   - Xử lý mất kết nối: báo lỗi rõ ràng và có nút "Thử lại"
 * Cách dùng: nhúng <script src="modules/chatbot/tv4_chatbot.js"></script> sau core/api.js.
 *            Widget tự khởi tạo, mỗi trang chỉ có một widget.
 * ============================================================================
 */

(function (window, document) {
  'use strict';

  var ROOT_ID = 'tv4-chatbot';
  var MAX_LEN = 300;
  var WELCOME = 'Xin chào! Mình là trợ lý của Gốm Mộc. Bạn có thể hỏi về dáng gốm, sắc men, thiết kế 2D, đặt hàng hoặc đổi trả.';
  var SUGGESTIONS = [
    'Làm sao để tự thiết kế gốm 2D?',
    'Chữ khắc tối đa bao nhiêu ký tự?',
    'Các sắc men có gì khác nhau?',
    'Thanh toán bằng cách nào?',
    'Cách bảo quản đồ gốm?'
  ];

  var el = {};
  var busy = false;

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
      ? 'ml-auto max-w-[85%] bg-[#9f3c16] text-white rounded-2xl rounded-br-sm px-3 py-2 text-sm whitespace-pre-line break-words'
      : 'mr-auto max-w-[85%] bg-white border border-[#faebe6] text-[#211a17] rounded-2xl rounded-bl-sm px-3 py-2 text-sm whitespace-pre-line break-words', text);

    if (opts && opts.retry) {
      var retry = make('button', 'block mt-2 text-xs font-semibold text-[#38665f] underline cursor-pointer', 'Thử lại');
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
    var typing = addMessage('bot', 'Đang trả lời...');

    var offline = 'Mất kết nối mạng. Bạn kiểm tra internet rồi thử lại nhé.';
    var failed = 'Chưa kết nối được tới máy chủ tư vấn. Bạn thử lại sau ít phút nhé.';

    if (window.navigator.onLine === false) {
      typing.parentNode.removeChild(typing);
      addMessage('bot', offline, { retry: text });
      setBusy(false);
      return;
    }

    window.ApiClient.post('/chatbot', { message: text })
      .then(function (res) {
        var reply = res && res.data && res.data.reply;
        typing.parentNode.removeChild(typing);
        addMessage('bot', reply || 'Mình chưa có câu trả lời cho câu này. Bạn thử hỏi cách khác nhé.');
      })
      .catch(function () {
        typing.parentNode.removeChild(typing);
        addMessage('bot', failed, { retry: text });
      })
      .then(function () { setBusy(false); });
  }

  // ---------------------------------------------------------------- Mở / đóng
  function open() {
    el.panel.classList.remove('hidden');
    el.toggle.setAttribute('aria-expanded', 'true');
    el.input.focus();
  }

  function close() {
    el.panel.classList.add('hidden');
    el.toggle.setAttribute('aria-expanded', 'false');
    el.toggle.focus();
  }

  function isOpen() { return !el.panel.classList.contains('hidden'); }

  // ---------------------------------------------------------------- Dựng giao diện
  function build() {
    var root = make('div', 'fixed bottom-6 right-6 z-40 flex flex-col items-end');
    root.id = ROOT_ID;

    // Cửa sổ chat
    var panel = make('div', 'hidden mb-3 w-[calc(100vw-3rem)] max-w-sm h-[30rem] max-h-[70vh] bg-white rounded-2xl shadow-2xl border border-[#dec0b7] flex flex-col overflow-hidden');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Trò chuyện cùng trợ lý Gốm Mộc');

    var head = make('div', 'bg-[#38665f] text-white px-4 py-3 flex items-center justify-between');
    var headText = make('div');
    headText.appendChild(make('div', 'font-serif text-lg font-semibold leading-tight', 'Trợ lý Gốm Mộc'));
    headText.appendChild(make('div', 'text-xs opacity-80', 'Tư vấn dáng gốm, men và đơn hàng'));
    var closeBtn = make('button', 'p-1 rounded-full hover:bg-white/15 cursor-pointer');
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Đóng cửa sổ chat');
    closeBtn.appendChild(make('span', 'material-symbols-outlined text-[20px]', 'close'));
    closeBtn.addEventListener('click', close);
    head.appendChild(headText);
    head.appendChild(closeBtn);

    var messages = make('div', 'flex-1 overflow-y-auto p-4 space-y-3 bg-[#fff8f6]');
    messages.setAttribute('aria-live', 'polite');

    var chips = make('div', 'px-3 py-2 flex flex-wrap gap-1.5 bg-[#fff8f6] border-t border-[#faebe6] max-h-24 overflow-y-auto');
    SUGGESTIONS.forEach(function (q) {
      var chip = make('button', 'text-xs px-2.5 py-1 rounded-full border border-[#dec0b7] bg-white text-[#57423b] hover:border-[#38665f] hover:text-[#38665f] cursor-pointer', q);
      chip.type = 'button';
      chip.addEventListener('click', function () { send(q); });
      chips.appendChild(chip);
    });

    var form = make('form', 'flex items-center gap-2 p-3 border-t border-[#faebe6] bg-white');
    var input = make('input', 'flex-1 text-sm px-3 py-2 rounded-full border border-[#dec0b7] focus:outline-none focus:border-[#38665f]');
    input.type = 'text';
    input.maxLength = MAX_LEN;
    input.placeholder = 'Nhập câu hỏi của bạn...';
    input.setAttribute('aria-label', 'Nhập câu hỏi');
    input.autocomplete = 'off';
    var sendBtn = make('button', 'w-9 h-9 shrink-0 rounded-full bg-[#9f3c16] hover:bg-[#bf542c] text-white flex items-center justify-center cursor-pointer');
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

    // Nút tròn nổi
    var toggle = make('button', 'flex items-center justify-center w-14 h-14 rounded-full bg-[#38665f] hover:bg-[#2f544e] text-white shadow-xl transition-transform hover:scale-105 active:scale-95 cursor-pointer');
    toggle.type = 'button';
    toggle.setAttribute('aria-label', 'Trò chuyện cùng trợ lý Gốm Mộc');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.appendChild(make('span', 'material-symbols-outlined text-[26px]', 'chat'));
    toggle.addEventListener('click', function () { if (isOpen()) close(); else open(); });

    root.appendChild(panel);
    root.appendChild(toggle);
    document.body.appendChild(root);

    el = { root: root, panel: panel, messages: messages, input: input, send: sendBtn, toggle: toggle };

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen()) close();
    });

    addMessage('bot', WELCOME);
  }

  function init() {
    if (document.getElementById(ROOT_ID)) return;   // mỗi trang chỉ một widget
    build();
  }

  window.Chatbot = { init: init, open: function () { if (el.panel) open(); } };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window, document);