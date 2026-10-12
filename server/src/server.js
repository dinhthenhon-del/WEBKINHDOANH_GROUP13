const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const Product = require('./models/Product');
const User = require('./models/User');
const { upload, uploadToCloudinary, deleteFromCloudinary } = require('./core/cloudinary');

// [THÀNH VIÊN 1 - AUTH & USER MANAGEMENT]
const authRoutes = require('./modules/auth/auth.routes');
const usersRoutes = require('./modules/users/users.routes');

const app = express();

const path = require('path');
const { getStorytellingXml, saveStorytellingXml } = require('./core/xmlStore');

// Middleware
const corsOptions = {
  origin: true, // Cho phép mọi origin bao gồm localhost, 127.0.0.1, hoặc null (file://)
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// [Slide 10 XML] Phục vụ tệp tĩnh XML trực tiếp từ server/public
app.use(express.static(path.join(__dirname, '../public')));

// [THÀNH VIÊN 1] Đăng ký router Auth & Users
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);

// [Slide 10 XML API] Endpoint cung cấp dữ liệu XML câu chuyện trang chủ
app.get('/api/content/storytelling.xml', (req, res) => {
  try {
    const xml = getStorytellingXml();
    res.set('Content-Type', 'text/xml; charset=utf-8');
    res.status(200).send(xml);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 1. KẾT NỐI MONGODB & SEED TÀI KHOẢN MẪU
const DEFAULT_MONGO_URI = 'mongodb://dinhthenhon_db_user:dinhthenhongmail.com@ac-1u1pbza-shard-00-00.y2hcyuo.mongodb.net:27017,ac-1u1pbza-shard-00-01.y2hcyuo.mongodb.net:27017,ac-1u1pbza-shard-00-02.y2hcyuo.mongodb.net:27017/?ssl=true&replicaSet=atlas-13eeom-shard-0&authSource=admin&appName=craftory-ecommerce-cluster';
const MONGODB_URI = process.env.MONGODB_URI || DEFAULT_MONGO_URI;

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('✅ KẾT NỐI MONGODB THÀNH CÔNG!');
    // [TV1 Auto Seed] Khởi tạo tài khoản Quản trị viên & Khách hàng mẫu theo Mockup nếu chưa có
    try {
      const adminExists = await User.findOne({ email: 'admin@battrang.vn' });
      if (!adminExists) {
        const adminHash = await User.hashPassword('Admin@123456');
        await User.create({
          fullName: 'Quản Trị Viên Bát Tràng',
          email: 'admin@battrang.vn',
          phone: '0903888999',
          passwordHash: adminHash,
          role: 'ADMIN',
          status: 'ACTIVE'
        });
        console.log('👑 [TV1 Seed] Đã tạo tài khoản Admin mẫu: admin@battrang.vn / Admin@123456');
      }

      const sampleCustomer = await User.findOne({ email: 'huong.le@gmail.com' });
      if (!sampleCustomer) {
        const custHash = await User.hashPassword('123456');
        await User.create([
          {
            customerCode: 'KH-001',
            fullName: 'Lê Thị Mai Hương',
            email: 'huong.le@gmail.com',
            phone: '0912.889.922',
            membershipTier: 'Khách VIP Kim Cương',
            passwordHash: custHash,
            role: 'CUSTOMER',
            status: 'ACTIVE',
            addresses: [{
              recipientName: 'Lê Thị Mai Hương',
              phone: '0912.889.922',
              province: 'Hà Nội',
              ward: 'Gia Lâm',
              addressDetail: 'Số 12 ngõ Xưởng Gốm Bát Tràng',
              isDefault: true
            }]
          },
          {
            customerCode: 'KH-002',
            fullName: 'Trần Quốc Toản',
            email: 'toan.tran@bat-trang.vn',
            phone: '0987.654.321',
            membershipTier: 'Khách Mua Sỉ',
            passwordHash: custHash,
            role: 'CUSTOMER',
            status: 'ACTIVE'
          },
          {
            customerCode: 'KH-003',
            fullName: 'Hoàng Tuấn Kiệt',
            email: 'kiet.hoang@yahoo.com',
            phone: '0904.556.778',
            membershipTier: 'Vi phạm điều khoản hoàn hủy',
            banReason: 'Vi phạm điều khoản hoàn hủy',
            passwordHash: custHash,
            role: 'CUSTOMER',
            status: 'LOCKED' // Tài khoản bị khóa mẫu (Mockup a_customers.html)
          },
          {
            customerCode: 'KH-004',
            fullName: 'Đỗ Mỹ Linh',
            email: 'linh.do@gmail.com',
            phone: '0936.123.456',
            membershipTier: 'Thành viên Thân thiết',
            passwordHash: custHash,
            role: 'CUSTOMER',
            status: 'ACTIVE'
          }
        ]);
        console.log('👥 [TV1 Seed] Đã tạo danh sách khách hàng mẫu theo Mockup Stitch');
      }
    } catch (seedErr) {
      console.warn('Lưu ý seed user:', seedErr.message);
    }
  })
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