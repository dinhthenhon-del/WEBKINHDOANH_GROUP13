/**
 * ============================================================================
 * [THÀNH VIÊN 4 - CUSTOM 2D & CHATBOT AI]
 * Studio Tác chế 2D (modules/custom-2d/tv4_custom2d.js)  - UC-C04
 * Nhiệm vụ:
 *   - Chọn dáng phôi, sắc men, họa tiết, nhập chữ khắc (tối đa 20 ký tự - E1)
 *   - Xem trước tương tác (SVG) theo thời gian thực
 *   - Hỏi xác nhận khi rời Studio mà chưa lưu (E3)
 *   - Thêm thiết kế vào giỏ hàng của TV3 qua App.cart.addToCart(...)
 * Cách dùng:  Custom2D.mount(containerElement)  /  Custom2D.unmount()
 * Phụ thuộc: core/api.js (ApiClient), modules/custom-2d/options.js
 * ============================================================================
 */

(function (window) {
  'use strict';

  var O = window.Custom2DOptions;
  var STATE_KEY = 'craftory_custom2d_state';   // giữ thiết kế khi lỡ tải lại trang
  var DRAFT_KEY = 'craftory_custom2d_draft';   // dùng tạm khi giỏ hàng của TV3 chưa sẵn sàng
  var LEAVE_MSG = 'Thiết kế của bạn chưa được thêm vào giỏ hàng. Bạn có chắc muốn rời khỏi Studio?';

  var root = null;
  var state = null;
  var savedSig = '';
  var els = {};
  var errorTimer = null;
  var zoomed = false;
  var warm = false;

  // ---------------------------------------------------------------- tiện ích
  function byId(list, id) {
    for (var i = 0; i < list.length; i++) { if (list[i].id === id) return list[i]; }
    return list[0];
  }
  function has(list, id) {
    for (var i = 0; i < list.length; i++) { if (list[i].id === id) return true; }
    return false;
  }
  function money(n) { return Number(n).toLocaleString('vi-VN') + ' đ'; }

  function defaultState() {
    var d = O.DEFAULTS;
    return { shape: d.shape, glaze: d.glaze, motif: d.motif, text: d.text };
  }

  function loadState() {
    try {
      var s = JSON.parse(sessionStorage.getItem(STATE_KEY));
      if (s && has(O.shapes, s.shape) && has(O.glazes, s.glaze) && has(O.motifs, s.motif) && typeof s.text === 'string') {
        s.text = s.text.normalize('NFC').slice(0, O.MAX_ENGRAVING);
        return s;
      }
    } catch (e) { /* bỏ qua, dùng mặc định */ }
    return defaultState();
  }

  function saveState() {
    try { sessionStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch (e) { /* bỏ qua */ }
  }

  function isDirty() { return JSON.stringify(state) !== savedSig; }

  function toast(msg, isError) {
    var el = document.createElement('div');
    el.setAttribute('role', 'status');
    el.className = 'fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] px-4 py-3 rounded-xl shadow-lg text-sm max-w-[90vw] ' +
      (isError ? 'bg-[#ffdad6] text-[#ba1a1a]' : 'bg-[#372f2b] text-[#fdeee8]');
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 3500);
  }

  // ---------------------------------------------------------------- SVG
  function svgDefs() {
    var out = '';
    O.glazes.forEach(function (g) {
      out += '<radialGradient id="c2d-g-' + g.id + '" cx="40%" cy="33%" r="68%">' +
        g.stops.map(function (s) { return '<stop offset="' + s[0] + '%" stop-color="' + s[1] + '"/>'; }).join('') +
        '</radialGradient>';
    });
    out += '<linearGradient id="c2d-spec" x1="0%" x2="100%" y1="0%" y2="0%">' +
      '<stop offset="10%" stop-color="#ffffff" stop-opacity="0.5"/>' +
      '<stop offset="30%" stop-color="#ffffff" stop-opacity="0.1"/>' +
      '<stop offset="80%" stop-color="#000000" stop-opacity="0.1"/>' +
      '<stop offset="100%" stop-color="#000000" stop-opacity="0.4"/></linearGradient>';
    out += '<pattern id="c2d-crackle-pat" width="60" height="60" patternUnits="userSpaceOnUse">' +
      '<path d="M0 20 L25 15 L40 35 L60 25 M25 15 L30 0 M40 35 L35 60 M10 45 L40 35 M0 50 L10 45" fill="none" opacity="0.45" stroke="#756255" stroke-width="0.7"/></pattern>';
    return out;
  }

  function svgMarkup() {
    var font = 'font-family="\'Playfair Display\', serif" font-weight="600" text-anchor="middle" x="150"';
    return '<svg id="c2d-svg" viewBox="0 0 300 400" xmlns="http://www.w3.org/2000/svg" role="img" ' +
      'aria-label="Xem trước tác phẩm gốm" class="w-64 sm:w-72 h-80 sm:h-96 transition-transform duration-500 ease-out" ' +
      'style="filter: drop-shadow(0 24px 28px rgba(43,35,32,0.18));">' +
      '<defs>' + svgDefs() + '</defs>' +
      '<ellipse id="c2d-shadow" cx="150" fill="#211a17" opacity="0.28" ry="8"/>' +
      '<path id="c2d-body"/>' +
      '<path id="c2d-crackle" fill="url(#c2d-crackle-pat)" opacity="0"/>' +
      '<ellipse id="c2d-lip-outer" cx="150" opacity="0.6"/>' +
      '<ellipse id="c2d-lip-inner" cx="150"/>' +
      '<path id="c2d-spec" fill="url(#c2d-spec)" opacity="0.8"/>' +
      '<g id="c2d-motif" opacity="0.85"></g>' +
      '<text id="c2d-text-shadow" ' + font + ' opacity="0.75"></text>' +
      '<text id="c2d-text" ' + font + ' opacity="0.9"></text>' +
      '</svg>';
  }

  // ---------------------------------------------------------------- Giao diện
  var BTN_ON = 'border-2 border-[#9f3c16] bg-[#ffdbcf]/30';
  var BTN_OFF = 'border border-[#dec0b7] bg-white hover:border-[#9f3c16]/60';
  var GLAZE_ON = 'border-2 border-[#38665f] bg-[#bbece2]/30';
  var GLAZE_OFF = 'border border-[#dec0b7] bg-white hover:border-[#38665f]/60';
  var SHAPE_BASE = 'relative p-3 rounded-xl transition-all flex flex-col items-center text-center cursor-pointer ';
  var GLAZE_BASE = 'p-3 rounded-xl transition-all flex flex-col items-center text-center cursor-pointer ';
  var MOTIF_BASE = 'p-3 rounded-xl transition-all flex items-center gap-3 text-left cursor-pointer ';
  var COUNTER_BASE = 'text-[11px] font-semibold px-2.5 py-1 rounded-full ';

  function panel(num, color, title, sub, badgeId, body) {
    return '<div class="bg-white rounded-2xl p-6 shadow-sm border border-[#dec0b7]/40">' +
      '<div class="flex items-center justify-between gap-3 mb-4">' +
      '<div class="flex items-center gap-2.5">' +
      '<span class="w-7 h-7 shrink-0 rounded-full text-white text-xs font-bold flex items-center justify-center" style="background:' + color + '">' + num + '</span>' +
      '<div><h2 class="font-serif text-[22px] leading-7 font-semibold text-[#211a17]">' + title + '</h2>' +
      '<p class="text-[13px] text-[#5f5b58]">' + sub + '</p></div></div>' +
      (badgeId ? '<span id="' + badgeId + '" class="text-[11px] font-semibold bg-[#f4e5e0] text-[#57423b] px-2.5 py-1 rounded-full text-right"></span>' : '') +
      '</div>' + body + '</div>';
  }

  function shapeButtons() {
    return '<div class="grid grid-cols-2 gap-3">' + O.shapes.map(function (s) {
      return '<button type="button" data-shape="' + s.id + '" aria-pressed="false">' +
        '<svg viewBox="' + s.thumb + '" class="w-16 h-16 mb-2" aria-hidden="true">' +
        '<path d="' + s.d + '" fill="#4e7c74" fill-opacity="0.18" stroke="#9f3c16" stroke-width="7" stroke-linejoin="round"/></svg>' +
        '<span class="text-xs font-semibold text-[#211a17]">' + s.name + '</span>' +
        '<span class="text-[12px] text-[#5f5b58] mt-0.5">' + s.desc + '</span></button>';
    }).join('') + '</div>';
  }

  function glazeButtons() {
    return '<div class="grid grid-cols-2 sm:grid-cols-4 gap-3">' + O.glazes.map(function (g) {
      var grad = 'linear-gradient(135deg,' + g.stops[0][1] + ',' + g.stops[1][1] + ',' + g.stops[3][1] + ')';
      return '<button type="button" data-glaze="' + g.id + '" aria-pressed="false">' +
        '<span class="w-12 h-12 rounded-full mb-2 shadow-md border border-white/60" style="background:' + grad + '"></span>' +
        '<span class="text-xs font-semibold text-[#211a17] leading-snug">' + g.name + '</span>' +
        '<span class="text-[11px] text-[#5f5b58] mt-0.5">' + g.hint + '</span></button>';
    }).join('') + '</div>';
  }

  function motifButtons() {
    return '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">' + O.motifs.map(function (m) {
      return '<button type="button" data-motif="' + m.id + '" aria-pressed="false">' +
        '<span class="w-10 h-10 rounded-lg bg-[#faebe6] flex items-center justify-center shrink-0">' +
        '<span class="material-symbols-outlined text-[#9f3c16] text-[22px]">' + m.icon + '</span></span>' +
        '<span class="min-w-0"><span class="text-xs font-semibold text-[#211a17] block truncate">' + m.name + '</span>' +
        '<span class="text-[11px] text-[#5f5b58] block truncate">' + m.desc + '</span></span></button>';
    }).join('') + '</div>';
  }

  function textStep() {
    return '<div class="space-y-2">' +
      '<div class="flex items-center justify-between">' +
      '<label for="c2d-input" class="text-xs font-semibold text-[#211a17]">Chữ khắc chìm trên thân gốm</label>' +
      '<span id="c2d-counter"></span></div>' +
      '<input id="c2d-input" type="text" autocomplete="off" aria-describedby="c2d-error" ' +
      'placeholder="Ví dụ: Tĩnh Tại, Trọng Ân, 1984..." ' +
      'class="w-full bg-[#fff8f6] text-[#211a17] text-[15px] px-4 py-3 rounded-lg border border-[#dec0b7] focus:outline-none focus:border-[#38665f] shadow-inner">' +
      '<div id="c2d-error" role="alert" class="hidden p-3 rounded-lg bg-[#ffdad6] text-[#ba1a1a] text-xs flex items-start gap-2">' +
      '<span class="material-symbols-outlined text-[18px]">error</span>' +
      '<span><strong>Tối đa ' + O.MAX_ENGRAVING + ' ký tự.</strong> Phần chữ vượt quá đã được cắt bỏ để giữ nét khắc sắc nét trên cốt đất.</span></div>' +
      '<p class="text-[12px] text-[#5f5b58]">Quy tắc khắc: tối đa ' + O.MAX_ENGRAVING + ' ký tự, gồm cả khoảng trắng.</p></div>';
  }

  function template() {
    return '' +
      '<div class="max-w-[1440px] mx-auto px-4 md:px-8 py-8">' +
      '<section class="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-[#eedfda]">' +
      '<div>' +
      '<nav aria-label="Đường dẫn trang" class="flex items-center gap-2 text-[11px] text-[#5f5b58] mb-2">' +
      '<a href="#home" data-route="home" class="hover:text-[#9f3c16] transition-colors">Trang chủ</a>' +
      '<span class="text-[#dec0b7]">/</span><span class="font-semibold text-[#211a17]">Tác chế 2D</span></nav>' +
      '<h1 class="font-serif text-3xl md:text-4xl text-[#211a17] tracking-tight">Studio Tác Chế Gốm 2D</h1>' +
      '<p class="text-[15px] text-[#57423b] max-w-2xl mt-1">Tự tay định hình dáng phôi gốm, sắc men truyền thống và khắc ghi dấu ấn độc bản của riêng bạn.</p>' +
      '</div>' +
      '<button id="c2d-reset" type="button" class="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#fff1ec] hover:bg-[#f4e5e0] text-[#211a17] text-xs font-semibold transition-colors cursor-pointer">' +
      '<span class="material-symbols-outlined text-[18px]">restart_alt</span>Làm mới / Mặc định</button>' +
      '</section>' +

      '<section class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mt-6">' +
      // ---- Cột trái: khung xem trước
      '<div class="lg:col-span-7 flex flex-col gap-4 lg:sticky lg:top-24">' +
      '<div class="relative w-full min-h-[520px] rounded-2xl bg-gradient-to-b from-white via-[#faebe6] to-[#f4e5e0] shadow-xl overflow-hidden flex flex-col justify-between p-6">' +
      '<div class="absolute inset-0 pointer-events-none opacity-20" style="background-image: radial-gradient(circle, #8a726a 1px, transparent 1px); background-size: 24px 24px;"></div>' +
      '<div class="relative z-10 flex items-center justify-between gap-2">' +
      '<span id="c2d-dim" class="px-3 py-1 rounded-full bg-white/90 shadow-sm text-[11px] text-[#211a17]"></span>' +
      '<div class="flex items-center gap-1 bg-white/80 p-1 rounded-lg shadow-sm">' +
      '<button id="c2d-zoom" type="button" title="Thu phóng" aria-label="Thu phóng" class="p-1.5 rounded hover:bg-[#faebe6] text-[#57423b] cursor-pointer"><span class="material-symbols-outlined text-[18px]">zoom_in</span></button>' +
      '<button id="c2d-light" type="button" title="Đổi ánh sáng lò nung" aria-label="Đổi ánh sáng" class="p-1.5 rounded hover:bg-[#faebe6] text-[#57423b] cursor-pointer"><span class="material-symbols-outlined text-[18px]">wb_sunny</span></button>' +
      '</div></div>' +
      '<div class="relative z-10 flex-1 flex items-center justify-center py-4">' + svgMarkup() + '</div>' +
      '<div class="relative z-10 bg-white/90 p-4 rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">' +
      '<div><div class="flex items-center gap-2"><span id="c2d-price" class="font-serif text-[22px] font-semibold text-[#211a17]"></span>' +
      '<span class="text-[13px] text-[#5f5b58]">(Tác chế theo yêu cầu)</span></div>' +
      '<p class="text-[11px] text-[#57423b] flex items-center gap-1.5 mt-0.5"><span class="material-symbols-outlined text-[#9f3c16] text-[15px]">schedule</span>' +
      'Thời gian tác chế: <strong class="text-[#211a17]">' + O.LEAD_TIME + '</strong> nung củi và vào men thủ công</p></div>' +
      '<div class="sm:text-right"><div id="c2d-sum-shape" class="text-xs font-semibold text-[#211a17]"></div>' +
      '<div id="c2d-sum-glaze" class="text-[11px] text-[#38665f]"></div></div>' +
      '</div></div></div>' +

      // ---- Cột phải: 4 bước
      '<div class="lg:col-span-5 flex flex-col gap-6">' +
      panel(1, '#9f3c16', 'Chọn Phôi Gốm', 'Định hình dáng cốt đất cơ bản', 'c2d-badge-shape', shapeButtons()) +
      panel(2, '#38665f', 'Chọn Sắc Men', 'Tinh hoa men tự nhiên qua lửa củi', 'c2d-badge-glaze', glazeButtons()) +
      panel(3, '#a23e18', 'Chọn Họa Tiết', 'Nghệ nhân khắc tay từng đường nét', 'c2d-badge-motif', motifButtons()) +
      panel(4, '#8a726a', 'Chữ Khắc Dấu Ấn', 'Khắc nét chìm thủ công trước khi nung', '', textStep()) +
      '<button id="c2d-add" type="button" class="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-xl bg-[#9f3c16] hover:bg-[#bf542c] text-white text-sm font-semibold transition-all shadow-lg active:scale-[0.99] cursor-pointer">' +
      '<span class="material-symbols-outlined text-[22px]">shopping_bag</span>' +
      '<span>Hoàn tất &amp; Thêm vào giỏ</span><span id="c2d-add-price" class="opacity-70 font-normal"></span></button>' +
      '</div></section></div>';
  }

  // ---------------------------------------------------------------- Vẽ lại theo state
  function fitText(cfg, text) {
    var n = Math.max(text.length, 1);
    var fs = Math.min(cfg.maxFont, cfg.maxW / (n * 0.78));
    fs = Math.max(7, Math.round(fs * 10) / 10);
    var ls = Math.round(fs * 0.14 * 10) / 10;
    [els.textShadow, els.text].forEach(function (t) {
      t.setAttribute('font-size', fs);
      t.setAttribute('letter-spacing', ls);
      t.textContent = text;   // textContent: an toàn, không chèn HTML
    });
  }

  function paintGroup(attr, activeId, base, on, off) {
    var btns = root.querySelectorAll('[data-' + attr + ']');
    for (var i = 0; i < btns.length; i++) {
      var isOn = btns[i].getAttribute('data-' + attr) === activeId;
      btns[i].className = base + (isOn ? on : off);
      btns[i].setAttribute('aria-pressed', isOn ? 'true' : 'false');
    }
  }

  function paint() {
    var shape = byId(O.shapes, state.shape);
    var glaze = byId(O.glazes, state.glaze);
    var motif = byId(O.motifs, state.motif);
    var len = state.text.length;

    // Thân gốm
    ['body', 'crackle', 'spec'].forEach(function (k) { els[k].setAttribute('d', shape.d); });
    els.body.setAttribute('fill', 'url(#c2d-g-' + glaze.id + ')');
    els.crackle.setAttribute('opacity', glaze.crackle ? '0.75' : '0');

    // Miệng và bóng đổ
    els.lipOuter.setAttribute('cy', shape.lip.cy);
    els.lipOuter.setAttribute('rx', shape.lip.rx);
    els.lipOuter.setAttribute('ry', shape.lip.ry);
    els.lipOuter.setAttribute('fill', glaze.lipOuter);
    els.lipInner.setAttribute('cy', shape.lip.cy);
    els.lipInner.setAttribute('rx', shape.lip.irx);
    els.lipInner.setAttribute('ry', shape.lip.iry);
    els.lipInner.setAttribute('fill', glaze.lipInner);
    els.shadow.setAttribute('cy', shape.shadow.cy);
    els.shadow.setAttribute('rx', shape.shadow.rx);

    // Họa tiết
    var m = shape.motif;
    els.motif.setAttribute('transform', 'translate(' + m.x + ' ' + m.y + ') scale(' + m.s + ') translate(-150 -235)');
    els.motif.innerHTML = motif.svg(glaze.motifStroke);

    // Chữ khắc
    fitText(shape.text, state.text);
    els.textShadow.setAttribute('y', shape.text.y + 1);
    els.text.setAttribute('y', shape.text.y);
    els.textShadow.setAttribute('fill', glaze.textShadow);
    els.text.setAttribute('fill', glaze.textColor);

    // Nút chọn
    paintGroup('shape', shape.id, SHAPE_BASE, BTN_ON, BTN_OFF);
    paintGroup('glaze', glaze.id, GLAZE_BASE, GLAZE_ON, GLAZE_OFF);
    paintGroup('motif', motif.id, MOTIF_BASE, BTN_ON, BTN_OFF);

    // Nhãn và bộ đếm
    els.dim.textContent = 'Cao ' + shape.height + ', miệng ' + shape.mouth;
    els.sumShape.textContent = shape.name;
    els.sumGlaze.textContent = glaze.name;
    els.badgeShape.textContent = shape.name;
    els.badgeGlaze.textContent = glaze.name;
    els.badgeMotif.textContent = motif.name;
    els.price.textContent = money(O.BASE_PRICE);
    els.addPrice.textContent = '| ' + money(O.BASE_PRICE);
    els.counter.textContent = len + ' / ' + O.MAX_ENGRAVING + ' ký tự';
    els.counter.className = COUNTER_BASE + (len >= O.MAX_ENGRAVING ? 'bg-[#ffdad6] text-[#ba1a1a]' : 'bg-[#fff1ec] text-[#211a17]');
  }

  // ---------------------------------------------------------------- Sự kiện
  function showLimitError() {
    els.error.classList.remove('hidden');
    clearTimeout(errorTimer);
    errorTimer = setTimeout(function () { if (els.error) els.error.classList.add('hidden'); }, 3500);
  }

  function onInput(e) {
    if (e && e.isComposing) return;   // đang gõ dấu tiếng Việt (IME), chờ gõ xong
    var v = els.input.value.normalize('NFC');
    if (v.length > O.MAX_ENGRAVING) {
      v = v.slice(0, O.MAX_ENGRAVING);
      showLimitError();
    }
    if (els.input.value !== v) els.input.value = v;
    state.text = v;
    saveState();
    paint();
  }

  function getCustomization() {
    return {
      shape: state.shape,
      glazeColor: byId(O.glazes, state.glaze).hex,
      pattern: state.motif,
      engravingText: state.text.trim()
    };
  }

  function addToCart() {
    var user = window.ApiClient ? window.ApiClient.getCurrentUser() : null;
    if (!user) {
      toast('Vui lòng đăng nhập để thêm tác phẩm vào giỏ hàng.', true);
      if (window.App && window.App.auth && typeof window.App.auth.openModal === 'function') {
        window.App.auth.openModal('login');
      }
      return;
    }

    var item = { productId: O.PRODUCT_ID, quantity: 1, customization: getCustomization() };
    var cart = window.App && window.App.cart;

    if (cart && typeof cart.addToCart === 'function') {
      // Hàm do TV3 cung cấp: addToCart(productId, quantity, customization)
      cart.addToCart(item.productId, item.quantity, item.customization);
      if (typeof cart.openDrawer === 'function') cart.openDrawer();
    } else {
      // Giỏ hàng của TV3 chưa sẵn sàng: lưu tạm để ráp sau
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(item)); } catch (e) { /* bỏ qua */ }
      toast('Đã lưu thiết kế tạm thời. Giỏ hàng của nhóm đang được kết nối.');
    }

    savedSig = JSON.stringify(state);   // đã lưu, rời trang không cần hỏi nữa
  }

  function onClick(e) {
    var btn = e.target.closest('button');
    if (!btn || !root.contains(btn)) return;

    var key;
    if ((key = btn.getAttribute('data-shape'))) { state.shape = key; }
    else if ((key = btn.getAttribute('data-glaze'))) { state.glaze = key; }
    else if ((key = btn.getAttribute('data-motif'))) { state.motif = key; }
    else if (btn.id === 'c2d-reset') {
      state = defaultState();
      els.input.value = state.text;
      els.error.classList.add('hidden');
    }
    else if (btn.id === 'c2d-zoom') {
      zoomed = !zoomed;
      els.svg.style.transform = zoomed ? 'scale(1.15)' : 'scale(1)';
      return;
    }
    else if (btn.id === 'c2d-light') {
      warm = !warm;
      els.svg.style.filter = 'drop-shadow(0 24px 28px rgba(43,35,32,0.18))' + (warm ? ' sepia(0.35) brightness(1.05)' : '');
      return;
    }
    else if (btn.id === 'c2d-add') { addToCart(); return; }
    else { return; }

    saveState();
    paint();
  }

  // E3: hỏi xác nhận khi bấm link rời Studio (bắt ở pha capture, chạy trước bộ định tuyến)
  function onDocClick(e) {
    if (!root || !root.isConnected || !isDirty()) return;
    var a = e.target.closest ? e.target.closest('a[href]') : null;
    if (!a || root.contains(a)) return;
    var href = a.getAttribute('href') || '';
    if (href.indexOf('#custom-2d') === 0) return;
    if (!window.confirm(LEAVE_MSG)) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }

  // E3: đóng tab, tải lại trang
  function onBeforeUnload(e) {
    if (root && root.isConnected && isDirty()) {
      e.preventDefault();
      e.returnValue = '';
    }
  }

  // ---------------------------------------------------------------- Mount / Unmount
  function cacheEls() {
    var q = function (id) { return root.querySelector('#' + id); };
    els = {
      svg: q('c2d-svg'), body: q('c2d-body'), crackle: q('c2d-crackle'), spec: q('c2d-spec'),
      lipOuter: q('c2d-lip-outer'), lipInner: q('c2d-lip-inner'), shadow: q('c2d-shadow'),
      motif: q('c2d-motif'), text: q('c2d-text'), textShadow: q('c2d-text-shadow'),
      input: q('c2d-input'), counter: q('c2d-counter'), error: q('c2d-error'),
      dim: q('c2d-dim'), price: q('c2d-price'), addPrice: q('c2d-add-price'),
      sumShape: q('c2d-sum-shape'), sumGlaze: q('c2d-sum-glaze'),
      badgeShape: q('c2d-badge-shape'), badgeGlaze: q('c2d-badge-glaze'), badgeMotif: q('c2d-badge-motif')
    };
  }

  function unmount() {
    if (!root) return;
    root.removeEventListener('click', onClick);
    els.input && els.input.removeEventListener('input', onInput);
    els.input && els.input.removeEventListener('compositionend', onInput);
    document.removeEventListener('click', onDocClick, true);
    window.removeEventListener('beforeunload', onBeforeUnload);
    clearTimeout(errorTimer);
    root.innerHTML = '';
    root = null;
    els = {};
  }

  function mount(container) {
    unmount();
    if (!O) { container.textContent = 'Thiếu file options.js của Studio 2D.'; return; }
    root = container;
    state = loadState();
    savedSig = JSON.stringify(defaultState());
    zoomed = false;
    warm = false;

    root.innerHTML = template();
    cacheEls();
    els.input.value = state.text;

    root.addEventListener('click', onClick);
    els.input.addEventListener('input', onInput);
    els.input.addEventListener('compositionend', onInput);
    document.addEventListener('click', onDocClick, true);
    window.addEventListener('beforeunload', onBeforeUnload);

    paint();
  }

  window.Custom2D = {
    route: 'custom-2d',
    mount: mount,
    unmount: unmount,
    getCustomization: function () { return state ? getCustomization() : null; },
    hasUnsavedChanges: function () { return !!state && isDirty(); }
  };
})(window);