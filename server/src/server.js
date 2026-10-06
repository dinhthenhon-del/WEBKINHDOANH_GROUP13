const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Gọi model sản phẩm (bạn cần đảm bảo đã tạo file src/models/Product.js)
const Product = require('./models/Product'); 

const app = express();

// Middleware: Cấp quyền gọi API và xử lý dữ liệu JSON
app.use(cors());
app.use(express.json()); 

// 1. KẾT NỐI MONGODB (Sử dụng biến môi trường từ file .env)
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ KẾT NỐI MONGODB THÀNH CÔNG!'))
    .catch((err) => console.error('❌ LỖI KẾT NỐI MONGODB:', err));

// 2. DEMO API: Lấy danh sách sản phẩm gốm
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find();
        res.status(200).json({ success: true, data: products });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 3. KHỞI ĐỘNG SERVER
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server Backend đang chạy tại port ${PORT}`);
});