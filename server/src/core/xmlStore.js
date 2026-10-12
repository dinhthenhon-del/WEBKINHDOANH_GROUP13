/**
 * ============================================================================
 * [THÀNH VIÊN 1 - XML DATA STORE & CONTROLLER]
 * Module quản lý đọc / ghi dữ liệu XML (core/xmlStore.js)
 * Phương pháp áp dụng: Slide 10 (XML và Mô hình DOM)
 *   - XML dùng để lưu trữ và trao đổi dữ liệu
 *   - Đọc và phân phối nội dung XML cho Client và API Backend
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const STORYTELLING_XML_PATH = path.join(__dirname, '../../public/data/storytelling.xml');

/**
 * Đọc toàn bộ nội dung tệp XML câu chuyện trang chủ
 * @returns {string} Chuỗi XML thô
 */
const getStorytellingXml = () => {
  try {
    if (fs.existsSync(STORYTELLING_XML_PATH)) {
      return fs.readFileSync(STORYTELLING_XML_PATH, 'utf-8');
    }
    return '<?xml version="1.0" encoding="UTF-8"?><storytelling></storytelling>';
  } catch (error) {
    console.error('[XML Store Error] Không thể đọc tệp storytelling.xml:', error.message);
    throw error;
  }
};

/**
 * Cập nhật nội dung tệp XML
 * @param {string} xmlContent Chuỗi XML mới
 */
const saveStorytellingXml = (xmlContent) => {
  try {
    fs.writeFileSync(STORYTELLING_XML_PATH, xmlContent, 'utf-8');
    return true;
  } catch (error) {
    console.error('[XML Store Error] Không thể ghi tệp storytelling.xml:', error.message);
    throw error;
  }
};

module.exports = {
  STORYTELLING_XML_PATH,
  getStorytellingXml,
  saveStorytellingXml
};
