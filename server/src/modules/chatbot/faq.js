/**
 * [THÀNH VIÊN 4] Kịch bản câu hỏi thường gặp (FAQ) của chatbot.
 * - keywords: viết KHÔNG DẤU, chữ thường. Cụm nhiều từ được tính điểm cao hơn.
 * - answer: nội dung trả lời. Các câu về giá, phí, chính sách cần cả nhóm xác nhận lại.
 */

module.exports = [
  {
    id: 'greeting',
    keywords: ['xin chao', 'chao', 'hello', 'hi', 'alo'],
    answer: 'Xin chào bạn! Mình có thể tư vấn về dáng gốm, sắc men, thiết kế 2D, đặt hàng và đổi trả. Bạn muốn hỏi gì ạ?'
  },
  {
    id: 'custom-2d',
    keywords: ['thiet ke', 'tu thiet ke', 'tac che', 'studio', '2d', 'tuy chinh', 'custom', 'ca nhan hoa'],
    answer:
      'Bạn có thể tự thiết kế tại mục "Tác chế 2D" trên thanh menu:\n' +
      '1. Chọn dáng phôi gốm\n2. Chọn sắc men\n3. Chọn họa tiết\n4. Nhập chữ khắc (tối đa 20 ký tự)\n' +
      'Bản xem trước thay đổi ngay khi bạn chọn. Hài lòng thì bấm "Thêm vào giỏ".'
  },
  {
    id: 'engraving',
    keywords: ['khac chu', 'chu khac', 'ky tu', 'khac ten', 'khac chim', 'khac'],
    answer: 'Chữ khắc được tối đa 20 ký tự, tính cả khoảng trắng. Nếu nhập quá, hệ thống sẽ tự cắt phần dư và báo cho bạn.'
  },
  {
    id: 'shapes',
    keywords: ['dang gom', 'phoi', 'binh', 'am tra', 'chum', 'dia', 'kieu dang', 'hinh dang'],
    answer:
      'Studio 2D hiện có 4 dáng phôi:\n• Bình Giọt Nước: thanh cao, hợp trang trí\n• Ấm Trà Quai Mây: hợp bộ trà\n' +
      '• Chum Gốm Nắp Tròn: dáng đầy đặn\n• Đĩa Tròn Viền Mộc: dùng bày biện, thưởng thức'
  },
  {
    id: 'glaze',
    keywords: ['men', 'mau men', 'sac men', 'celadon', 'ngoc', 'ran', 'hoa bien', 'phu sa', 'mau sac', 'mau'],
    answer:
      'Studio 2D có 4 sắc men:\n• Men Ngọc Celadon: xanh ngọc trầm\n• Mộc Sa Phù Sa: đất nung ấm\n' +
      '• Men Rạn Bạch Lạc: trắng ngà, có vân rạn\n• Hỏa Biến Nung Củi: nâu rêu trầm cổ\nMàu hiển thị trên màn hình có thể chênh nhẹ so với sản phẩm thật.'
  },
  {
    id: 'motif',
    keywords: ['hoa van', 'hoa tiet', 'truc', 'sen', 'may', 'hoa sen'],
    answer: 'Có 3 họa tiết: Trúc Vân Khắc Chìm, Sen Cổ Dáng Nước, Mây Lượn Thủy Tộc. Bạn cũng có thể chọn "Trơn Tối Giản" nếu thích để trơn.'
  },
  {
    id: 'price',
    keywords: ['gia', 'bao nhieu tien', 'chi phi', 'tien'],
    answer: 'Giá của từng sản phẩm hiển thị trên trang sản phẩm. Với thiết kế 2D, giá hiển thị ngay trong Studio và ở nút "Thêm vào giỏ".'
  },
  {
    id: 'lead-time',
    keywords: ['thoi gian', 'bao lau', 'khi nao nhan', 'giao hang', 'van chuyen', 'ship'],
    answer: 'Sản phẩm tác chế theo yêu cầu cần khoảng 5 - 7 ngày để vào men và nung. Thời gian giao hàng sẽ hiển thị khi bạn đặt hàng.'
  },
  {
    id: 'payment',
    keywords: ['thanh toan', 'tra tien', 'momo', 'chuyen khoan', 'tien mat', 'cod'],
    answer: 'Bạn có thể thanh toán bằng tiền mặt, MoMo hoặc chuyển khoản. Bạn chọn phương thức ở bước thanh toán trước khi chốt đơn.'
  },
  {
    id: 'order',
    keywords: ['don hang', 'theo doi don', 'huy don', 'dat hang', 'mua hang'],
    answer:
      'Sau khi đặt, bạn theo dõi đơn trong mục tài khoản. Đơn đi qua các bước: Chờ xác nhận, Đã xác nhận, Đang xử lý, Đang giao, Hoàn thành. ' +
      'Bạn chỉ hủy được đơn khi đơn còn ở trạng thái chờ xác nhận.'
  },
  {
    id: 'return',
    keywords: ['doi tra', 'tra hang', 'hoan tien', 'hang loi', 'bao hanh', 'doi hang'],
    answer: 'Khi đơn đã hoàn thành, bạn có thể gửi yêu cầu đổi/trả trong phần quản lý đơn hàng, kèm ảnh hoặc video thể hiện tình trạng sản phẩm. Cửa hàng sẽ xem xét và phản hồi.'
  },
  {
    id: 'care',
    keywords: ['bao quan', 've sinh', 'rua', 'lo vi song', 'nuoc nong', 'cham soc', 'su dung'],
    answer: 'Một vài lưu ý chung cho đồ gốm: tránh thay đổi nhiệt độ đột ngột, rửa bằng nước ấm với bọt biển mềm, tránh vật cứng cọ xát và không để rơi va đập.'
  },
  {
    id: 'account',
    keywords: ['dang nhap', 'dang ky', 'tai khoan', 'quen mat khau', 'mat khau'],
    answer: 'Bạn bấm nút "Đăng nhập" ở góc trên bên phải để đăng nhập hoặc tạo tài khoản. Cần đăng nhập để thêm thiết kế vào giỏ hàng và đặt hàng.'
  },
  {
    id: 'thanks',
    keywords: ['cam on', 'thanks', 'thank you', 'tam biet', 'bye'],
    answer: 'Rất vui được hỗ trợ bạn! Cần gì thêm bạn cứ nhắn nhé.'
  }
];