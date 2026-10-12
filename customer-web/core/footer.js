/**
 * ============================================================================
 * [DÙNG CHUNG CẢ NHÓM - NỀN TẢNG BỞI THÀNH VIÊN 1]
 * Footer Component (core/footer.js)
 * Phương pháp: Áp dụng Slide 02 (Nguyên tắc thiết kế: Bố cục Header-Menu-Content-Logo,
 * không để trang cụt, luôn có liên kết định hướng)
 * ============================================================================
 */

(function(window) {
  'use strict';

  var Footer = {
    render: function() {
      var footerEl = document.getElementById('site-footer');
      if (!footerEl) return;

      var html = [
        '<div class="max-w-[1440px] mx-auto px-4 md:px-8 py-12 grid grid-cols-1 md:grid-cols-12 gap-8 text-[#57423b]">',
        '  <div class="md:col-span-5 space-y-3">',
        '    <div class="flex items-center gap-2">',
        '      <div class="w-8 h-8 rounded-full bg-[#9f3c16] flex items-center justify-center text-white font-bold text-sm">M</div>',
        '      <span class="font-serif text-2xl font-bold text-[#211a17]">Gốm Mộc</span>',
        '    </div>',
        '    <p class="text-sm leading-relaxed max-w-md">Không gian lưu giữ và phát triển nét đẹp tĩnh tại của gốm thủ công Việt Nam. Mỗi dáng hình là sự hòa quyện nhịp nhàng giữa đất sét phù sa nguyên bản, lửa lò nung củi và tâm huyết người thợ gốm.</p>',
        '    <p class="text-xs text-[#5f5b58]">Xưởng chế tác: Làng nghề Bát Tràng, Gia Lâm, Hà Nội</p>',
        '  </div>',
        '',
        '  <div class="md:col-span-3 space-y-3">',
        '    <h4 class="font-serif text-lg font-bold text-[#211a17]">Tác Phẩm & Tuyển Tập</h4>',
        '    <ul class="space-y-2 text-sm">',
        '      <li><a href="#products" data-route="products" class="hover:text-[#9f3c16] transition-colors">Bình hoa dáng cổ & men lam</a></li>',
        '      <li><a href="#products" data-route="products" class="hover:text-[#9f3c16] transition-colors">Bộ chén trà đạo sa mộc</a></li>',
        '      <li><a href="#products" data-route="products" class="hover:text-[#9f3c16] transition-colors">Bộ sưu tập Men Ngọc Thủy Trúc</a></li>',
        '      <li><a href="#custom-2d" data-route="custom-2d" class="hover:text-[#9f3c16] transition-colors">Studio thiết kế phôi 2D</a></li>',
        '    </ul>',
        '  </div>',
        '',
        '  <div class="md:col-span-4 space-y-3">',
        '    <h4 class="font-serif text-lg font-bold text-[#211a17]">Tư Vấn Thưởng Lãm</h4>',
        '    <p class="text-sm">Dành cho kiến trúc sư, người sưu tầm và người yêu nét đẹp gốm truyền thống.</p>',
        '    <p class="text-xs">Hòm thư: <a href="mailto:huongluom@gommoc.vn" class="text-[#9f3c16] underline">huongluom@gommoc.vn</a></p>',
        '    <p class="text-xs">Đường dây nóng: <strong>(+84) 912 345 678</strong></p>',
        '    <p class="text-xs text-[#5f5b58]">Thời gian mở cửa: 09:00 - 18:00 (Thứ Hai - Chủ Nhật)</p>',
        '  </div>',
        '</div>',
        '<div class="border-t border-[#dec0b7] pt-6 pb-2 flex flex-col sm:flex-row items-center justify-between text-xs text-[#5f5b58] gap-4">',
        '  <div>© 2026 Gốm Mộc. Tác chế thủ công nguyên bản tại Việt Nam. Đồ án Nhóm 13.</div>',
        '  <div class="flex items-center gap-4">',
        '    <a href="#home" data-route="home" class="hover:text-[#9f3c16] transition-colors">Tuyên ngôn thẩm mỹ</a>',
        '    <span class="text-[#dec0b7]">•</span>',
        '    <a href="#home" data-route="home" class="hover:text-[#9f3c16] transition-colors">Quy chuẩn cốt đất & men</a>',
        '  </div>',
        '</div>'
      ].join('\n');

      footerEl.innerHTML = html;
    }
  };

  window.Footer = Footer;
})(window);
