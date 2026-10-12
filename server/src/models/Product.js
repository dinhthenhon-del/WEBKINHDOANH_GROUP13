const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    stock: { type: Number, default: 0 },
    description: String,
    image: { type: String, default: '' },        // Đường dẫn URL ảnh từ Cloudinary (~100 bytes)
    imagePublicId: { type: String, default: '' } // ID định danh để xóa ảnh trên Cloudinary
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);