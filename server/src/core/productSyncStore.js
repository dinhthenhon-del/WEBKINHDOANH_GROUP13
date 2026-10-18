const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const DATA_DIR = path.resolve(__dirname, '../../data');
const RUNTIME_FILE = path.join(DATA_DIR, 'products_runtime.json');

// Đảm bảo thư mục runtime tồn tại
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.error('Không thể tạo thư mục data:', err.message);
  }
}

/**
 * Đọc dữ liệu từ file JSON runtime an toàn
 * @returns {Array} Danh sách sản phẩm trong file runtime
 */
function readRuntimeProducts() {
  try {
    if (!fs.existsSync(RUNTIME_FILE)) {
      return [];
    }
    const content = fs.readFileSync(RUNTIME_FILE, 'utf-8');
    if (!content.trim()) return [];
    return JSON.parse(content);
  } catch (err) {
    console.error('Lỗi đọc file runtime JSON:', err.message);
    return [];
  }
}

/**
 * Ghi nguyên tử (Atomic write) vào file JSON runtime
 * @param {Array} list - Danh sách sản phẩm cần lưu
 */
function writeRuntimeProductsAtomic(list) {
  const tmpFile = `${RUNTIME_FILE}.tmp.${Date.now()}`;
  try {
    fs.writeFileSync(tmpFile, JSON.stringify(list, null, 2), 'utf-8');
    fs.renameSync(tmpFile, RUNTIME_FILE);
  } catch (err) {
    if (fs.existsSync(tmpFile)) {
      try { fs.unlinkSync(tmpFile); } catch (e) {}
    }
    throw new Error(`Ghi file runtime JSON thất bại: ${err.message}`);
  }
}

/**
 * Validate ảnh Base64
 * @param {string} str - Chuỗi Base64 hoặc URL
 * @returns {{ valid: boolean, message?: string }}
 */
function validateImageInput(str) {
  if (!str || typeof str !== 'string') return { valid: true };
  const trimmed = str.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return { valid: true };
  }
  // Base64 Data URL format
  if (trimmed.startsWith('data:image/')) {
    const match = trimmed.match(/^data:image\/(jpeg|jpg|png|webp|gif);base64,/i);
    if (!match) {
      return { valid: false, message: 'Định dạng ảnh Base64 không hợp lệ (chỉ chấp nhận JPG, PNG, WEBP, GIF)' };
    }
    if (trimmed.length > 7 * 1024 * 1024) {
      return { valid: false, message: 'Dung lượng mỗi ảnh không được vượt quá 5 MB' };
    }
    const encodedImage = trimmed.slice(match[0].length);
    const imageBytes = Buffer.from(encodedImage, 'base64');
    if (imageBytes.length === 0 || imageBytes.toString('base64') !== encodedImage) {
      return { valid: false, message: 'Nội dung ảnh Base64 không hợp lệ' };
    }
    if (imageBytes.length > 5 * 1024 * 1024) {
      return { valid: false, message: 'Dung lượng mỗi ảnh không được vượt quá 5 MB' };
    }
    return { valid: true };
  }
  return { valid: false, message: 'Ảnh phải là đường dẫn URL web hoặc chuỗi Base64 Data URI hợp lệ' };
}

/**
 * Luồng TV2 bắt buộc: Admin Form -> Runtime JSON -> MongoDB
 * Thêm mới sản phẩm
 */
async function createProductWithSync(productPayload, ProductModel) {
  // 1. Chuẩn hóa ID và dữ liệu
  const newId = productPayload._id ? new mongoose.Types.ObjectId(productPayload._id) : new mongoose.Types.ObjectId();
  const runtimeItem = {
    ...productPayload,
    _id: newId.toString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // 2. Ghi vào file runtime JSON
  const currentList = readRuntimeProducts();
  const nextList = [runtimeItem, ...currentList.filter(p => p._id !== runtimeItem._id && p.sku !== runtimeItem.sku)];
  writeRuntimeProductsAtomic(nextList);

  // 3. Đồng bộ từ file vào MongoDB
  try {
    const docToSave = new ProductModel({
      ...runtimeItem,
      _id: newId,
    });
    const savedDoc = await docToSave.save();
    return savedDoc;
  } catch (mongoErr) {
    // 4. Nếu MongoDB lỗi, rollback lại file runtime để bảo toàn tính nhất quán
    try {
      writeRuntimeProductsAtomic(currentList);
    } catch (e) {
      console.error('Lỗi khi rollback file runtime:', e.message);
    }
    throw mongoErr;
  }
}

/**
 * Luồng TV2 bắt buộc: Admin Form -> Runtime JSON -> MongoDB
 * Cập nhật sản phẩm
 */
async function updateProductWithSync(productId, updatePayload, ProductModel) {
  const currentList = readRuntimeProducts();
  const existingIndex = currentList.findIndex(p => p._id === productId.toString());

  const previousSnapshot = existingIndex > -1 ? { ...currentList[existingIndex] } : null;
  const updatedItem = {
    ...(previousSnapshot || {}),
    ...updatePayload,
    _id: productId.toString(),
    updatedAt: new Date().toISOString(),
  };

  const nextList = [...currentList];
  if (existingIndex > -1) {
    nextList[existingIndex] = updatedItem;
  } else {
    nextList.unshift(updatedItem);
  }

  // 1. Ghi vào file runtime JSON trước
  writeRuntimeProductsAtomic(nextList);

  // 2. Đồng bộ vào MongoDB
  try {
    const updatedDoc = await ProductModel.findByIdAndUpdate(
      productId,
      { $set: updatePayload },
      { new: true, runValidators: true }
    );
    if (!updatedDoc) {
      throw new Error('Không tìm thấy sản phẩm trong cơ sở dữ liệu MongoDB');
    }
    return updatedDoc;
  } catch (mongoErr) {
    // 3. Rollback nếu MongoDB thất bại
    if (previousSnapshot) {
      try {
        writeRuntimeProductsAtomic(currentList);
      } catch (e) {}
    }
    throw mongoErr;
  }
}

module.exports = {
  readRuntimeProducts,
  writeRuntimeProductsAtomic,
  validateImageInput,
  createProductWithSync,
  updateProductWithSync,
};
