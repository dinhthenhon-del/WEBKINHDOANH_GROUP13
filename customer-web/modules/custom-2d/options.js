/**
 * ============================================================================
 * [THÀNH VIÊN 4 - CUSTOM 2D & CHATBOT AI]
 * Cấu hình Studio Tác chế 2D (modules/custom-2d/options.js)
 * Nhiệm vụ: Khai báo danh sách dáng phôi, sắc men, họa tiết dùng cho Studio.
 * Viết theo kiểu IIFE + biến toàn cục (giống api.js, navbar.js) nên nhúng bằng
 * thẻ <script> thường, không cần type="module".
 * ============================================================================
 */

(function (window) {
  'use strict';

  // ---- Họa tiết: trả về chuỗi SVG theo hệ tọa độ của bình (viewBox 300x400), tâm (150, 235) ----
  function bamboo(c) {
    return '<g fill="none" stroke="' + c + '" stroke-linecap="round" stroke-width="2.2">' +
      '<path d="M142 165 C140 195 137 235 135 270"/>' +
      '<path d="M158 175 C162 205 165 240 168 280"/>' +
      '<path d="M138 200 C143 199 146 200 146 201" stroke-width="3"/>' +
      '<path d="M134 235 C139 234 142 235 142 236" stroke-width="3"/>' +
      '<path d="M157 210 C162 209 166 211 167 212" stroke-width="3"/>' +
      '<path d="M162 245 C167 244 171 246 172 247" stroke-width="3"/>' +
      '<path d="M144 200 Q125 190 110 198" fill="' + c + '" fill-opacity="0.75"/>' +
      '<path d="M144 200 Q128 208 114 212" fill="' + c + '" fill-opacity="0.75"/>' +
      '<path d="M165 210 Q180 200 195 204" fill="' + c + '" fill-opacity="0.75"/>' +
      '<path d="M166 245 Q188 238 202 248" fill="' + c + '" fill-opacity="0.75"/>' +
      '</g>';
  }

  function lotus(c) {
    return '<g fill="none" stroke="' + c + '" stroke-linecap="round" stroke-width="2">' +
      '<path d="M150 260 C150 220 135 205 150 180 C165 205 150 220 150 260" fill="' + c + '" fill-opacity="0.25"/>' +
      '<path d="M150 255 C125 240 115 215 130 195 C138 220 148 245 150 255"/>' +
      '<path d="M150 255 C175 240 185 215 170 195 C162 220 152 245 150 255"/>' +
      '<path d="M120 270 Q150 285 180 270" stroke-width="1.6"/>' +
      '<path d="M110 280 Q150 295 190 280" stroke-width="1.6"/>' +
      '</g>';
  }

  function clouds(c) {
    return '<g fill="none" stroke="' + c + '" stroke-linecap="round" stroke-width="2.2">' +
      '<path d="M115 220 C125 205 145 205 152 218 C160 205 180 208 185 224 C190 236 175 248 160 248 L125 248 C110 248 105 232 115 220 Z" fill="' + c + '" fill-opacity="0.2"/>' +
      '<path d="M130 258 C140 250 160 250 170 258"/>' +
      '<path d="M120 270 C135 264 165 264 180 270"/>' +
      '</g>';
  }

  function none() { return ''; }

  window.Custom2DOptions = {
    MAX_ENGRAVING: 20,          // UC-C04 (E1): tối đa 20 ký tự khắc chữ
    BASE_PRICE: 1650000,        // Giá tạm theo mockup Stitch, chờ nhóm chốt
    LEAD_TIME: '5 - 7 ngày',
    PRODUCT_ID: null,           // TODO: TV2 cung cấp _id của sản phẩm có custom2DEnabled: true

    DEFAULTS: { shape: 'teardrop', glaze: 'celadon', motif: 'bamboo', text: 'An Yên Mộc Sắc' },

    // d: đường vẽ thân gốm | lip: miệng gốm | shadow: bóng đổ dưới chân
    // text: vị trí và cỡ chữ khắc tối đa | motif: vị trí/tỉ lệ họa tiết | thumb: viewBox ảnh nhỏ
    shapes: [
      {
        id: 'teardrop', name: 'Bình Giọt Nước', desc: 'Dáng thanh cao lãng mạn', height: '26cm', mouth: '7cm',
        d: 'M130 50 C130 50, 140 48, 150 48 C160 48, 170 50, 170 50 C172 75, 166 110, 176 140 C195 185, 235 230, 235 285 C235 340, 195 365, 150 365 C105 365, 65 340, 65 285 C65 230, 105 185, 124 140 C134 110, 128 75, 130 50 Z',
        lip: { cy: 50, rx: 20, ry: 5, irx: 17, iry: 3.5 },
        shadow: { cy: 362, rx: 60 },
        text: { y: 305, maxW: 130, maxFont: 15 },
        motif: { x: 150, y: 235, s: 1 },
        thumb: '55 40 190 335'
      },
      {
        id: 'teapot', name: 'Ấm Trà Quai Mây', desc: 'Trà đạo tĩnh tại', height: '15cm', mouth: '9cm',
        d: 'M115 140 L185 140 C215 150, 230 200, 220 250 C210 275, 185 295, 150 295 C115 295, 90 275, 80 250 C70 200, 85 150, 115 140 Z',
        lip: { cy: 140, rx: 35, ry: 6, irx: 30, iry: 4 },
        shadow: { cy: 297, rx: 70 },
        text: { y: 275, maxW: 105, maxFont: 14 },
        motif: { x: 150, y: 208, s: 0.7 },
        thumb: '70 130 160 175'
      },
      {
        id: 'jar', name: 'Chum Gốm Nắp Tròn', desc: 'Tụ khí vượng tài', height: '22cm', mouth: '12cm',
        d: 'M110 90 L190 90 C220 120, 240 180, 235 240 C230 300, 195 350, 150 350 C105 350, 70 300, 65 240 C60 180, 80 120, 110 90 Z',
        lip: { cy: 90, rx: 40, ry: 7, irx: 35, iry: 5 },
        shadow: { cy: 352, rx: 75 },
        text: { y: 300, maxW: 130, maxFont: 15 },
        motif: { x: 150, y: 200, s: 0.85 },
        thumb: '55 80 190 280'
      },
      {
        id: 'plate', name: 'Đĩa Tròn Viền Mộc', desc: 'Thưởng vị tao nhã', height: '4cm', mouth: '28cm',
        d: 'M40 245 C40 222 260 222 260 245 C260 268 210 288 150 288 C90 288 40 268 40 245 Z',
        lip: { cy: 245, rx: 104, ry: 18, irx: 90, iry: 13 },
        shadow: { cy: 297, rx: 110 },
        text: { y: 281, maxW: 140, maxFont: 11 },
        motif: { x: 150, y: 245, s: 0.3 },
        thumb: '30 215 240 90'
      }
    ],

    // hex: giá trị gửi vào customization.glazeColor
    glazes: [
      {
        id: 'celadon', name: 'Men Ngọc Celadon', hint: 'Xanh ngọc trầm', hex: '#4e7c74',
        stops: [[0, '#93cac0'], [35, '#4e7c74'], [75, '#38665f'], [100, '#23423d']],
        textShadow: '#11221f', textColor: '#d9eee8', motifStroke: '#1f4e47',
        lipOuter: '#23423d', lipInner: '#1b2a27', crackle: false
      },
      {
        id: 'terracotta', name: 'Mộc Sa Phù Sa', hint: 'Đất nung ấm hạt', hex: '#c85a32',
        stops: [[0, '#e8916e'], [40, '#c85a32'], [80, '#9f3c16'], [100, '#5a200a']],
        textShadow: '#3d1204', textColor: '#ffdbcf', motifStroke: '#4a1705',
        lipOuter: '#5a200a', lipInner: '#3d1204', crackle: false
      },
      {
        id: 'ivory', name: 'Men Rạn Bạch Lạc', hint: 'Trắng ngà vân rạn', hex: '#e2d2c3',
        stops: [[0, '#ffffff'], [30, '#fdf5ec'], [70, '#e2d2c3'], [100, '#b69f8c']],
        textShadow: '#6e5d50', textColor: '#211a17', motifStroke: '#5a4638',
        lipOuter: '#b69f8c', lipInner: '#6e5d50', crackle: true
      },
      {
        id: 'woodfire', name: 'Hỏa Biến Nung Củi', hint: 'Nâu rêu trầm cổ', hex: '#5f4e3b',
        stops: [[0, '#967d64'], [45, '#5f4e3b'], [85, '#372f2b'], [100, '#1e1815']],
        textShadow: '#14100d', textColor: '#eedfda', motifStroke: '#251e18',
        lipOuter: '#1e1815', lipInner: '#14100d', crackle: false
      }
    ],

    // id của họa tiết được gửi vào customization.pattern
    motifs: [
      { id: 'bamboo', name: 'Trúc Vân Khắc Chìm', desc: 'Khí phách quân tử kiên định', icon: 'spa', svg: bamboo },
      { id: 'lotus', name: 'Sen Cổ Dáng Nước', desc: 'Thanh tịnh an nhiên', icon: 'local_florist', svg: lotus },
      { id: 'clouds', name: 'Mây Lượn Thủy Tộc', desc: 'Vũ điệu sóng nước mây trôi', icon: 'air', svg: clouds },
      { id: 'none', name: 'Trơn Tối Giản', desc: 'Tôn vinh chất đất và độ rạn', icon: 'radio_button_unchecked', svg: none }
    ]
  };
})(window);