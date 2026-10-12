/**
 * ============================================================================
 * [THÀNH VIÊN 1 - NỘI DUNG VĂN HÓA & TRANG CHỦ STORYTELLING]
 * Storytelling Module (modules/content/tv1_storytelling.js)
 * Kỹ thuật áp dụng:
 *   - Slide 10: XML và DOM Parser (getElementsByTagName, childNodes, textContent)
 *   - Slide 02: Bố cục trực quan thẩm mỹ cao, micro-interactions, responsive
 *   - Tích hợp 100% các thành phần từ bản thiết kế Stitch (Project 5031164702475329260):
 *       1. Hero Section (Brand, Slogan, Tagline, 3 Touchpoints, Featured Artwork)
 *       2. Interactive 2D Studio Banner (Quy trình 3 bước, SVG tương tác, Swatches)
 *       3. Featured Collection Showcase (Men Ngọc Thủy Trúc, Lưới 4 tác phẩm)
 *       4. Crafting Philosophy & Guarantees (3 Trụ cột nung củi, triện, bảo hiểm)
 *       5. Newsletter & Kiln Firing Notice (Đăng ký nhận tin ra lò mẻ gốm mới)
 *       6. Floating Artisan Chatbot Action (Nút hỗ trợ trực tuyến góc phải)
 * ============================================================================
 */

(function(window) {
  'use strict';

  var Tv1Storytelling = {
    // Trích xuất an toàn text từ node XML
    getNodeValue: function(parentNode, tagName, defaultValue) {
      if (!parentNode) return defaultValue || '';
      var el = parentNode.getElementsByTagName(tagName)[0];
      return (el && el.textContent) ? el.textContent.trim() : (defaultValue || '');
    },

    /**
     * Phân tích tệp XML storytelling.xml thành đối tượng cấu trúc dữ liệu JavaScript
     * Áp dụng chính xác kỹ thuật Slide 10 (XML Document Object Model)
     */
    parseXmlData: function(xmlDoc) {
      var data = {
        brand: {
          name: 'Gốm Mộc',
          slogan: 'Tĩnh Tại Trong Từng <span class="italic text-[#9f3c16]">Thớ Đất</span> & Ngọn Lửa Nung Củi.',
          tagline: 'Nghệ thuật gốm nung củi Bát Tràng',
          description: 'Mỗi dáng hình là sự hòa quyện nhịp nhàng giữa cốt đất sét phù sa sông Hồng, ngọn lửa lò củi 1.300°C và tâm huyết trầm tích của người thợ gốm.',
          artisan: 'Nghệ nhân Bát Tràng',
          foundedYear: '1474',
          village: 'Làng nghề Bát Tràng, Gia Lâm, Hà Nội'
        },
        touchpoints: [],
        featuredArtwork: {
          category: 'Tác phẩm tiêu biểu',
          name: 'Bộ Thưởng Trà Men Ngọc & Sa Mộc',
          detail: 'Nung củi bạch đàn 72 giờ tại lò Bát Tràng, vân rạn chỉ mộc độc bản.',
          image: 'https://lh3.googleusercontent.com/aida/AEtjO1Whp2dQjvCO5gOchX8Wd8u4VpPTWdFWckJ7ocTPRAUgRYp14ndLwL5XwG1xJqAyhpt3s2L3AN_rdAF42zfrRalEjC8VCiAhG8V68Dhly8gR104KEFTKi_9fIN5v8YdlT6Z7rEFn9dZlXAdmblX10fN01Ev4Ibcvxo46hXNkLWnhBbCc0se_f1Bd6Sgb65VWjByPQjaYYaA0sY_yx48RJxrkRF1EAQDc-rKjM9eVMKO84yFJrlY0FOKozA'
        },
        custom2dStudio: {
          badge: 'Trải Nghiệm Độc Quyền',
          title: 'Studio Thiết Kế 2D: Tác Chế Dáng Gốm Riêng Biệt',
          description: 'Tự tay vuốt chỉnh dáng cong, lựa chọn chất men ngọc hay men rạn cổ điển, và khắc tên riêng của bạn vào đáy gốm trước khi lò nung đỏ lửa.',
          steps: []
        },
        featuredCollection: {
          badge: 'Tuyển Tập Kinh Điển',
          name: 'Bộ Sưu Tập Men Ngọc Thủy Trúc',
          story: 'Sắc ngọc lam trầm mặc lấy cảm hứng từ rặng trúc ven hồ cổ. Mỗi tác phẩm được phủ men tro trấu tự nhiên, tạo lớp vân rạn rêu phong trường tồn.',
          items: []
        },
        philosophies: {
          heading: 'Đất Lành Nung Lửa Thật',
          subheading: 'Triết Lý Cốt Gốm Mộc',
          intro: 'Chúng tôi giữ nguyên những vết gồ ghề của ngón tay người thợ, đốm tro bay bám trên bề mặt men ngọc như một minh chứng sống động của tính nguyên bản.',
          pillars: []
        },
        newsletter: {
          badge: 'Thưởng Lãm Mẻ Gốm Mới',
          title: 'Đăng Ký Nhận Tin Ra Lò Mỗi Tháng',
          description: 'Mỗi mẻ nung chỉ cho ra khoảng 30–50 tác phẩm độc bản. Để lại hòm thư điện tử để chúng tôi gửi lời mời thưởng lãm sớm nhất.',
          buttonText: 'Nhận thông báo',
          privacyNotice: 'Cam kết tuyệt đối không spam. Bạn có thể hủy đăng ký bất kỳ lúc nào.'
        }
      };

      if (!xmlDoc) return data;

      var self = this;

      // 1. Trích xuất Brand
      var brandEl = xmlDoc.getElementsByTagName('brand')[0];
      if (brandEl) {
        data.brand.name = self.getNodeValue(brandEl, 'name', data.brand.name);
        data.brand.tagline = self.getNodeValue(brandEl, 'tagline', data.brand.tagline);
        data.brand.description = self.getNodeValue(brandEl, 'description', data.brand.description);
        data.brand.artisan = self.getNodeValue(brandEl, 'artisan', data.brand.artisan);
        data.brand.village = self.getNodeValue(brandEl, 'village', data.brand.village);
      }

      // 2. Trích xuất Touchpoints
      var tpNodes = xmlDoc.getElementsByTagName('touchpoints')[0]
        ? xmlDoc.getElementsByTagName('touchpoints')[0].getElementsByTagName('item')
        : [];
      for (var i = 0; i < tpNodes.length; i++) {
        var node = tpNodes[i];
        data.touchpoints.push({
          id: node.getAttribute('id') || ('tp-' + i),
          icon: self.getNodeValue(node, 'icon', 'landscape'),
          title: self.getNodeValue(node, 'title', ''),
          subtitle: self.getNodeValue(node, 'subtitle', ''),
          description: self.getNodeValue(node, 'description', '')
        });
      }

      // 3. Trích xuất Featured Artwork
      var artEl = xmlDoc.getElementsByTagName('featuredArtworks')[0]
        ? xmlDoc.getElementsByTagName('featuredArtworks')[0].getElementsByTagName('artwork')[0]
        : null;
      if (artEl) {
        data.featuredArtwork.category = self.getNodeValue(artEl, 'category', data.featuredArtwork.category);
        data.featuredArtwork.name = self.getNodeValue(artEl, 'name', data.featuredArtwork.name);
        data.featuredArtwork.detail = self.getNodeValue(artEl, 'detail', data.featuredArtwork.detail);
        data.featuredArtwork.image = self.getNodeValue(artEl, 'image', data.featuredArtwork.image);
      }

      // 4. Trích xuất Custom 2D Studio
      var studioEl = xmlDoc.getElementsByTagName('custom2dStudio')[0];
      if (studioEl) {
        data.custom2dStudio.badge = self.getNodeValue(studioEl, 'badge', data.custom2dStudio.badge);
        data.custom2dStudio.title = self.getNodeValue(studioEl, 'title', data.custom2dStudio.title);
        data.custom2dStudio.description = self.getNodeValue(studioEl, 'description', data.custom2dStudio.description);

        var stepNodes = studioEl.getElementsByTagName('step');
        for (var s = 0; s < stepNodes.length; s++) {
          var stepNode = stepNodes[s];
          data.custom2dStudio.steps.push({
            number: stepNode.getAttribute('number') || ('0' + (s + 1)),
            title: self.getNodeValue(stepNode, 'title', ''),
            desc: self.getNodeValue(stepNode, 'desc', '')
          });
        }
      }

      // 5. Trích xuất Featured Collection
      var collEl = xmlDoc.getElementsByTagName('featuredCollection')[0];
      if (collEl) {
        data.featuredCollection.badge = self.getNodeValue(collEl, 'badge', data.featuredCollection.badge);
        data.featuredCollection.name = self.getNodeValue(collEl, 'name', data.featuredCollection.name);
        data.featuredCollection.story = self.getNodeValue(collEl, 'story', data.featuredCollection.story);

        var prodNodes = collEl.getElementsByTagName('product');
        for (var p = 0; p < prodNodes.length; p++) {
          var prod = prodNodes[p];
          data.featuredCollection.items.push({
            id: prod.getAttribute('id') || ('prod-' + p),
            name: self.getNodeValue(prod, 'name', ''),
            shape: self.getNodeValue(prod, 'shape', ''),
            detail: self.getNodeValue(prod, 'detail', ''),
            priceFormatted: self.getNodeValue(prod, 'priceFormatted', '1.200.000 đ'),
            badge: self.getNodeValue(prod, 'badge', 'Độc bản nung củi'),
            image: self.getNodeValue(prod, 'image', '')
          });
        }
      }

      // 6. Trích xuất Philosophies
      var philEl = xmlDoc.getElementsByTagName('philosophies')[0];
      if (philEl) {
        data.philosophies.heading = self.getNodeValue(philEl, 'heading', data.philosophies.heading);
        data.philosophies.subheading = self.getNodeValue(philEl, 'subheading', data.philosophies.subheading);
        data.philosophies.intro = self.getNodeValue(philEl, 'intro', data.philosophies.intro);

        var pilNodes = philEl.getElementsByTagName('pillar');
        for (var k = 0; k < pilNodes.length; k++) {
          var pil = pilNodes[k];
          data.philosophies.pillars.push({
            id: pil.getAttribute('id') || ('pil-' + k),
            icon: self.getNodeValue(pil, 'icon', 'mode_heat'),
            title: self.getNodeValue(pil, 'title', ''),
            content: self.getNodeValue(pil, 'content', ''),
            badge: self.getNodeValue(pil, 'badge', '')
          });
        }
      }

      // 7. Trích xuất Newsletter
      var newsEl = xmlDoc.getElementsByTagName('newsletter')[0];
      if (newsEl) {
        data.newsletter.badge = self.getNodeValue(newsEl, 'badge', data.newsletter.badge);
        data.newsletter.title = self.getNodeValue(newsEl, 'title', data.newsletter.title);
        data.newsletter.description = self.getNodeValue(newsEl, 'description', data.newsletter.description);
        data.newsletter.buttonText = self.getNodeValue(newsEl, 'buttonText', data.newsletter.buttonText);
        data.newsletter.privacyNotice = self.getNodeValue(newsEl, 'privacyNotice', data.newsletter.privacyNotice);
      }

      return data;
    },

    /**
     * Render toàn bộ trang Storytelling / Trang Chủ khớp chuẩn 100% Mockup Stitch
     */
    render: function(containerEl, xmlDoc) {
      var d = this.parseXmlData(xmlDoc);

      // 1. Touchpoints HTML
      var touchpointsHtml = '';
      if (d.touchpoints.length > 0) {
        touchpointsHtml = d.touchpoints.map(function(tp, idx) {
          var colorClass = idx === 1 ? 'text-[#38665f]' : 'text-[#9f3c16]';
          return [
            '<div class="flex items-start gap-2.5 p-3 rounded-lg bg-white shadow-sm border border-[#faebe6]/60">',
            '  <span class="material-symbols-outlined ' + colorClass + ' text-[22px] mt-0.5">' + tp.icon + '</span>',
            '  <div class="flex flex-col">',
            '    <span class="text-xs font-bold text-[#211a17] leading-tight">' + tp.title + '</span>',
            '    <span class="text-[11px] text-[#57423b] mt-0.5">' + tp.subtitle + '</span>',
            '  </div>',
            '</div>'
          ].join('\n');
        }).join('\n');
      }

      // 2. Pillars Triết lý HTML
      var pillarsHtml = '';
      if (d.philosophies.pillars.length > 0) {
        pillarsHtml = d.philosophies.pillars.map(function(pil, idx) {
          var iconColor = idx === 1 ? 'text-[#38665f]' : 'text-[#9f3c16]';
          return [
            '<div class="bg-white p-8 rounded-xl shadow-sm border border-[#dec0b7]/60 flex flex-col items-center text-center space-y-4 hover:shadow-md transition-shadow">',
            '  <div class="w-16 h-16 rounded-full bg-[#faebe6] flex items-center justify-center ' + iconColor + '">',
            '    <span class="material-symbols-outlined text-[32px]">' + pil.icon + '</span>',
            '  </div>',
            '  <h3 class="font-serif text-xl font-bold text-[#211a17]">' + pil.title + '</h3>',
            '  <p class="text-xs text-[#57423b] leading-relaxed flex-grow">' + pil.content + '</p>',
            '  <span class="text-[11px] font-bold uppercase tracking-wider text-[#38665f] mt-auto block pt-2">' + pil.badge + '</span>',
            '</div>'
          ].join('\n');
        }).join('\n');
      }

      // 3. Featured Collection 4 Sản phẩm
      var productsHtml = '';
      if (d.featuredCollection.items.length > 0) {
        productsHtml = d.featuredCollection.items.map(function(prod, idx) {
          var badgeBg = idx % 2 === 0 ? 'bg-[#38665f] text-white' : 'bg-[#9f3c16] text-white';
          return [
            '<div class="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between border border-[#dec0b7]/50">',
            '  <div class="relative w-full aspect-[4/5] bg-[#faebe6] overflow-hidden">',
            '    <img src="' + prod.image + '" alt="' + prod.name + '" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out">',
            '    <div class="absolute top-3 left-3 px-2.5 py-1 rounded-md ' + badgeBg + ' text-[11px] font-bold tracking-wide">',
            '      ' + prod.badge,
            '    </div>',
            '    <button type="button" aria-label="Thêm vào yêu thích" class="btn-favorite-item absolute top-3 right-3 w-8 h-8 rounded-full bg-white/85 backdrop-blur hover:bg-white text-[#57423b] hover:text-[#9f3c16] flex items-center justify-center transition-colors shadow-sm cursor-pointer">',
            '      <span class="material-symbols-outlined text-[18px]">favorite</span>',
            '    </button>',
            '  </div>',
            '  <div class="p-5 flex flex-col justify-between flex-grow">',
            '    <div class="space-y-1">',
            '      <span class="text-[11px] font-medium text-[#5f5b58] block">' + prod.shape + '</span>',
            '      <h3 class="font-serif text-base font-bold text-[#211a17] line-clamp-1 group-hover:text-[#9f3c16] transition-colors">' + prod.name + '</h3>',
            '      <p class="text-xs text-[#57423b] line-clamp-1">' + prod.detail + '</p>',
            '    </div>',
            '    <div class="pt-4 mt-3 flex items-center justify-between border-t border-[#faebe6]/80">',
            '      <span class="text-sm font-bold text-[#9f3c16]">' + prod.priceFormatted + '</span>',
            '      <a href="#products" data-route="products" class="p-2 rounded-lg bg-[#faebe6] hover:bg-[#dec0b7] text-[#211a17] transition-colors" title="Xem chi tiết tác phẩm">',
            '        <span class="material-symbols-outlined text-[18px]">visibility</span>',
            '      </a>',
            '    </div>',
            '  </div>',
            '</div>'
          ].join('\n');
        }).join('\n');
      }

      var fullHtml = [
        '<div class="flex flex-col w-full fade-in">',

        '  <!-- ======================================================== -->',
        '  <!-- 1. HERO SECTION (Brand Story, Slogan & Tác phẩm nung củi) -->',
        '  <!-- ======================================================== -->',
        '  <section class="relative w-full overflow-hidden">',
        '    <div class="absolute -top-32 left-1/2 -translate-x-1/2 w-[840px] h-[480px] bg-gradient-to-b from-[#9f3c16]/10 via-[#bbece2]/20 to-transparent blur-3xl pointer-events-none -z-10"></div>',
        '    <div class="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-12 pt-6 md:pt-10 pb-16 lg:pb-24">',
        '      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">',
        '        <!-- Cột Nội Dung & Thông Điệp Nghệ Thuật -->',
        '        <div class="lg:col-span-6 flex flex-col justify-center space-y-4">',
        '          <div class="inline-flex items-center gap-2 self-start px-3.5 py-1.5 rounded-full bg-[#f4e5e0] text-[#9f3c16]">',
        '            <span class="w-2 h-2 rounded-full bg-[#9f3c16] animate-pulse"></span>',
        '            <span class="text-xs font-bold uppercase tracking-widest">' + d.brand.tagline + '</span>',
        '          </div>',
        '          <h1 class="font-serif text-4xl sm:text-5xl lg:text-6xl text-[#211a17] tracking-tight leading-tight">',
        '            ' + d.brand.slogan,
        '          </h1>',
        '          <p class="text-base sm:text-lg text-[#57423b] max-w-xl leading-relaxed">',
        '            ' + d.brand.description,
        '          </p>',
        '          <!-- Nút Kêu Gọi Hành Động (CTA) -->',
        '          <div class="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">',
        '            <a href="#products" data-route="products" class="inline-flex items-center justify-center px-7 py-3.5 rounded-lg bg-[#9f3c16] hover:bg-[#bf542c] text-white font-bold text-sm transition-all duration-200 shadow-md hover:shadow-lg text-center">',
        '              Khám phá tác phẩm',
        '              <span class="material-symbols-outlined ml-2 text-[20px]">arrow_forward</span>',
        '            </a>',
        '            <a href="#custom-2d" data-route="custom-2d" class="inline-flex items-center justify-center px-7 py-3.5 rounded-lg bg-[#fff1ec] hover:bg-[#faebe6] text-[#38665f] font-bold text-sm transition-all duration-200 text-center">',
        '              <span class="material-symbols-outlined mr-2 text-[20px]">brush</span>',
        '              Trải nghiệm Studio Tác Chế 2D',
        '            </a>',
        '          </div>',
        '          <!-- 3 Điểm chạm giá trị cốt lõi từ XML -->',
        '          <div class="pt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">',
        '            ' + touchpointsHtml,
        '          </div>',
        '        </div>',
        '',
        '        <!-- Cột Trưng Bày Tác Phẩm Nghệ Thuật Lớn -->',
        '        <div class="lg:col-span-6 relative">',
        '          <div class="relative w-full h-[400px] sm:h-[480px] lg:h-[540px] rounded-2xl overflow-hidden shadow-xl bg-[#faebe6] border border-[#dec0b7]">',
        '            <img src="' + d.featuredArtwork.image + '" alt="' + d.featuredArtwork.name + '" class="w-full h-full object-cover transform hover:scale-105 transition-transform duration-700 ease-out">',
        '            <div class="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none"></div>',
        '            <!-- Thẻ Giám tuyển (Curator Note) -->',
        '            <div class="absolute bottom-6 left-6 right-6 p-4 rounded-xl bg-white/90 backdrop-blur-md shadow-lg flex items-center justify-between border border-white/40">',
        '              <div class="space-y-0.5">',
        '                <span class="text-[11px] font-bold uppercase tracking-wider text-[#9f3c16] block">' + d.featuredArtwork.category + '</span>',
        '                <h4 class="font-serif text-lg font-bold text-[#211a17]">' + d.featuredArtwork.name + '</h4>',
        '                <p class="text-xs text-[#57423b]">' + d.featuredArtwork.detail + '</p>',
        '              </div>',
        '              <a href="#products" data-route="products" aria-label="Xem bộ tác phẩm" class="p-2.5 rounded-full bg-[#fff8f6] hover:bg-[#faebe6] text-[#211a17] transition-colors shadow-sm">',
        '                <span class="material-symbols-outlined text-[20px]">east</span>',
        '              </a>',
        '            </div>',
        '          </div>',
        '        </div>',
        '      </div>',
        '    </div>',
        '  </section>',
        '',
        '  <!-- ======================================================== -->',
        '  <!-- 2. INTERACTIVE 2D STUDIO BANNER (Tác chế gốm độc bản)   -->',
        '  <!-- ======================================================== -->',
        '  <section class="w-full bg-[#fff1ec] py-16 lg:py-24 relative overflow-hidden border-y border-[#faebe6]">',
        '    <div class="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-12">',
        '      <div class="flex flex-col lg:flex-row items-start lg:items-end justify-between mb-12 gap-6">',
        '        <div class="max-w-2xl space-y-2">',
        '          <div class="inline-flex items-center gap-2 text-[#38665f] text-xs font-bold uppercase tracking-widest">',
        '            <span class="material-symbols-outlined text-[18px]">palette</span>',
        '            <span>' + d.custom2dStudio.badge + '</span>',
        '          </div>',
        '          <h2 class="font-serif text-3xl sm:text-4xl lg:text-5xl text-[#211a17] font-bold">',
        '            ' + d.custom2dStudio.title,
        '          </h2>',
        '          <p class="text-sm sm:text-base text-[#57423b]">',
        '            ' + d.custom2dStudio.description,
        '          </p>',
        '        </div>',
        '        <a href="#custom-2d" data-route="custom-2d" class="inline-flex items-center px-6 py-3.5 rounded-lg bg-[#38665f] hover:bg-[#1f4e47] text-white font-bold text-sm transition-all duration-200 shadow-md">',
        '          <span class="material-symbols-outlined mr-2 text-[20px]">tune</span>',
        '          Bắt đầu tác chế độc bản ngay',
        '        </a>',
        '      </div>',
        '',
        '      <!-- Quy trình 3 bước tương tác (3-Step Creation Flow) -->',
        '      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">',
        '        <!-- Bước 1: Nắn Dáng Phôi Thô -->',
        '        <div class="p-6 rounded-xl bg-white shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between border border-[#dec0b7]/50">',
        '          <div class="space-y-3">',
        '            <div class="flex items-center justify-between">',
        '              <span class="w-10 h-10 rounded-full bg-[#faebe6] flex items-center justify-center font-serif text-lg font-bold text-[#9f3c16]">01</span>',
        '              <span class="material-symbols-outlined text-[#5f5b58] text-[26px]">gesture</span>',
        '            </div>',
        '            <h3 class="font-serif text-lg font-bold text-[#211a17]">Chọn &amp; Nắn Dáng Phôi Thô</h3>',
        '            <p class="text-xs text-[#57423b] leading-relaxed">',
        '              Tùy biến bán kính miệng bình, độ thắt eo và bầu bụng thông qua thanh trượt tương tác 2D chính xác đến từng milimét.',
        '            </p> conclude',
        '          </div>',
        '          <div class="mt-6 pt-4 bg-[#fff1ec] rounded-lg p-4 flex flex-col items-center justify-center relative overflow-hidden">',
        '            <svg class="w-28 h-24 text-[#9f3c16]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 100 100">',
        '              <path d="M40,15 C45,15 48,22 47,32 C46,45 30,55 30,75 C30,90 40,92 50,92 C60,92 70,90 70,75 C70,55 54,45 53,32 C52,22 55,15 60,15 Z" fill="currentColor" fill-opacity="0.12" stroke-linecap="round" stroke-linejoin="round"></path>',
        '              <line stroke="currentColor" stroke-dasharray="2 2" stroke-width="1" x1="20" x2="80" y1="92" y2="92"></line>',
        '              <circle cx="30" cy="75" fill="#38665f" r="3"></circle>',
        '              <circle cx="70" cy="75" fill="#38665f" r="3"></circle>',
        '              <circle cx="47" cy="32" fill="#9f3c16" r="3"></circle>',
        '            </svg>',
        '            <span class="text-[11px] font-semibold text-[#5f5b58] mt-2">Dáng Giọt Nước • H: 26cm</span>',
        '          </div>',
        '        </div>',
        '',
        '        <!-- Bước 2: Phối Men Ngọc & Trúc Vân -->',
        '        <div class="p-6 rounded-xl bg-white shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between border border-[#dec0b7]/50">',
        '          <div class="space-y-3">',
        '            <div class="flex items-center justify-between">',
        '              <span class="w-10 h-10 rounded-full bg-[#faebe6] flex items-center justify-center font-serif text-lg font-bold text-[#38665f]">02</span>',
        '              <span class="material-symbols-outlined text-[#5f5b58] text-[26px]">water_drop</span>',
        '            </div>',
        '            <h3 class="font-serif text-lg font-bold text-[#211a17]">Phối Men Ngọc &amp; Trúc Vân</h3>',
        '            <p class="text-xs text-[#57423b] leading-relaxed">',
        '              Thử nghiệm màu men Celadon ngọc bích, men rạn chỉ đen cổ điển hoặc lớp đất nung thô mộc lộ khoáng trầm.',
        '            </p>',
        '          </div>',
        '          <!-- Bảng mẫu Swatch màu men tương tác -->',
        '          <div class="mt-6 pt-4 bg-[#fff1ec] rounded-lg p-4 flex items-center justify-center gap-3" id="glaze-swatch-container">',
        '            <div class="flex flex-col items-center gap-1.5 cursor-pointer swatch-item active" data-color="#38665f">',
        '              <div class="w-8 h-8 rounded-full bg-[#38665f] shadow-sm ring-2 ring-[#38665f] ring-offset-2"></div>',
        '              <span class="text-[11px] font-bold text-[#211a17]">Men Ngọc</span>',
        '            </div>',
        '            <div class="flex flex-col items-center gap-1.5 cursor-pointer swatch-item opacity-70 hover:opacity-100 transition-opacity" data-color="#9f3c16">',
        '              <div class="w-8 h-8 rounded-full bg-[#9f3c16] shadow-sm"></div>',
        '              <span class="text-[11px] text-[#5f5b58]">Sa Mộc</span>',
        '            </div>',
        '            <div class="flex flex-col items-center gap-1.5 cursor-pointer swatch-item opacity-70 hover:opacity-100 transition-opacity" data-color="#eedfda">',
        '              <div class="w-8 h-8 rounded-full bg-[#eedfda] border border-[#dec0b7] shadow-sm"></div>',
        '              <span class="text-[11px] text-[#5f5b58]">Men Rạn</span>',
        '            </div>',
        '            <div class="flex flex-col items-center gap-1.5 cursor-pointer swatch-item opacity-70 hover:opacity-100 transition-opacity" data-color="#5f5b58">',
        '              <div class="w-8 h-8 rounded-full bg-[#5f5b58] shadow-sm"></div>',
        '              <span class="text-[11px] text-[#5f5b58]">Hỏa Biến</span>',
        '            </div>',
        '          </div>',
        '        </div>',
        '',
        '        <!-- Bước 3: Nung Lò Củi & Đóng Triện Gỗ -->',
        '        <div class="p-6 rounded-xl bg-white shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between border border-[#dec0b7]/50">',
        '          <div class="space-y-3">',
        '            <div class="flex items-center justify-between">',
        '              <span class="w-10 h-10 rounded-full bg-[#faebe6] flex items-center justify-center font-serif text-lg font-bold text-[#9f3c16]">03</span>',
        '              <span class="material-symbols-outlined text-[#5f5b58] text-[26px]">local_shipping</span>',
        '            </div>',
        '            <h3 class="font-serif text-lg font-bold text-[#211a17]">Nung Lò Củi &amp; Đóng Triện Gỗ</h3>',
        '            <p class="text-xs text-[#57423b] leading-relaxed">',
        '              Nghệ nhân vuốt tay thực tế theo bản vẽ 2D của bạn, nung củi liên tục 72 giờ và giao kèm hộp quà gỗ thông bọc lụa mộc.',
        '            </p>',
        '          </div>',
        '          <div class="mt-6 pt-4 bg-[#fff1ec] rounded-lg p-4 flex items-center justify-around">',
        '            <div class="w-14 h-14 rounded-md bg-[#faebe6] border border-[#dec0b7] flex flex-col items-center justify-center text-[#9f3c16] shadow-inner">',
        '              <span class="text-[11px] font-bold tracking-widest">MỘC</span>',
        '              <span class="material-symbols-outlined text-[16px]">verified</span>',
        '            </div>',
        '            <div class="flex flex-col text-left">',
        '              <span class="text-xs font-bold text-[#211a17]">Chứng thư độc bản #082</span>',
        '              <span class="text-[11px] text-[#57423b]">Khắc triện chìm thủ công</span>',
        '            </div>',
        '          </div>',
        '        </div>',
        '      </div>',
        '    </div>',
        '  </section>',
        '',
        '  <!-- ======================================================== -->',
        '  <!-- 3. FEATURED COLLECTION (Bộ Sưu Tập Men Ngọc Thủy Trúc) -->',
        '  <!-- ======================================================== -->',
        '  <section class="w-full py-16 lg:py-24">',
        '    <div class="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-12">',
        '      <div class="flex flex-col md:flex-row md:items-end justify-between pb-10 gap-6">',
        '        <div>',
        '          <span class="text-xs font-bold uppercase tracking-widest text-[#38665f] block mb-1">' + d.featuredCollection.badge + '</span>',
        '          <h2 class="font-serif text-3xl sm:text-4xl font-bold text-[#211a17]">' + d.featuredCollection.name + '</h2>',
        '          <p class="text-sm text-[#57423b] mt-2 max-w-xl leading-relaxed">' + d.featuredCollection.story + '</p>',
        '        </div>',
        '        <a href="#products" data-route="products" class="inline-flex items-center text-sm font-bold text-[#38665f] hover:text-[#1f4e47] transition-colors group">',
        '          <span>Xem toàn bộ bộ sưu tập</span>',
        '          <span class="material-symbols-outlined ml-1.5 transition-transform duration-200 group-hover:translate-x-1 text-[18px]">arrow_forward</span>',
        '        </a>',
        '      </div>',
        '      <!-- Lưới 4 tác phẩm tiêu biểu -->',
        '      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">',
        '        ' + productsHtml,
        '      </div>',
        '    </div>',
        '  </section>',
        '',
        '  <!-- ======================================================== -->',
        '  <!-- 4. CRAFTING PHILOSOPHY & GUARANTEES (3 Trụ Cột Triết Lý)  -->',
        '  <!-- ======================================================== -->',
        '  <section class="w-full bg-[#fff1ec] py-16 lg:py-24 border-t border-[#faebe6]">',
        '    <div class="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-12">',
        '      <div class="text-center max-w-2xl mx-auto mb-14 space-y-2">',
        '        <span class="text-xs font-bold uppercase tracking-widest text-[#9f3c16] block">' + d.philosophies.subheading + '</span>',
        '        <h2 class="font-serif text-3xl sm:text-4xl font-bold text-[#211a17]">' + d.philosophies.heading + '</h2>',
        '        <p class="text-sm text-[#57423b] leading-relaxed">' + d.philosophies.intro + '</p>',
        '      </div>',
        '      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">',
        '        ' + pillarsHtml,
        '      </div>',
        '    </div>',
        '  </section>',
        '',
        '  <!-- ======================================================== -->',
        '  <!-- 5. NEWSLETTER SUBSCRIPTION (Đăng ký nhận tin ra lò mẻ gốm) -->',
        '  <!-- ======================================================== -->',
        '  <section class="w-full py-16 lg:py-24 bg-[#fff8f6]">',
        '    <div class="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-12">',
        '      <div class="bg-[#f4e5e0] rounded-2xl p-8 md:p-14 lg:p-16 relative overflow-hidden flex flex-col items-center text-center border border-[#dec0b7]/60">',
        '        <div class="absolute -right-12 -bottom-12 w-64 h-64 rounded-full bg-[#9f3c16]/5 pointer-events-none"></div>',
        '        <span class="text-xs font-bold uppercase tracking-widest text-[#9f3c16] mb-2">' + d.newsletter.badge + '</span>',
        '        <h2 class="font-serif text-3xl sm:text-4xl text-[#211a17] font-bold max-w-xl">' + d.newsletter.title + '</h2>',
        '        <p class="text-sm sm:text-base text-[#57423b] max-w-lg mt-3 leading-relaxed">' + d.newsletter.description + '</p>',
        '',
        '        <form id="newsletter-form" class="mt-8 w-full max-w-md flex flex-col sm:flex-row gap-3">',
        '          <input type="email" id="newsletter-email" required placeholder="Nhập địa chỉ email của bạn..." class="flex-1 px-4 py-3.5 rounded-lg bg-white text-[#211a17] placeholder-[#5f5b58] text-sm shadow-sm border border-[#dec0b7] focus:outline-none focus:ring-2 focus:ring-[#38665f] transition-all">',
        '          <button type="submit" class="px-6 py-3.5 rounded-lg bg-[#9f3c16] hover:bg-[#bf542c] text-white font-bold text-sm transition-colors whitespace-nowrap shadow-md cursor-pointer">',
        '            ' + d.newsletter.buttonText,
        '          </button>',
        '        </form>',
        '',
        '        <!-- Trạng thái phản hồi tương tác sau khi đăng ký -->',
        '        <div id="newsletter-status" class="hidden mt-4 text-xs font-semibold text-[#38665f] flex items-center gap-1.5 bg-white/80 px-4 py-2 rounded-full shadow-sm">',
        '          <span class="material-symbols-outlined text-[18px]">check_circle</span>',
        '          <span>Cảm ơn bạn! Chúng tôi sẽ gửi thông báo lời mời ngay khi mẻ lò mới khai hỏa.</span>',
        '        </div>',
        '        <p class="text-xs text-[#5f5b58] mt-4">' + d.newsletter.privacyNotice + '</p>',
        '      </div>',
        '    </div>',
        '  </section>',
        '',
        '  <!-- ======================================================== -->',
        '  <!-- 6. FLOATING ARTISAN CHATBOT ACTION (Nút nổi góc phải)    -->',
        '  <!-- ======================================================== -->',
        '  <div class="fixed bottom-6 right-6 z-40">',
        '    <button id="btn-floating-artisan" type="button" aria-label="Hỗ trợ trực tuyến Gốm Mộc" class="group relative flex items-center justify-center w-14 h-14 rounded-full bg-[#38665f] hover:bg-[#1f4e47] text-white shadow-[0_12px_32px_-4px_rgba(43,35,32,0.25)] transition-all duration-300 transform hover:scale-105 active:scale-95 cursor-pointer">',
        '      <span class="material-symbols-outlined text-[26px]">chat</span>',
        '      <span class="absolute right-full mr-3 px-3 py-1.5 rounded-lg bg-white text-[#211a17] text-xs font-bold whitespace-nowrap shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none hidden sm:block border border-[#faebe6]">',
        '        Trò chuyện cùng nghệ nhân',
        '      </span>',
        '    </button>',
        '  </div>',

        '</div>'
      ].join('\n');

      containerEl.innerHTML = fullHtml;
      this.bindInteractions();
    },

    /**
     * Gắn các hiệu ứng tương tác (Micro-interactions) sau khi DOM hoàn tất
     */
    bindInteractions: function() {
      // 1. Form đăng ký nhận tin ra lò
      var form = document.getElementById('newsletter-form');
      var status = document.getElementById('newsletter-status');
      if (form && status) {
        form.onsubmit = function(e) {
          e.preventDefault();
          status.classList.remove('hidden');
          form.reset();
        };
      }

      // 2. Tương tác chọn màu men ở bước 02 Studio 2D
      var swatches = document.querySelectorAll('.swatch-item');
      swatches.forEach(function(sw) {
        sw.onclick = function() {
          swatches.forEach(function(s) {
            s.classList.remove('active');
            s.classList.add('opacity-70');
            var circle = s.querySelector('div');
            if (circle) circle.className = 'w-8 h-8 rounded-full shadow-sm';
          });
          sw.classList.add('active');
          sw.classList.remove('opacity-70');
          var activeCircle = sw.querySelector('div');
          if (activeCircle) {
            activeCircle.className = 'w-8 h-8 rounded-full shadow-sm ring-2 ring-[#38665f] ring-offset-2';
          }
        };
      });

      // 3. Tương tác yêu thích sản phẩm (toggle heart)
      var favButtons = document.querySelectorAll('.btn-favorite-item');
      favButtons.forEach(function(btn) {
        btn.onclick = function(e) {
          e.preventDefault();
          var icon = btn.querySelector('.material-symbols-outlined');
          if (icon) {
            if (icon.classList.contains('text-[#ba1a1a]')) {
              icon.classList.remove('text-[#ba1a1a]');
              btn.classList.remove('bg-white');
            } else {
              icon.classList.add('text-[#ba1a1a]');
              btn.classList.add('bg-white');
            }
          }
        };
      });

      // 4. Nút Chatbot góc dưới bên phải
      var artisanBtn = document.getElementById('btn-floating-artisan');
      if (artisanBtn) {
        artisanBtn.onclick = function() {
          if (window.App && window.App.chatbot && typeof window.App.chatbot.toggleChat === 'function') {
            window.App.chatbot.toggleChat();
          } else {
            alert('Trợ lý ảo & Nghệ nhân tư vấn (Slot dành cho Thành viên 4 kết nối)');
          }
        };
      }
    }
  };

  window.Tv1Storytelling = Tv1Storytelling;
})(window);
