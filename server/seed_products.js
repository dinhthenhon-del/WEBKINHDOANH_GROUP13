const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/.env' });

const MONGO_URI = process.env.MONGODB_URI;
// Xem trước: node seed_products.js
// Ghi DB sau khi lead đồng ý: node seed_products.js --apply
const APPLY = process.argv.includes('--apply');
const CONFIRM_DB = process.argv.find((arg) => arg.startsWith('--confirm-db='))?.split('=')[1];

/**
 * Sản phẩm có trang sản phẩm và ảnh trực tiếp đã xác minh từ nguồn.
 * sourceUrl được lưu cùng sản phẩm để API chỉ công khai bản ghi có nguồn.
 * categorySlug chỉ dùng để tra categoryId, không lưu vào document products.
 * Giá và tồn kho Minh Long là snapshot; giá Long Loan và tồn kho là số demo do nguồn không công bố.
 */
const sampleProducts = [
  {
    "name": "Bộ đồ ăn 09 sản phẩm - Jasmine - Thạch Vân",
    "sku": "A001_09566",
    "collectionName": "Jasmine - Thạch Vân",
    "categorySlug": "bo-do-an",
    "price": 988200,
    "images": [
      "https://cdn.hstatic.net/products/200000532849/09566-sm-01_97a799184d634103bdfcdb924226920f.png",
      "https://cdn.hstatic.net/products/200000532849/1_copy_5d87cfc2a83249b8b5cb1ac6361fe4a9.jpg",
      "https://cdn.hstatic.net/products/200000532849/2_copy_f94062bbe86942e8a9dd32372206dbb8.jpg",
      "https://cdn.hstatic.net/products/200000532849/3_copy_2a0b65fe2bb044f09aa266ade498aaa1.jpg",
      "https://cdn.hstatic.net/products/200000532849/4_copy_4a967246f2d94063aeec188cb3470345.jpg",
      "https://cdn.hstatic.net/products/200000532849/09566-sm-05_d47d7aaeeb9b46128a704f1317693877.png",
      "https://cdn.hstatic.net/products/200000532849/09566-sm-04_7b57f70450da46b2ad66937d93644c86.png"
    ],
    "image": "https://cdn.hstatic.net/products/200000532849/09566-sm-01_97a799184d634103bdfcdb924226920f.png",
    "sourceUrl": "https://minhlong.com/products/bo-do-an-09-san-pham-jasmine-thach-van",
    "stock": 139,
    "slug": "bo-do-an-09-san-pham-jasmine-thach-van",
    "description": "Có những vẻ đẹp không cần đến sự hoàn hảo của những đường nét giống nhau. Chính những khác biệt được tạo nên một cách tự nhiên lại làm nên nét cuốn hút riêng.\nLấy cảm hứng từ những đường vân của đá được kiến tạo qua thời gian, Bộ bàn ăn Thạch Vân đưa vẻ đẹp nguyên bản ấy lên nền sứ trắng thanh khiết của dáng Jasmine. Sắc xanh thẳm chuyển động tự do quanh từng sản phẩm – khi đậm sâu, khi loang nhẹ – tạo nên những đường vân không hoàn toàn lặp lại.\nVì thế, mỗi sản phẩm sứ thuộc bộ bàn ăn Thạch Vân mang một sắc thái riêng. Khi đặt cạnh nhau, những khác biệt ấy lại hòa thành một bàn ăn đầy nhịp điệu: thanh lịch nhưng không khuôn mẫu, cá tính mà vẫn tinh tế.\nKhoảng sứ trắng được giữ lại vừa đủ để món ăn trở thành tâm điểm; sắc xanh thạch vân bao quanh như một đường viền của thiên nhiên, làm nổi bật màu sắc và nghệ thuật bày trí. Từ một bữa cơm thân thuộc đến những dịp sum họp hay tiếp đãi, Thạch Vân mang đến một bàn ăn có gu mà không cần phô bày.\nĐược chế tác từ sứ cao cấp và nung ở nhiệt độ cao, bộ bàn ăn sở hữu độ bền chắc, khả năng chống trầy xước và giữ được vẻ đẹp dài lâu trong quá trình sử dụng.\nThạch Vân – mang vẻ đẹp của tự nhiên lên bàn ăn, để mỗi lần sử dụng đều mang đến trải nghiệm khác biệt\nCHI TIẾT BỘ ĐỒ ĂN:\nChén cơm 11.5 cm 6 Cái\nDĩa tròn 25 cm 01 Cái\nDĩa súp 23 cm 01 Cái\nTô 20 cm 01 Cái",
    "status": "active",
    "averageRating": 0,
    "reviewCount": 0
  },
  {
    "name": "Bộ đồ ăn 22 sản phẩm - Jasmine - Thạch Vân",
    "sku": "A001_22566",
    "collectionName": "Jasmine - Thạch Vân",
    "categorySlug": "bo-do-an",
    "price": 1710720,
    "images": [
      "https://cdn.hstatic.net/products/200000532849/22566-sm-01_aa73737a1c7645e4b210c11bf1d16dbd.png",
      "https://cdn.hstatic.net/products/200000532849/1_copy_301c79f868b545faa713ea92b12f18ab.jpg",
      "https://cdn.hstatic.net/products/200000532849/2_copy_fa10a761c24a4e2c87ee254a2d77cb75.jpg",
      "https://cdn.hstatic.net/products/200000532849/3_copy_e0c446dfee5141e0afa3b79042eb0267.jpg",
      "https://cdn.hstatic.net/products/200000532849/4_copy_293898eb451d4ccda6a0b6948636d477.jpg",
      "https://cdn.hstatic.net/products/200000532849/22566-sm-05_3087d6bf8f894ebfbe33a9581e4861bb.png",
      "https://cdn.hstatic.net/products/200000532849/22566-sm-04_698b05fb5a1942a0b7b4df5369d8c60a.png"
    ],
    "image": "https://cdn.hstatic.net/products/200000532849/22566-sm-01_aa73737a1c7645e4b210c11bf1d16dbd.png",
    "sourceUrl": "https://minhlong.com/products/bo-do-an-22-san-pham-jasmine-thach-van",
    "stock": 13,
    "slug": "bo-do-an-22-san-pham-jasmine-thach-van",
    "description": "Có những vẻ đẹp không cần đến sự hoàn hảo của những đường nét giống nhau. Chính những khác biệt được tạo nên một cách tự nhiên lại làm nên nét cuốn hút riêng.\nLấy cảm hứng từ những đường vân của đá được kiến tạo qua thời gian, Bộ bàn ăn Thạch Vân đưa vẻ đẹp nguyên bản ấy lên nền sứ trắng thanh khiết của dáng Jasmine. Sắc xanh thẳm chuyển động tự do quanh từng sản phẩm – khi đậm sâu, khi loang nhẹ – tạo nên những đường vân không hoàn toàn lặp lại.\nVì thế, mỗi sản phẩm sứ thuộc bộ bàn ăn Thạch Vân mang một sắc thái riêng. Khi đặt cạnh nhau, những khác biệt ấy lại hòa thành một bàn ăn đầy nhịp điệu: thanh lịch nhưng không khuôn mẫu, cá tính mà vẫn tinh tế.\nKhoảng sứ trắng được giữ lại vừa đủ để món ăn trở thành tâm điểm; sắc xanh thạch vân bao quanh như một đường viền của thiên nhiên, làm nổi bật màu sắc và nghệ thuật bày trí. Từ một bữa cơm thân thuộc đến những dịp sum họp hay tiếp đãi, Thạch Vân mang đến một bàn ăn có gu mà không cần phô bày.\nĐược chế tác từ sứ cao cấp và nung ở nhiệt độ cao, bộ bàn ăn sở hữu độ bền chắc, khả năng chống trầy xước và giữ được vẻ đẹp dài lâu trong quá trình sử dụng.\nThạch Vân – mang vẻ đẹp của tự nhiên lên bàn ăn, để mỗi lần sử dụng đều mang đến trải nghiệm khác biệt\nCHI TIẾT BỘ ĐỒ ĂN:\nChén cơm 11.5 cm 6 Cái\nChén chấm 9 cm 06 Cái\nDĩa lót chén 15 cm 06 Cái\nDĩa tròn 22 cm 01 Cái\nDĩa tròn 25 cm 01 Cái\nDĩa súp 23 cm 01 Cái\nTô 20 cm 01 Cái",
    "status": "active",
    "averageRating": 0,
    "reviewCount": 0
  },
  {
    "name": "Chén cơm 11 cm - Jasmine - Thạch Vân",
    "sku": "A001_031106566",
    "collectionName": "Jasmine - Thạch Vân",
    "categorySlug": "chen-bat",
    "price": 63720,
    "images": [
      "https://cdn.hstatic.net/products/200000532849/031106566-sm-01_fdbf99b5baa44db5b31ee7faa5a03bd2.png"
    ],
    "image": "https://cdn.hstatic.net/products/200000532849/031106566-sm-01_fdbf99b5baa44db5b31ee7faa5a03bd2.png",
    "sourceUrl": "https://minhlong.com/products/chen-com-11-cm-jasmine-thach-van",
    "stock": 94,
    "slug": "chen-com-11-cm-jasmine-thach-van",
    "description": "Có những vẻ đẹp không cần đến sự hoàn hảo của những đường nét giống nhau. Chính những khác biệt được tạo nên một cách tự nhiên lại làm nên nét cuốn hút riêng.\nLấy cảm hứng từ những đường vân của đá được kiến tạo qua thời gian, Bộ bàn ăn Thạch Vân đưa vẻ đẹp nguyên bản ấy lên nền sứ trắng thanh khiết của dáng Jasmine. Sắc xanh thẳm chuyển động tự do quanh từng sản phẩm – khi đậm sâu, khi loang nhẹ – tạo nên những đường vân không hoàn toàn lặp lại.\nVì thế, mỗi sản phẩm sứ thuộc bộ bàn ăn Thạch Vân mang một sắc thái riêng. Khi đặt cạnh nhau, những khác biệt ấy lại hòa thành một bàn ăn đầy nhịp điệu: thanh lịch nhưng không khuôn mẫu, cá tính mà vẫn tinh tế.\nKhoảng sứ trắng được giữ lại vừa đủ để món ăn trở thành tâm điểm; sắc xanh thạch vân bao quanh như một đường viền của thiên nhiên, làm nổi bật màu sắc và nghệ thuật bày trí. Từ một bữa cơm thân thuộc đến những dịp sum họp hay tiếp đãi, Thạch Vân mang đến một bàn ăn có gu mà không cần phô bày.\nĐược chế tác từ sứ cao cấp và nung ở nhiệt độ cao, bộ bàn ăn sở hữu độ bền chắc, khả năng chống trầy xước và giữ được vẻ đẹp dài lâu trong quá trình sử dụng.\nThạch Vân – mang vẻ đẹp của tự nhiên lên bàn ăn, để mỗi lần sử dụng đều mang đến trải nghiệm khác biệt",
    "status": "active",
    "averageRating": 0,
    "reviewCount": 0
  },
  {
    "name": "Bộ đồ ăn 09 sản phẩm - Jasmine - Chỉ Vàng",
    "sku": "A001_09014",
    "collectionName": "Jasmine - Chỉ Vàng",
    "categorySlug": "bo-do-an",
    "price": 911520,
    "images": [
      "https://product.hstatic.net/200000532849/product/bo-do-an-09-san-pham-jasmine-chi-vang_09014-sm-01_22249286a87343a1a893471e1205f611.png"
    ],
    "image": "https://product.hstatic.net/200000532849/product/bo-do-an-09-san-pham-jasmine-chi-vang_09014-sm-01_22249286a87343a1a893471e1205f611.png",
    "sourceUrl": "https://minhlong.com/products/bo-do-an-9-24-36-san-pham-jasmine-vien-chi-vang-bo-9-san-pham",
    "stock": 68,
    "slug": "bo-do-an-9-24-36-san-pham-jasmine-vien-chi-vang-bo-9-san-pham",
    "description": "Dãy sản phẩm Jasmine đa dạng các kiểu dáng với chất liệu men sứ sáng bóng, láng mịn được nung ở nhiệt độ cao. Không họa tiết cầu kỳ nhưng các sản phẩm Jasmine luôn được lòng khách bởi màu sắc trang nhã, dù là trắng trơn hay viền chỉ vàng, chỉ xanh lá đều giúp lưu giữ vị ngon của tách trà nóng, của món ăn ngon và khơi gợi cảm hứng cho người thưởng thức.\nBộ đồ ăn 09 sản phẩm bao gồm:\n- 06 Chén cơm 11.5 cm\n- 01 Tô 20 cm\n- 01 Dĩa tròn 25 cm\n- 01 Dĩa súp 23 cm",
    "status": "active",
    "averageRating": 0,
    "reviewCount": 0
  },
  {
    "name": "Chén cơm 11.5 cm - Jasmine - Chỉ Vàng",
    "sku": "A001_031106014",
    "collectionName": "Jasmine - Chỉ Vàng",
    "categorySlug": "chen-bat",
    "price": 63720,
    "images": [
      "https://product.hstatic.net/200000532849/product/031106014_4b5b794bae8d42b68a552fc317f02ba3.png"
    ],
    "image": "https://product.hstatic.net/200000532849/product/031106014_4b5b794bae8d42b68a552fc317f02ba3.png",
    "sourceUrl": "https://minhlong.com/products/to-chen-dia-muong-bo-jasmine-vien-chi-vang-chen-com",
    "stock": 4669,
    "slug": "to-chen-dia-muong-bo-jasmine-vien-chi-vang-chen-com",
    "description": "Chén cơm 11.5 cm bộ Jasmine - Viền chỉ vàng Lấy cảm hứng từ hoa nhài thuần khiết với hương thơm ngào ngạt, vẻ đẹp thanh tao được nhiều người yêu thích, chúng tôi đã chế tác nên bộ trà Jasmine với những đường nét uốn lượn mềm mại. Bộ Jasmine có kiểu dáng thanh lịch, chất liệu men sứ sáng bóng và láng mịn được nung ở nhiệt độ cao, giúp lưu giữ vị ngon của tách trà nóng và đem đến những giây phút thư thái, an nhiên.\nLưu ý: Không dùng sản phẩm trong máy rửa chén, lò vi sóng.",
    "status": "active",
    "averageRating": 0,
    "reviewCount": 0
  },
  {
    "name": "Chén chấm 9 cm - Jasmine - Chỉ Vàng",
    "sku": "A001_040919014",
    "collectionName": "Jasmine - Chỉ Vàng",
    "categorySlug": "chen-bat",
    "price": 32400,
    "images": [
      "https://product.hstatic.net/200000532849/product/040919014_c30c2a33d4ed4fa2ab6bd0b4ac6cbc74.png"
    ],
    "image": "https://product.hstatic.net/200000532849/product/040919014_c30c2a33d4ed4fa2ab6bd0b4ac6cbc74.png",
    "sourceUrl": "https://minhlong.com/products/to-chen-dia-muong-bo-jasmine-vien-chi-vang-chen-cham",
    "stock": 1577,
    "slug": "to-chen-dia-muong-bo-jasmine-vien-chi-vang-chen-cham",
    "description": "Lấy cảm hứng từ hoa nhài thuần khiết với hương thơm ngào ngạt, vẻ đẹp thanh tao được nhiều người yêu thích, chúng tôi đã chế tác nên bộ trà Jasmine với những đường nét uốn lượn mềm mại. Bộ trà Jasmine có kiểu dáng thanh lịch, chất liệu men sứ sáng bóng và láng mịn được nung ở nhiệt độ cao, giúp lưu giữ vị ngon của tách trà nóng và đem đến những giây phút thư thái, an nhiên khi thưởng trà\nLưu ý: Không dùng sản phẩm trong máy rửa chén, lò vi sóng.",
    "status": "active",
    "averageRating": 0,
    "reviewCount": 0
  },
  {
    "name": "Dĩa lót chén 15 cm - Jasmine - Chỉ Vàng",
    "sku": "A001_041550014",
    "collectionName": "Jasmine - Chỉ Vàng",
    "categorySlug": "dia",
    "price": 62640,
    "images": [
      "https://cdn.hstatic.net/products/200000532849/avatar__4__559f92714bc34f8dae55b746612f1c0b.png"
    ],
    "image": "https://cdn.hstatic.net/products/200000532849/avatar__4__559f92714bc34f8dae55b746612f1c0b.png",
    "sourceUrl": "https://minhlong.com/products/to-chen-dia-muong-bo-jasmine-vien-chi-vang-dia-lot",
    "stock": 1247,
    "slug": "to-chen-dia-muong-bo-jasmine-vien-chi-vang-dia-lot",
    "description": "Dãy sản phẩm Jasmine đa dạng các kiểu dáng với chất liệu men sứ sáng bóng, láng mịn được nung ở nhiệt độ cao. Không họa tiết cầu kỳ nhưng các sản phẩm Jasmine luôn được lòng khách bởi màu sắc trang nhã, dù là trắng trơn hay viền chỉ vàng, chỉ xanh lá đều giúp lưu giữ vị ngon của tách trà nóng, của món ăn ngon và khơi gợi cảm hứng cho người thưởng thức.\nLưu ý: Không dùng sản phẩm trong máy rửa chén, lò vi sóng.",
    "status": "active",
    "averageRating": 0,
    "reviewCount": 0
  },
  {
    "name": "Thố + nắp - Jasmine - Chỉ Vàng",
    "sku": "A001_061805014",
    "collectionName": "Jasmine - Chỉ Vàng",
    "categorySlug": "to-tho",
    "price": 696600,
    "images": [
      "https://cdn.hstatic.net/products/200000532849/avatar__70__72c8ba9d1e294ff3a6a34931f548c63d.png",
      "https://cdn.hstatic.net/products/200000532849/avatar__71__2cd2b4cf788742d6a4d1ca9782fdc606.png"
    ],
    "image": "https://cdn.hstatic.net/products/200000532849/avatar__70__72c8ba9d1e294ff3a6a34931f548c63d.png",
    "sourceUrl": "https://minhlong.com/products/tho-18-cm-nap-jasmine-chi-vang",
    "stock": 23,
    "slug": "tho-18-cm-nap-jasmine-chi-vang",
    "description": "Lưu ý: Sản phẩm không phù hợp sử dụng trong máy rửa chén, lò vi sóng.",
    "status": "active",
    "averageRating": 0,
    "reviewCount": 0
  },
  {
    "name": "Bộ đồ ăn 9 sản phẩm - Daisy - Trắng",
    "sku": "A001_09DAI",
    "collectionName": "Daisy - Trắng",
    "categorySlug": "bo-do-an",
    "price": 557280,
    "images": [
      "https://cdn.hstatic.net/products/200000532849/avatar__1__a214e68525d5423997b35761db75b10c.png"
    ],
    "image": "https://cdn.hstatic.net/products/200000532849/avatar__1__a214e68525d5423997b35761db75b10c.png",
    "sourceUrl": "https://minhlong.com/products/bo-do-an-9-san-pham-daisy-trang",
    "stock": 82,
    "slug": "bo-do-an-9-san-pham-daisy-trang",
    "description": "Daisy trắng có thiết kế đơn giản, không cầu kỳ nhưng vẫn giữ được nét sang trọng và thanh lịch hiếm thấy ở những sản phẩm khác. Mỗi chiếc đĩa, tô, chén… đều được tạo hình cân đối, tròn đều, không một vết trầy xước. Sản phẩm được nung ở nhiệt độ cao theo công nghệ của Đức, không chì, camidium, an toàn tuyệt đối cho người sử dụng.\nCHI TIẾT BỘ ĐỒ ĂN:\nChén cơm 11 cm 06 Cái\nDĩa sâu lòng 23 cm 01 Cái\nDĩa tròn ảo 26 cm 01 Cái\nTô trung 20 cm 01 Cái",
    "status": "active",
    "averageRating": 0,
    "reviewCount": 0
  },
  {
    "name": "Bộ đồ ăn 22 sản phẩm - Daisy - Trắng",
    "sku": "A001_22DAI",
    "collectionName": "Daisy - Trắng",
    "categorySlug": "bo-do-an",
    "price": 943920,
    "images": [
      "https://product.hstatic.net/200000532849/product/nguoi-24sp-daisy-trang_24dai-sm_1d31ad2e9bf149aa85c7c3dbf748ebeb_large_f966b5949e1b4f2ab524a20cecf174e8.png"
    ],
    "image": "https://product.hstatic.net/200000532849/product/nguoi-24sp-daisy-trang_24dai-sm_1d31ad2e9bf149aa85c7c3dbf748ebeb_large_f966b5949e1b4f2ab524a20cecf174e8.png",
    "sourceUrl": "https://minhlong.com/products/bo-do-an-22-san-pham-daisy-trang",
    "stock": 4,
    "slug": "bo-do-an-22-san-pham-daisy-trang",
    "description": "Daisy trắng có thiết kế đơn giản, không cầu kỳ nhưng vẫn giữ được nét sang trọng và thanh lịch hiếm thấy ở những sản phẩm khác. Mỗi chiếc đĩa, tô, chén… đều được tạo hình cân đối, tròn đều, không một vết trầy xước. Sản phẩm được nung ở nhiệt độ cao theo công nghệ của Đức, không chì, camidium, an toàn tuyệt đối cho người sử dụng.\nCHI TIẾT BỘ ĐỒ ĂN:\nChén cơm 11 cm 06 Cái\nChén chấm 9 cm 06 Cái\nDĩa lót chén 15 cm 06 Cái\nDĩa tròn ảo 22 cm 01 Cái\nDĩa sâu lòng 23 cm 01 Cái\nDĩa tròn ảo 26 cm 01 Cái\nTô trung 20 cm 01 Cái",
    "status": "active",
    "averageRating": 0,
    "reviewCount": 0
  },
  {
    "name": "Bộ đồ ăn 10 người 36 sản phẩm - Daisy - Trắng",
    "sku": "A001_36DAI",
    "collectionName": "Daisy - Trắng",
    "categorySlug": "bo-do-an",
    "price": 1550880,
    "images": [
      "https://product.hstatic.net/200000532849/product/bo-do-an-10-nguoi-36sp-daisy-trang_36dai-sm-01_a81d2f0f10e448f3be31a0f3497186d0.png"
    ],
    "image": "https://product.hstatic.net/200000532849/product/bo-do-an-10-nguoi-36sp-daisy-trang_36dai-sm-01_a81d2f0f10e448f3be31a0f3497186d0.png",
    "sourceUrl": "https://minhlong.com/products/bo-ban-an-24-36-mon-daisy-trang-10-nguoi-36-san-pham",
    "stock": 42,
    "slug": "bo-ban-an-24-36-mon-daisy-trang-10-nguoi-36-san-pham",
    "description": "Daisy trắng có thiết kế đơn giản, không cầu kỳ nhưng vẫn giữ được nét sang trọng và thanh lịch hiếm thấy ở những sản phẩm khác. Mỗi chiếc đĩa, tô, chén… đều được tạo hình cân đối, tròn đều, không một vết trầy xước. Sản phẩm được nung ở nhiệt độ cao theo công nghệ của Đức, không chì, camidium, an toàn tuyệt đối cho người sử dụng.\nBộ đồ ăn 10 người 36 sản phẩm - Daisy - Trắng bao gồm:\n- 10 Chén cơm 11 cm\n- 10 Dĩa lót chén cơm 15 cm\n- 10 Chén chấm 9 cm\n- 03 Dĩa tròn ảo 26 cm\n- 02 Dĩa sâu lòng 23 cm\n- 01 Tô trung 23 cm",
    "status": "active",
    "averageRating": 0,
    "reviewCount": 0
  },
  {
    "name": "Chén cơm - Daisy - Trắng",
    "sku": "A001_031135000",
    "collectionName": "Daisy - Trắng",
    "categorySlug": "chen-bat",
    "price": 33480,
    "images": [
      "https://product.hstatic.net/200000532849/product/a001_031135000_2_c5c1145a7ac2447f9ad098c3b121221e.png",
      "https://product.hstatic.net/200000532849/product/a001_031135000_1_1c989b7018e9442490e6a87729e768e0.png"
    ],
    "image": "https://product.hstatic.net/200000532849/product/a001_031135000_2_c5c1145a7ac2447f9ad098c3b121221e.png",
    "sourceUrl": "https://minhlong.com/products/to-chen-dia-muong-bo-daisy-trang-chen-com",
    "stock": 5130,
    "slug": "to-chen-dia-muong-bo-daisy-trang-chen-com",
    "description": "Chén cơm 11.5 cm - Daisy - Trắng Daisy là hoa cúc trắng với nét tinh khôi, mỏng manh và thuần khiết; các nghệ nhân gốm sứ Minh Long đã liên tưởng từ những đường nét của hoa cúc vào kiểu dáng thiết kế của bộ Daisy. Daisy có màu men sáng bóng, láng mịn, tạo hình thon nhẹ phần đáy bình và vững chãi trong từng bình trà, tách, tô, chén chấm tạo nên sự thanh thoát, yêu kiều.",
    "status": "active",
    "averageRating": 0,
    "reviewCount": 0
  },
  {
    "name": "Dĩa lót chén 15.5 cm - Daisy - Trắng",
    "sku": "A001_041514000",
    "collectionName": "Daisy - Trắng",
    "categorySlug": "dia",
    "price": 34560,
    "images": [
      "https://product.hstatic.net/200000532849/product/dlot-com-15-cm-daisy-trang_041514000-sm_256deb7b97c040e0accdd7e64e9dcee2.png"
    ],
    "image": "https://product.hstatic.net/200000532849/product/dlot-com-15-cm-daisy-trang_041514000-sm_256deb7b97c040e0accdd7e64e9dcee2.png",
    "sourceUrl": "https://minhlong.com/products/dia-lot-chen-15-5-cm-daisy-trang",
    "stock": 1931,
    "slug": "dia-lot-chen-15-5-cm-daisy-trang",
    "description": "Daisy trắng có thiết kế đơn giản, không cầu kỳ nhưng vẫn giữ được nét sang trọng và thanh lịch hiếm thấy ở những sản phẩm khác. Mỗi chiếc đĩa, tô, chén… đều được tạo hình cân đối, tròn đều, không một vết trầy xước. Sản phẩm được nung ở nhiệt độ cao theo công nghệ của Đức, không chì, camidium, an toàn tuyệt đối cho người sử dụng.",
    "status": "active",
    "averageRating": 0,
    "reviewCount": 0
  },
  {
    "name": "Dĩa tròn ảo - Daisy - Trắng",
    "sku": "A001_041621000",
    "collectionName": "Daisy - Trắng",
    "categorySlug": "dia",
    "price": 37800,
    "images": [
      "https://product.hstatic.net/200000532849/product/dia-ao-16-cm-daisy-trang_041621000-sm-01_25ce74d4feaf4aaeb9fa743ce93b7400.png",
      "https://product.hstatic.net/200000532849/product/dia-tron-ao-18-cm-daisy-trang_041821000-sm-01_4ffeaf14beef4346906b0c05e82e7bfd.png",
      "https://product.hstatic.net/200000532849/product/dia-tron-ao-22-cm-daisy-trang_042221000-sm-01_3e3ec1ffd1134da7b738ed2115611e30.png",
      "https://product.hstatic.net/200000532849/product/dia-tron-ao-26-cm-daisy-trang_042621000-sm-01_a0c49d5ee7ef4cac919189dc9663844d.png",
      "https://product.hstatic.net/200000532849/product/dia-tron-ao-28-cm-daisy-trang_042821000-sm-01_f91770c90bc4425f82ee53ce4ada6551.png",
      "https://product.hstatic.net/200000532849/product/dia-tron-ao-31-cm-daisy-trang_043121000-sm-01_05e418b6d50b40fe8c21897ebc19c1c7.png",
      "https://product.hstatic.net/200000532849/product/dia-tron-ao-35-cm-daisy-trang_043521000-sm-01_318d490393534a8c961462edcde8ff5a.png",
      "https://product.hstatic.net/200000532849/product/dia-tron-ao-45-cm-daisy-trang_044521000-sm-01_417a885f13b545de956a4f0c3c98b0f6.png"
    ],
    "image": "https://product.hstatic.net/200000532849/product/dia-ao-16-cm-daisy-trang_041621000-sm-01_25ce74d4feaf4aaeb9fa743ce93b7400.png",
    "sourceUrl": "https://minhlong.com/products/dia-tron-ao-daisy-trang",
    "stock": 362,
    "slug": "dia-tron-ao-daisy-trang",
    "description": "Daisy là hoa cúc trắng với nét tinh khôi, mỏng manh và thuần khiết; các nghệ nhân gốm sứ Minh Long đã liên tưởng từ những đường nét của hoa cúc vào kiểu dáng thiết kế của bộ Daisy. Daisy có màu men sáng bóng, láng mịn, tạo hình thon nhẹ phần đáy bình và vững chãi trong từng bình trà, tách, tô, chén chấm tạo nên sự thanh thoát, yêu kiều.",
    "status": "active",
    "averageRating": 0,
    "reviewCount": 0
  },
  {
    "name": "Dĩa sâu lòng - Daisy - Trắng",
    "sku": "A001_041898000",
    "collectionName": "Daisy - Trắng",
    "categorySlug": "dia",
    "price": 89640,
    "images": [
      "https://product.hstatic.net/200000532849/product/ds-long-18-cm-daisy-trang_041898000-sm-01_352d772789bc417196d226e0bc8e52fa.png",
      "https://product.hstatic.net/200000532849/product/dia-sau-long-21-cm-daisy-trang_042198000-sm-01_10ee5a2666404adfac1250e5f92c185e.png",
      "https://product.hstatic.net/200000532849/product/dia-sau-long-23-cm-daisy-trang_042398000-sm-01_cfe8aa15a0b84095814b73daf70f48b5.png",
      "https://product.hstatic.net/200000532849/product/dia-sau-long-25-cm-daisy-trang_042598000-sm-01_f42750202eef4d849e0f5a8cda7c01e0.png",
      "https://product.hstatic.net/200000532849/product/dia-sau-long-27-cm-daisy-trang_042798000-sm-01_19aa1c79a048443b9f99e9e71fdde60e.png",
      "https://product.hstatic.net/200000532849/product/dia-sau-long-31-cm-daisy-trang_043198000-sm-01_5cd3e98f4dc740549db481610c7cbc1d.png"
    ],
    "image": "https://product.hstatic.net/200000532849/product/ds-long-18-cm-daisy-trang_041898000-sm-01_352d772789bc417196d226e0bc8e52fa.png",
    "sourceUrl": "https://minhlong.com/products/dia-sau-long-daisy-trang",
    "stock": 473,
    "slug": "dia-sau-long-daisy-trang",
    "description": "Daisy là hoa cúc trắng với nét tinh khôi, mỏng manh và thuần khiết; các nghệ nhân gốm sứ Minh Long đã liên tưởng từ những đường nét của hoa cúc vào kiểu dáng thiết kế của bộ Daisy. Daisy có màu men sáng bóng, láng mịn, tạo hình thon nhẹ phần đáy bình và vững chãi trong từng bình trà, tách, tô, chén chấm tạo nên sự thanh thoát, yêu kiều.",
    "status": "active",
    "averageRating": 0,
    "reviewCount": 0
  },
  {
    "name": "Bộ trà 0.5 L - Camellia - Chỉ Vàng",
    "sku": "A001_01503801403",
    "collectionName": "Camellia - Chỉ Vàng",
    "categorySlug": "bo-tra-ca-phe",
    "price": 874800,
    "images": [
      "https://product.hstatic.net/200000532849/product/bo-tra-05-l-camellia-chi-vang_01503801403-sm-01_ab2c61335e7e4259a58cf17547ecc9e7.png",
      "https://product.hstatic.net/200000532849/product/bo-tra-05-l-camellia-chi-vang_01503801403-sm-02_990f56ac68f34e828b7ff4beac76d996.png",
      "https://product.hstatic.net/200000532849/product/bo-tra-050-l-camellia-trang_01503800003-sm-05_37f5ee668bfd438a989bf4716de6bc8b.png",
      "https://product.hstatic.net/200000532849/product/bo-tra-05-l-camellia-chi-vang_01503801403-sm-04_af3c5eec32934a9699d5750bd7591e38.jpg"
    ],
    "image": "https://product.hstatic.net/200000532849/product/bo-tra-05-l-camellia-chi-vang_01503801403-sm-01_ab2c61335e7e4259a58cf17547ecc9e7.png",
    "sourceUrl": "https://minhlong.com/products/bo-tra-0-5-l-camellia-chi-vang",
    "stock": 273,
    "slug": "bo-tra-0-5-l-camellia-chi-vang",
    "description": "Dãy sản phẩm Camellia đa dạng các kiểu dáng với chất liệu men sứ sáng bóng, láng mịn được nung ở nhiệt độ cao. Không họa tiết cầu kỳ nhưng các sản phẩm Camellia luôn được lòng khách bởi màu sắc trang nhã, dù là trắng trơn hay viền chỉ vàng, chỉ xanh dương đều giúp lưu giữ vị ngon của tách trà nóng, của món ăn ngon và khơi gợi cảm hứng cho người thưởng thức.",
    "status": "active",
    "averageRating": 0,
    "reviewCount": 0
  },
  {
    "name": "Bộ trà 0.8 L - Camellia - Chỉ Vàng",
    "sku": "A001_01803801403",
    "collectionName": "Camellia - Chỉ Vàng",
    "categorySlug": "bo-tra-ca-phe",
    "price": 1220400,
    "images": [
      "https://product.hstatic.net/200000532849/product/bo-tra-08-l-camellia-chi-vang_01803801403-sm-01_91287cb9ecf04533a0adb34470db02be.png",
      "https://product.hstatic.net/200000532849/product/bo-tra-08-l-camellia-chi-vang_01803801403-sm-02_fc2b20edd8af48668173817874b13d40.png",
      "https://product.hstatic.net/200000532849/product/download_d53a444c779348929eed7ec2c44d11a2.png",
      "https://product.hstatic.net/200000532849/product/bo-tra-08-l-camellia-chi-vang_01803801403-sm-04_65d8f81273df44c6a353a251bf64af44.jpg"
    ],
    "image": "https://product.hstatic.net/200000532849/product/bo-tra-08-l-camellia-chi-vang_01803801403-sm-01_91287cb9ecf04533a0adb34470db02be.png",
    "sourceUrl": "https://minhlong.com/products/bo-tra-0-8-l-camellia-chi-vang",
    "stock": 139,
    "slug": "bo-tra-0-8-l-camellia-chi-vang",
    "description": "Dãy sản phẩm Camellia đa dạng các kiểu dáng với chất liệu men sứ sáng bóng, láng mịn được nung ở nhiệt độ cao. Không họa tiết cầu kỳ nhưng các sản phẩm Camellia luôn được lòng khách bởi màu sắc trang nhã, dù là trắng trơn hay viền chỉ vàng, chỉ xanh dương đều giúp lưu giữ vị ngon của tách trà nóng, của món ăn ngon và khơi gợi cảm hứng cho người thưởng thức.\nCHI TIẾT BỘ TRÀ:\nBình trà 0.8 L + Nắp 01 Cái\nTách trà 0.11 L 06 Cái\nDĩa lót tách 12.5 cm 06 Cái",
    "status": "active",
    "averageRating": 0,
    "reviewCount": 0
  },
  {
    "name": "Bình trà + nắp - Camellia - Chỉ Vàng",
    "sku": "A001_015038014",
    "collectionName": "Camellia - Chỉ Vàng",
    "categorySlug": "binh-tra",
    "price": 615600,
    "images": [
      "https://product.hstatic.net/200000532849/product/binh-tra-05-l-nap-camellia-chi-vang_015038014-sm-01_60a345976a3a4a0ba88c18fd28013223.png",
      "https://product.hstatic.net/200000532849/product/btra-08-lnap-camellia-chi-vang_018038014-sm-01_6dd703f1509b47ca9eeb36898325d683.png"
    ],
    "image": "https://product.hstatic.net/200000532849/product/binh-tra-05-l-nap-camellia-chi-vang_015038014-sm-01_60a345976a3a4a0ba88c18fd28013223.png",
    "sourceUrl": "https://minhlong.com/products/binh-tra-0-8-l-nap-camellia-chi-vang-2",
    "stock": 10,
    "slug": "binh-tra-0-8-l-nap-camellia-chi-vang-2",
    "description": "Dãy sản phẩm Camellia đa dạng các kiểu dáng với chất liệu men sứ sáng bóng, láng mịn được nung ở nhiệt độ cao. Không họa tiết cầu kỳ nhưng các sản phẩm Camellia luôn được lòng khách bởi màu sắc trang nhã, dù là trắng trơn hay viền chỉ vàng, chỉ xanh dương đều giúp lưu giữ vị ngon của tách trà nóng, của món ăn ngon và khơi gợi cảm hứng cho người thưởng thức.",
    "status": "active",
    "averageRating": 0,
    "reviewCount": 0
  },
  {
    "name": "Tách trà - Camellia - Chỉ Vàng",
    "sku": "A001_020821014",
    "collectionName": "Camellia - Chỉ Vàng",
    "categorySlug": "tach-tra",
    "price": 55080,
    "images": [
      "https://cdn.hstatic.net/products/200000532849/avatar__3__72e0102a18e142ac862d23e658bde886.png",
      "https://cdn.hstatic.net/products/200000532849/avatar__2__2c447cfb158c4581a3d5e64f0bbecfd3.png"
    ],
    "image": "https://cdn.hstatic.net/products/200000532849/avatar__3__72e0102a18e142ac862d23e658bde886.png",
    "sourceUrl": "https://minhlong.com/products/tach-tra-0-08-l-camellia-chi-vang-2",
    "stock": 128,
    "slug": "tach-tra-0-08-l-camellia-chi-vang-2",
    "description": "Dãy sản phẩm Camellia đa dạng các kiểu dáng với chất liệu men sứ sáng bóng, láng mịn được nung ở nhiệt độ cao. Không họa tiết cầu kỳ nhưng các sản phẩm Camellia luôn được lòng khách bởi màu sắc trang nhã, dù là trắng trơn hay viền chỉ vàng, chỉ xanh dương đều giúp lưu giữ vị ngon của tách trà nóng, của món ăn ngon và khơi gợi cảm hứng cho người thưởng thức.",
    "status": "active",
    "averageRating": 0,
    "reviewCount": 0
  },
  {
    "name": "Dĩa lót tách - Camellia - Chỉ Vàng",
    "sku": "A001_041164014",
    "collectionName": "Camellia - Chỉ Vàng",
    "categorySlug": "dia",
    "price": 55080,
    "images": [
      "https://product.hstatic.net/200000532849/product/dia-lot-tach-11-cm-camellia-chi-vang_041164014-sm-01_2a34f641eb954d40b3dc33287bcc3077.png",
      "https://product.hstatic.net/200000532849/product/dlot-tach-125-cm-camellia-chi-vang_041264014-sm-01_03106585daa64da3a2544ccbe857c9d9.png"
    ],
    "image": "https://product.hstatic.net/200000532849/product/dia-lot-tach-11-cm-camellia-chi-vang_041164014-sm-01_2a34f641eb954d40b3dc33287bcc3077.png",
    "sourceUrl": "https://minhlong.com/products/dia-lot-tach-camellia-chi-vang-2",
    "stock": 49,
    "slug": "dia-lot-tach-camellia-chi-vang-2",
    "description": "Dãy sản phẩm Camellia đa dạng các kiểu dáng với chất liệu men sứ sáng bóng, láng mịn được nung ở nhiệt độ cao. Không họa tiết cầu kỳ nhưng các sản phẩm Camellia luôn được lòng khách bởi màu sắc trang nhã, dù là trắng trơn hay viền chỉ vàng, chỉ xanh dương đều giúp lưu giữ vị ngon của tách trà nóng, của món ăn ngon và khơi gợi cảm hứng cho người thưởng thức.",
    "status": "active",
    "averageRating": 0,
    "reviewCount": 0
  },
  {
    "name": "Bộ bát đĩa hoa mặt trời Hoa Mẫu Đơn men lam",
    "sku": "LL-BDA-9834",
    "collectionName": "Bộ Đồ Ăn Hoa Mặt Trời Men Lam",
    "categorySlug": "bo-do-an",
    "price": 1890000,
    "images": [
      "https://gomsulongloan.vn/wp-content/uploads/2025/10/bo-bat-dia-hoa-mat-troi-men-lam-hoa-day-mau-don-gom-su-bat-trang.jpg",
      "https://gomsulongloan.vn/wp-content/uploads/2025/10/bo-bat-dia-hoa-mat-troi-men-lam-hoa-day-mau-don-gom-su-bat-trang-long-loan.jpg"
    ],
    "image": "https://gomsulongloan.vn/wp-content/uploads/2025/10/bo-bat-dia-hoa-mat-troi-men-lam-hoa-day-mau-don-gom-su-bat-trang.jpg",
    "sourceUrl": "https://gomsulongloan.vn/san-pham/bo-bat-dia-hoa-mat-troi-hoa-mau-don-men-lam-bat-trang",
    "stock": 8,
    "slug": "bo-bat-dia-hoa-mat-troi-hoa-mau-don-men-lam-bat-trang",
    "description": "Bộ bát đĩa dáng hoa mặt trời với họa tiết hoa mẫu đơn vẽ tay bằng men lam cổ truyền trên nền men trắng ngà. Bộ gồm 6 đĩa vuông bo góc, 6 bát cơm, 3 chén nước chấm và 1 tô lớn miệng cánh sen.",
    "material": "Gốm sứ Bát Tràng",
    "size": "Bộ 16 món",
    "glazeColor": "Men lam trên nền trắng ngà",
    "firingTemp": "",
    "unit": "Bộ",
    "status": "active",
    "averageRating": 0,
    "reviewCount": 0
  },
  {
    "name": "Bộ bát đĩa hoa mặt trời Công Múa men lam",
    "sku": "LL-BDA-9831",
    "collectionName": "Bộ Đồ Ăn Hoa Mặt Trời Men Lam",
    "categorySlug": "bo-do-an",
    "price": 1950000,
    "images": [
      "https://gomsulongloan.vn/wp-content/uploads/2025/10/bo-bat-dia-hoa-mat-troi-cong-mua-men-lam-gom-su-bat-trang-long-loan.jpg",
      "https://gomsulongloan.vn/wp-content/uploads/2025/10/bo-bat-dia-hoa-mat-troi-cong-mua-men-lam-gom-su-bat-trang-cao-cap-long-loan.jpg"
    ],
    "image": "https://gomsulongloan.vn/wp-content/uploads/2025/10/bo-bat-dia-hoa-mat-troi-cong-mua-men-lam-gom-su-bat-trang-long-loan.jpg",
    "sourceUrl": "https://gomsulongloan.vn/san-pham/bo-bat-dia-hoa-mat-troi-cong-mua-men-lam-bat-trang",
    "stock": 6,
    "slug": "bo-bat-dia-hoa-mat-troi-cong-mua-men-lam-bat-trang",
    "description": "Bộ bát đĩa dáng hoa mặt trời, họa tiết đôi chim công và hoa lá phối men lam. Bộ gồm 6 đĩa bày món ăn, 1 tô lớn ở trung tâm, 6 bát cơm và 3 chén gia vị.",
    "material": "Gốm sứ Bát Tràng",
    "size": "Bộ 16 món",
    "glazeColor": "Men lam",
    "firingTemp": "",
    "unit": "Bộ",
    "status": "active",
    "averageRating": 0,
    "reviewCount": 0
  },
  {
    "name": "Bộ bát đĩa hoa mặt trời Phú Quý Trường An men lam",
    "sku": "LL-BDA-9828",
    "collectionName": "Bộ Đồ Ăn Hoa Mặt Trời Men Lam",
    "categorySlug": "bo-do-an",
    "price": 1990000,
    "images": [
      "https://gomsulongloan.vn/wp-content/uploads/2025/10/bo-bat-dia-hoa-mat-troi-phu-quy-truong-an-men-lam-gom-su-bat-trang-long-loan.jpg",
      "https://gomsulongloan.vn/wp-content/uploads/2025/10/bo-bat-dia-hoa-mat-troi-phu-quy-truong-an-men-lam-gom-su-bat-trang-long-loan-cao-cap.jpg"
    ],
    "image": "https://gomsulongloan.vn/wp-content/uploads/2025/10/bo-bat-dia-hoa-mat-troi-phu-quy-truong-an-men-lam-gom-su-bat-trang-long-loan.jpg",
    "sourceUrl": "https://gomsulongloan.vn/san-pham/bo-bat-dia-hoa-mat-troi-phu-quy-truong-an-men-lam-bat-trang",
    "stock": 5,
    "slug": "bo-bat-dia-hoa-mat-troi-phu-quy-truong-an-men-lam-bat-trang",
    "description": "Bộ bát đĩa hoa mặt trời men lam với họa tiết cá chép, phượng hoàng, hoa sen và chữ Thọ. Bộ gồm 6 đĩa bày món, 1 tô lớn, 6 bát cơm và 3 chén chấm.",
    "material": "Gốm sứ Bát Tràng",
    "size": "Bộ 16 món",
    "glazeColor": "Men lam",
    "firingTemp": "",
    "unit": "Bộ",
    "status": "active",
    "averageRating": 0,
    "reviewCount": 0
  },
  {
    "name": "Bình gốm Song Phượng Vinh Hoa men lam",
    "sku": "LL-BINH-9449",
    "collectionName": "Bình Men Lam Cổ Điển",
    "categorySlug": "binh",
    "price": 3250000,
    "images": [
      "https://gomsulongloan.vn/wp-content/uploads/2025/08/binh-gom-phuong-hoang-mau-don-men-lam-gom-su-bat-trang-cao-cap.jpg",
      "https://gomsulongloan.vn/wp-content/uploads/2025/08/binh-gom-phuong-hoang-mau-don-men-lam-gom-su-bat-trang.jpg",
      "https://gomsulongloan.vn/wp-content/uploads/2025/08/binh-gom-phuong-hoang-mau-don-men-lam-gom-su-bat-trang-long-loan-co-binh.jpg"
    ],
    "image": "https://gomsulongloan.vn/wp-content/uploads/2025/08/binh-gom-phuong-hoang-mau-don-men-lam-gom-su-bat-trang-cao-cap.jpg",
    "sourceUrl": "https://gomsulongloan.vn/san-pham/binh-gom-song-phuong-vinh-hoa-men-lam-bat-trang",
    "stock": 4,
    "slug": "binh-gom-song-phuong-vinh-hoa-men-lam-bat-trang",
    "description": "Bình dáng chum, vai nở, cổ thắt nhẹ và miệng loe; trang trí đôi phượng hoàng cùng dây hoa mẫu đơn vẽ tay trên nền men lam. Nguồn sản phẩm ghi chiều cao 40 cm.",
    "material": "Gốm sứ Bát Tràng",
    "size": "Cao 40 cm",
    "glazeColor": "Men lam",
    "firingTemp": "",
    "unit": "Chiếc",
    "status": "active",
    "averageRating": 0,
    "reviewCount": 0
  },
  {
    "name": "Bình gốm Tôn Tử Vạn Đại men lam",
    "sku": "LL-BINH-9252",
    "collectionName": "Bình Men Lam Cổ Điển",
    "categorySlug": "binh",
    "price": 2950000,
    "images": [
      "https://gomsulongloan.vn/wp-content/uploads/2025/08/binh-gom-trung-bay-ton-tu-van-dai-men-lam-cao-cap-long-loan-bat-trang.jpg",
      "https://gomsulongloan.vn/wp-content/uploads/2025/08/binh-gom-trung-bay-ton-tu-van-dai-men-lam-long-loan-bat-trang-cao-cap.jpg",
      "https://gomsulongloan.vn/wp-content/uploads/2025/08/binh-gom-bat-trang-ton-tu-van-dai-men-lam-long-loan-cao-cap.jpg"
    ],
    "image": "https://gomsulongloan.vn/wp-content/uploads/2025/08/binh-gom-trung-bay-ton-tu-van-dai-men-lam-cao-cap-long-loan-bat-trang.jpg",
    "sourceUrl": "https://gomsulongloan.vn/san-pham/binh-gom-ton-tu-van-dai-men-lam-bat-trang",
    "stock": 3,
    "slug": "binh-gom-ton-tu-van-dai-men-lam-bat-trang",
    "description": "Bình dáng chum cổ, thân phình tròn và miệng nhỏ. Họa tiết trẻ em vui chơi được vẽ tay bằng men lam truyền thống trên nền men trắng.",
    "material": "Gốm sứ Bát Tràng",
    "size": "Chưa công bố",
    "glazeColor": "Men lam",
    "firingTemp": "",
    "unit": "Chiếc",
    "status": "active",
    "averageRating": 0,
    "reviewCount": 0
  },
  {
    "name": "Bình hoa Cẩm Tú Cầu men lam",
    "sku": "LL-BINH-9074",
    "collectionName": "Bình Men Lam Cổ Điển",
    "categorySlug": "binh",
    "price": 2150000,
    "images": [
      "https://gomsulongloan.vn/wp-content/uploads/2025/08/binh-gom-decor-hoa-cam-tu-cau-men-lam-gom-su-bat-trang.jpg",
      "https://gomsulongloan.vn/wp-content/uploads/2025/08/binh-gom-decor-hoa-cam-tu-cau-men-lam-gom-su-bat-trang-cao-cap.jpg",
      "https://gomsulongloan.vn/wp-content/uploads/2025/08/binh-gom-decor-hoa-cam-tu-cau-men-lam-gom-su-bat-trang-cao-cap-long-loan.jpg",
      "https://gomsulongloan.vn/wp-content/uploads/2025/08/binh-gom-decor-hoa-cam-tu-cau-men-lam-gom-su-bat-trang-cao-cap-dep.jpg"
    ],
    "image": "https://gomsulongloan.vn/wp-content/uploads/2025/08/binh-gom-decor-hoa-cam-tu-cau-men-lam-gom-su-bat-trang.jpg",
    "sourceUrl": "https://gomsulongloan.vn/san-pham/binh-hoa-cam-tu-cau-men-lam-gom-su-bat-trang",
    "stock": 7,
    "slug": "binh-hoa-cam-tu-cau-men-lam-gom-su-bat-trang",
    "description": "Bình hoa dáng trụ tròn với cổ thắt và miệng loe nhẹ, trang trí hoa cẩm tú cầu bằng các sắc độ men lam trên nền trắng. Kích thước không được công bố trên trang nguồn.",
    "material": "Gốm sứ Bát Tràng",
    "size": "Chưa công bố",
    "glazeColor": "Men lam",
    "firingTemp": "",
    "unit": "Chiếc",
    "status": "active",
    "averageRating": 0,
    "reviewCount": 0
  }
];

async function seed() {
  try {
    if (!APPLY) {
      console.log('🔍 DRY RUN - chưa ghi MongoDB');
      for (const item of sampleProducts) console.log(` • ${item.name} | ${item.sku} | ${item.sourceUrl}`);
      console.log(`Tổng ${sampleProducts.length} sản phẩm. Để nạp thật, xin phép lead rồi chạy với --apply.`);
      return;
    }
    if (!MONGO_URI) throw new Error('Thiếu MONGODB_URI trong server/.env');
    await mongoose.connect(MONGO_URI);
    if (!CONFIRM_DB) {
      throw new Error('Cần xác nhận database bằng --confirm-db=TEN_DATABASE trước khi ghi dữ liệu');
    }
    if (CONFIRM_DB !== mongoose.connection.name) {
      throw new Error(`Database xác nhận "${CONFIRM_DB}" không khớp database đang kết nối "${mongoose.connection.name}"`);
    }
    const Product = require('./src/models/Product');
    const Category = require('./src/models/Category');
    const Collection = require('./src/models/Collection');
    const categories = await Category.find({}).lean();
    const collections = await Collection.find({}).lean();
    const catMap = new Map(categories.map((c) => [c.slug, c._id]));
    const collectionMap = new Map(
      collections.map((collection) => [collection.name.trim().toLowerCase(), collection._id])
    );

    // Dừng toàn bộ ngay nếu thiếu danh mục hay bộ sưu tập.
    for (const p of sampleProducts) {
      if (!catMap.has(p.categorySlug)) throw new Error(`Chưa có category ${p.categorySlug}; chạy seed_categories.js trước`);
      if (!collectionMap.has(p.collectionName.trim().toLowerCase())) {
        throw new Error(`Chưa có collection ${p.collectionName}; chạy seed_collections.js trước`);
      }
    }

    let created = 0, updated = 0;
    for (const item of sampleProducts) {
      const payload = {
        name: item.name,
        collectionName: item.collectionName,
        sourceUrl: item.sourceUrl,
        sku: item.sku,
        categoryId: catMap.get(item.categorySlug),
        collectionId: collectionMap.get(item.collectionName.trim().toLowerCase()),
        slug: item.slug,
        description: item.description,
        price: item.price,
        stock: item.stock,
        images: item.images,
        image: item.image, // frontend cũ có thể dùng ảnh đơn
        status: item.status,
        averageRating: item.averageRating,
        reviewCount: item.reviewCount,
        material: item.material || '',
        size: item.size || '',
        glazeColor: item.glazeColor || '',
        firingTemp: item.firingTemp || '',
        unit: item.unit || 'Chiếc',
      };
      const sameSku = await Product.findOne({ sku: item.sku });
      const sameSlug = await Product.findOne({ slug: item.slug });
      if (sameSku && sameSlug && String(sameSku._id) !== String(sameSlug._id)) {
        throw new Error(`Trùng SKU/slug ở 2 document khác nhau: ${item.name}`);
      }
      const existing = sameSku || sameSlug;
      if (!existing) {
        await Product.create(payload);
        created++;
      } else {
        await Product.updateOne({ _id: existing._id }, { $set: payload });
        updated++;
      }
    }
    console.log(`✅ Products: thêm ${created}, cập nhật ${updated}`);
  } catch (error) {
    console.error('❌ Seed products thất bại:', error.message);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState) await mongoose.disconnect();
  }
}
seed();
