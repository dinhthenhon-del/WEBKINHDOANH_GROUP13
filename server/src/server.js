const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const Product = require('./models/Product');
const { upload, uploadToCloudinary, deleteFromCloudinary } = require('./core/cloudinary');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 1. KẾT NỐI MONGODB (Tự động fallback URI dùng chung của nhóm nếu chưa có file .env)
const DEFAULT_MONGO_URI = 'mongodb://dinhthenhon_db_user:dinhthenhongmail.com@ac-1u1pbza-shard-00-00.y2hcyuo.mongodb.net:27017,ac-1u1pbza-shard-00-01.y2hcyuo.mongodb.net:27017,ac-1u1pbza-shard-00-02.y2hcyuo.mongodb.net:27017/?ssl=true&replicaSet=atlas-13eeom-shard-0&authSource=admin&appName=craftory-ecommerce-cluster';
const MONGODB_URI = process.env.MONGODB_URI || DEFAULT_MONGO_URI;

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ KẾT NỐI MONGODB THÀNH CÔNG!'))
  .catch((err) => console.error('❌ LỖI KẾT NỐI MONGODB:', err.message));

// 2. API: Lấy danh sách sản phẩm
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3. API: Lấy chi tiết 1 sản phẩm
app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
    }
    res.status(200).json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 4. API: Thêm sản phẩm mới (Hỗ trợ upload ảnh lên Cloudinary qua multer)
app.post('/api/products', upload.single('image'), async (req, res) => {
  try {
    const { name, price, stock, description } = req.body;

    let imageUrl = '';
    let imagePublicId = '';

    // Nếu có gửi kèm file ảnh, upload trực tiếp từ RAM lên Cloudinary
    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file.buffer, 'craftory_products');
      imageUrl = uploadResult.secure_url;
      imagePublicId = uploadResult.public_id;
    }

    const newProduct = new Product({
      name,
      price: Number(price),
      stock: Number(stock) || 0,
      description,
      image: imageUrl,
      imagePublicId: imagePublicId,
    });

    await newProduct.save();
    res.status(201).json({ success: true, data: newProduct });
  } catch (error) {
    console.error('Lỗi khi thêm sản phẩm:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 5. API: Cập nhật sản phẩm (hỗ trợ đổi ảnh mới, tự động xóa ảnh cũ trên Cloudinary)
app.put('/api/products/:id', upload.single('image'), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
    }

    const { name, price, stock, description } = req.body;
    if (name !== undefined) product.name = name;
    if (price !== undefined) product.price = Number(price);
    if (stock !== undefined) product.stock = Number(stock);
    if (description !== undefined) product.description = description;

    // Nếu người dùng upload ảnh mới thay thế
    if (req.file) {
      // Xóa ảnh cũ trên Cloudinary để giải phóng dung lượng
      if (product.imagePublicId) {
        await deleteFromCloudinary(product.imagePublicId);
      }
      // Upload ảnh mới
      const uploadResult = await uploadToCloudinary(req.file.buffer, 'craftory_products');
      product.image = uploadResult.secure_url;
      product.imagePublicId = uploadResult.public_id;
    }

    await product.save();
    res.status(200).json({ success: true, data: product });
  } catch (error) {
    console.error('Lỗi khi cập nhật sản phẩm:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 6. API: Xóa sản phẩm (đồng thời xóa ảnh trên Cloudinary để tiết kiệm tài nguyên)
app.delete('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
    }

    if (product.imagePublicId) {
      await deleteFromCloudinary(product.imagePublicId);
    }

    await Product.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Đã xóa sản phẩm và giải phóng ảnh trên Cloudinary!' });
  } catch (error) {
    console.error('Lỗi khi xóa sản phẩm:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 7. KHỞI ĐỘNG SERVER
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server Backend đang chạy tại http://localhost:${PORT}`);
});