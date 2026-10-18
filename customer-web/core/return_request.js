// core/return_request.js
// 1. Hàm chuẩn hóa Tiếng Việt (NFC Normalization)
function fixVietnameseText(str) {
  if (!str) return '';
  return str.normalize('NFC');
}

// 2. Hàm khởi tạo và gắn sự kiện cho trang Đổi Trả (Gọi sau khi HTML được nạp vào viewport)
function initReturnRequestPage() {
  // Chuẩn hóa tiêu đề
  const modalTitle = document.getElementById('modalTitle');
  if (modalTitle) {
    modalTitle.textContent = fixVietnameseText(modalTitle.textContent);
  }

  // Xử lý đổi màu viền Radio Card khi chọn
  const radioInputs = document.querySelectorAll('input[name="reason"]');
  radioInputs.forEach(radio => {
    radio.addEventListener('change', () => {
      document.querySelectorAll('.radio-card').forEach(card => {
        card.classList.remove('border-2', 'border-amber-800/80', 'bg-amber-50/30');
        card.classList.add('border', 'border-slate-200', 'bg-white');
      });
      if (radio.checked) {
        const parentLabel = radio.closest('.radio-card');
        if (parentLabel) {
          parentLabel.classList.remove('border', 'border-slate-200', 'bg-white');
          parentLabel.classList.add('border-2', 'border-amber-800/80', 'bg-amber-50/30');
        }
      }
    });
  });

  // Xử lý hiển thị tên tệp tải lên
  const evidenceInput = document.getElementById('evidenceInput');
  const fileNameText = document.getElementById('fileNameText');
  if (evidenceInput && fileNameText) {
    evidenceInput.addEventListener('change', (e) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        fileNameText.textContent = fixVietnameseText(files[0].name);
      }
    });
  }

  // Xử lý nút Hủy & Đóng
  const closeModal = () => {
    // Điều hướng quay lại trang Lịch sử đơn hàng
    if (typeof navigateTo === 'function') {
      navigateTo('order-detail');
    } else {
      window.location.hash = '#order-detail';
    }
  };

  document.getElementById('closeModalBtn')?.addEventListener('click', closeModal);
  document.getElementById('cancelBtn')?.addEventListener('click', closeModal);

  // Xử lý submit form
  const returnForm = document.getElementById('returnForm');
  if (returnForm) {
    returnForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const selectedProduct = document.getElementById('productSelect')?.value || '';
      const selectedReason = document.querySelector('input[name="reason"]:checked')?.value || '';
      
      alert(fixVietnameseText(`Đã gửi yêu cầu đổi trả thành công!\n\n• Sản phẩm: ${selectedProduct}\n• Lý do: ${selectedReason}`));
      closeModal();
    });
  }
}