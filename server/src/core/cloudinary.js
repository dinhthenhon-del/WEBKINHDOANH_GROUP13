const cloudinary = require('cloudinary').v2;
const multer = require('multer');

// Cấu hình Cloudinary: Ưu tiên đọc từ biến môi trường .env, nếu thiếu sẽ fallback sang cấu hình chung của nhóm
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'auu9hky3',
  api_key: process.env.CLOUDINARY_API_KEY || '564881311514256',
  api_secret: process.env.CLOUDINARY_API_SECRET || '2lHLdwdQPxFlrxBDbwYawYc9RfM',
});

// Lưu trữ file trong RAM tạm thời để stream trực tiếp lên Cloudinary (không lưu file rác vào ổ đĩa)
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Tối đa 5MB / file
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file hình ảnh (jpg, png, webp, jpeg)!'), false);
    }
  },
});

/**
 * Hàm upload buffer ảnh trực tiếp lên Cloudinary bằng stream
 * @param {Buffer} fileBuffer
 * @param {string} folder
 * @returns {Promise<object>} kết quả trả về từ Cloudinary (gồm secure_url, public_id...)
 */
const uploadToCloudinary = (fileBuffer, folder = 'craftory_products') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: 'image',
        transformation: [{ quality: 'auto', fetch_format: 'auto' }], // Tối ưu nén tự động
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    uploadStream.end(fileBuffer);
  });
};

/**
 * Hàm xóa ảnh trên Cloudinary bằng public_id để tiết kiệm dung lượng
 * @param {string} publicId
 * @returns {Promise<object>}
 */
const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return;
  return cloudinary.uploader.destroy(publicId);
};

module.exports = {
  cloudinary,
  upload,
  uploadToCloudinary,
  deleteFromCloudinary,
};
