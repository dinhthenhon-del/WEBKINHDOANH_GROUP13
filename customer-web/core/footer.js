document.addEventListener('DOMContentLoaded', function () {
  const footerContainer = document.getElementById('footer-container');
  if (!footerContainer) return;

  footerContainer.innerHTML = `
    <footer class="w-full bg-surface-container-low pt-space-xl pb-space-lg shadow-[0_-1px_0_rgba(10,37,64,0.06)] border-t border-outline-variant/30">
      <div class="max-w-7xl mx-auto px-margin-tablet lg:px-margin-desktop">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-xl mb-space-xl">
          <!-- Cột 1: Thương hiệu -->
          <div>
            <div class="flex items-center gap-3 mb-space-sm">
              <div class="w-12 h-12 rounded-xl border border-[#0A2540]/20 bg-[#8c582f] overflow-hidden flex items-center justify-center shrink-0 shadow-sm">
                <img class="w-full h-full object-cover" src="assets/img/logo.png" alt="Làng Gốm Thanh Xuân Logo">
              </div>
              <div class="flex flex-col">
                <span class="font-headline-sm text-lg font-bold text-primary block leading-tight font-['Playfair_Display',serif]">Làng gốm Thanh Xuân</span>
                <span class="font-label-sm text-[11px] text-[#a23e18] font-bold tracking-[0.14em] uppercase leading-tight mt-0.5">KỶ NGUYÊN NGHỆ THUẬT GỐM SỨ</span>
              </div>
            </div>
            <p class="font-body-sm text-on-surface-variant leading-relaxed mt-3">
              Kế thừa ngọn lửa hỏa biến và bí truyền xương đất phù sa sông Hồng. Từng tác phẩm là hội tụ của thủ công ngự tác, men ngọc thanh cao và phẩm vị nghệ thuật trường tồn cùng thời gian.
            </p>
          </div>

          <!-- Cột 2: Không gian trưng bày -->
          <div>
            <h4 class="font-title-md text-primary mb-space-md uppercase tracking-wider font-semibold">KHÔNG GIAN TRƯNG BÀY</h4>
            <ul class="space-y-space-sm font-body-sm text-on-surface-variant">
              <li>
                <strong class="text-on-surface block font-semibold">Lò Bầu Di Sản:</strong>
                Thôn 1 Giang Cao, Làng Cổ Bát Tràng, Gia Lâm, Hà Nội
              </li>
              <li>
                <strong class="text-on-surface block font-semibold">Bảo Phủ Giám Tuyển:</strong>
                Tầng 2, 24 Tràng Tiền, Quận Hoàn Kiếm, Hà Nội
              </li>
              <li class="pt-1">
                <span class="font-label-sm text-[#a23e18] font-bold uppercase tracking-wider">GIỜ MỞ CỬA:</span> 08:30 – 21:00 hàng ngày
              </li>
            </ul>
          </div>

          <!-- Cột 3: Ngự tác & Kỷ luật lò -->
          <div>
            <h4 class="font-title-md text-primary mb-space-md uppercase tracking-wider font-semibold">NGỰ TÁC &amp; KỶ LUẬT LÒ</h4>
            <ul class="space-y-space-sm font-body-sm text-on-surface-variant">
              <li>Nung hoàn toàn củi gỗ tự nhiên 1.380°C liên tục 72 giờ</li>
              <li>Nghệ nhân thâm niên trên 25 năm tay nghề ngự tác</li>
              <li>Mỗi tác phẩm giới hạn đi kèm triện ấn và chứng thư bảo vật</li>
              <li>Bảo hành men vĩnh cửu &amp; chuyển phát nguyên đai chống sốc</li>
            </ul>
          </div>

          <!-- Cột 4: Giám tuyển hỗ trợ -->
          <div>
            <h4 class="font-title-md text-primary mb-space-md uppercase tracking-wider font-semibold">GIÁM TUYỂN HỖ TRỢ</h4>
            <p class="font-body-sm text-on-surface-variant mb-space-sm">
              Tổng đài tư vấn bài trí phong thủy kiến trúc và quà tặng bang giao:
            </p>
            <a class="font-headline-sm text-2xl text-[#a23e18] block font-bold tracking-tight mb-space-sm hover:underline" href="tel:18001705">
              1800 1705
            </a>
            <p class="font-body-sm text-on-surface-variant font-medium">
              Thuongkhach@langgomthanhxuan.vn
            </p>
          </div>
        </div>

        <!-- Thanh bản quyền đáy footer -->
        <div class="flex flex-col md:flex-row items-center justify-between pt-space-md border-t border-outline-variant/30 font-body-sm text-on-surface-variant gap-3">
          <p class="text-[13px]">
            © Làng gốm Thanh Xuân. Giữ trọn tinh hoa di sản gốm Việt Nam.
          </p>
          <div class="flex gap-space-md font-label-sm uppercase tracking-wider">
            <a class="hover:text-primary transition-colors font-medium cursor-pointer" onclick="alert('Điều khoản thượng khách đang cập nhật')">
              ĐIỀU KHOẢN THƯƠNG KHÁCH
            </a>
            <a class="hover:text-primary transition-colors font-medium cursor-pointer" onclick="alert('Chính sách bảo vật & bảo hành men vĩnh cửu')">
              CHÍNH SÁCH BẢO VẬT
            </a>
          </div>
        </div>
      </div>
    </footer>
  `;
});
