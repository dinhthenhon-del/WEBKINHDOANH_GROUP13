const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const Product = require('./models/Product');

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

// 4. API: Thêm sản phẩm mới (Nhận link ảnh URL trực tiếp từ web)
app.post('/api/products', async (req, res) => {
  try {
    const { name, price, stock, description, image } = req.body;

    const newProduct = new Product({
      name,
      price: Number(price),
      stock: Number(stock) || 0,
      description,
      image: image || '',
    });

    await newProduct.save();
    res.status(201).json({ success: true, data: newProduct });
  } catch (error) {
    console.error('Lỗi khi thêm sản phẩm:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 5. API: Cập nhật sản phẩm
app.put('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
    }

    const { name, price, stock, description, image } = req.body;
    if (name !== undefined) product.name = name;
    if (price !== undefined) product.price = Number(price);
    if (stock !== undefined) product.stock = Number(stock);
    if (description !== undefined) product.description = description;
    if (image !== undefined) product.image = image;

    await product.save();
    res.status(200).json({ success: true, data: product });
  } catch (error) {
    console.error('Lỗi khi cập nhật sản phẩm:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 6. API: Xóa sản phẩm
app.delete('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
    }

    res.status(200).json({ success: true, message: 'Đã xóa sản phẩm thành công!' });
  } catch (error) {
    console.error('Lỗi khi xóa sản phẩm:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 7. API: Lấy danh sách danh mục / bộ sưu tập
const Category = require('./models/Category');
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await Category.find({ status: 'active' }).sort({ createdAt: 1 });
    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// THÀNH VIÊN 1: AUTH, PROFILE, WISHLIST, ORDERS
// Tuân thủ 100% Phase 4 và Model Account / Order
// ==========================================
const Account = require('./models/Account');
const Order = require('./models/Order');

// 1. API Đăng ký tài khoản khách hàng (UC-C01)
app.post('/api/auth/register', async (req, res) => {
  try {
    const { fullName, email, phone, password } = req.body;
    if (!fullName || !email || !phone || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đầy đủ thông tin' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanPhone = phone.trim();

    const existingEmail = await Account.findOne({ email: cleanEmail });
    if (existingEmail) {
      return res.status(400).json({ success: false, message: 'Thư điện tử này đã được đăng ký' });
    }

    const existingPhone = await Account.findOne({ phone: cleanPhone });
    if (existingPhone) {
      return res.status(400).json({ success: false, message: 'Đường dây liên lạc (SĐT) này đã được sử dụng' });
    }

    const newAccount = new Account({
      fullName: fullName.trim(),
      email: cleanEmail,
      phone: cleanPhone,
      passwordHash: password, // Mật khẩu hash theo Schema
      role: 'customer',
      status: 'active',
      addresses: [],
      wishlist: []
    });

    await newAccount.save();
    const accountData = newAccount.toObject();
    delete accountData.passwordHash;

    res.status(201).json({ success: true, message: 'Đăng ký thành công', data: accountData });
  } catch (error) {
    console.error('Lỗi đăng ký:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. API Đăng nhập khách hàng (UC-C02)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { emailOrPhone, password } = req.body;
    if (!emailOrPhone || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập tài khoản và mật khẩu' });
    }

    const cleanInput = String(emailOrPhone).trim();
    // Chuẩn hóa số điện thoại: loại bỏ khoảng trắng, dấu chấm, dấu gạch nối, đổi +84 thành 0
    const normalizedPhone = cleanInput.replace(/[\s.\-()]/g, '').replace(/^\+84/, '0');
    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Tìm kiếm thông minh đa năng: Email, Số điện thoại (chuẩn hóa), Họ tên, hoặc tiền tố Email (Username)
    const orConditions = [
      { email: cleanInput.toLowerCase() },
      { phone: cleanInput },
      { phone: normalizedPhone },
      { fullName: new RegExp('^' + escapeRegex(cleanInput) + '$', 'i') },
      { email: new RegExp('^' + escapeRegex(cleanInput) + '@', 'i') }
    ];

    const account = await Account.findOne({ $or: orConditions }).populate('wishlist');

    if (!account) {
      return res.status(401).json({ success: false, message: 'Tài khoản không tồn tại' });
    }

    if (account.status === 'blocked') {
      return res.status(403).json({ success: false, isBlocked: true, message: 'Tài khoản của bạn hiện tại đã bị khóa' });
    }

    if (account.passwordHash !== password) {
      return res.status(401).json({ success: false, message: 'Mật khẩu bảo mật không chính xác' });
    }

    const accountData = account.toObject();
    delete accountData.passwordHash;

    res.status(200).json({ success: true, message: 'Đăng nhập thành công', data: accountData });
  } catch (error) {
    console.error('Lỗi đăng nhập:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3. API Lấy thông tin tài khoản & danh sách yêu thích (UC-C07)
app.get('/api/accounts/profile/:id', async (req, res) => {
  try {
    const account = await Account.findById(req.params.id)
      .select('-passwordHash')
      .populate('wishlist');

    if (!account) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin tài khoản' });
    }

    if (account.status === 'blocked') {
      return res.status(403).json({ success: false, isBlocked: true, message: 'Tài khoản của bạn hiện tại đã bị khóa' });
    }

    res.status(200).json({ success: true, data: account });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3.1. API Kiểm tra trạng thái tài khoản đang đăng nhập (Heartbeat / Session Validation)
app.get('/api/accounts/check-status/:id', async (req, res) => {
  try {
    const account = await Account.findById(req.params.id).select('status');
    if (!account) {
      return res.status(404).json({ success: false, isBlocked: true, message: 'Tài khoản không tồn tại' });
    }
    if (account.status === 'blocked') {
      return res.status(403).json({ success: false, isBlocked: true, message: 'Tài khoản của bạn hiện tại đã bị khóa' });
    }
    res.status(200).json({ success: true, status: account.status });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 4. API Thêm/Xóa sản phẩm khỏi danh sách yêu thích (Wishlist)
app.post('/api/accounts/wishlist/toggle', async (req, res) => {
  try {
    const { accountId, productId } = req.body;
    if (!accountId || !productId) {
      return res.status(400).json({ success: false, message: 'Thiếu accountId hoặc productId' });
    }

    const account = await Account.findById(accountId);
    if (!account) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản' });
    }

    const index = account.wishlist.indexOf(productId);
    let isAdded = false;

    if (index > -1) {
      account.wishlist.splice(index, 1);
      isAdded = false;
    } else {
      account.wishlist.push(productId);
      isAdded = true;
    }

    await account.save();
    const updatedAccount = await Account.findById(accountId).select('-passwordHash').populate('wishlist');

    res.status(200).json({
      success: true,
      message: isAdded ? 'Đã thêm vào tác phẩm yêu thích' : 'Đã bỏ khỏi danh sách yêu thích',
      isAdded,
      data: updatedAccount
    });
  } catch (error) {
    console.error('Lỗi wishlist:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 5. API Lấy lịch sử đơn hàng của người dùng
app.get('/api/orders/user/:accountId', async (req, res) => {
  try {
    const orders = await Order.find({ accountId: req.params.accountId })
      .populate('items.productId')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: orders });
  } catch (error) {
    console.error('Lỗi lấy đơn hàng:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// THÀNH VIÊN 1: PHÂN HỆ ADMIN QUẢN LÝ KHÁCH HÀNG (UC-A04)
// Tuân thủ 100% Phase 4 và Model Account / Order
// ==========================================

// 1. API Lấy danh sách khách hàng & thống kê chi tiêu, đơn hàng (Tối ưu tốc độ cao với .lean())
app.get('/api/admin/customers', async (req, res) => {
  try {
    const { search, status } = req.query;
    let query = { role: 'customer' };

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { fullName: searchRegex },
        { email: searchRegex },
        { phone: searchRegex }
      ];
    }

    // Truy vấn nhanh với .lean()
    const customers = await Account.find(query)
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .lean();

    // Tính toán số đơn hàng và tổng tiền cho từng khách hàng
    const customerIds = customers.map(c => c._id);
    const orders = await Order.find({ accountId: { $in: customerIds } }).lean();

    const orderStats = {};
    orders.forEach(o => {
      const accId = o.accountId.toString();
      if (!orderStats[accId]) {
        orderStats[accId] = { count: 0, totalSpent: 0 };
      }
      orderStats[accId].count += 1;
      orderStats[accId].totalSpent += (o.totalAmount || 0);
    });

    const enrichedCustomers = customers.map(c => {
      const stats = orderStats[c._id.toString()] || { count: 0, totalSpent: 0 };
      return {
        ...c,
        orderCount: stats.count,
        totalSpent: stats.totalSpent,
        wishlistCount: (c.wishlist || []).length
      };
    });

    // Thống kê KPI trực tiếp từ bộ nhớ, không cần query DB lần 2
    const totalCustomers = enrichedCustomers.length;
    const activeCustomers = enrichedCustomers.filter(c => c.status === 'active').length;
    const blockedCustomers = enrichedCustomers.filter(c => c.status === 'blocked').length;

    res.status(200).json({
      success: true,
      data: enrichedCustomers,
      kpi: {
        totalCustomers,
        activeCustomers,
        blockedCustomers
      }
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách khách hàng admin:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. API Xem chi tiết khách hàng + lịch sử đơn hàng (Tối ưu tốc độ cao với .lean())
app.get('/api/admin/customers/:id', async (req, res) => {
  try {
    const customer = await Account.findById(req.params.id)
      .select('-passwordHash')
      .populate('wishlist')
      .lean();

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy khách hàng' });
    }

    const orders = await Order.find({ accountId: customer._id })
      .populate('items.productId')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: {
        customer,
        orders
      }
    });
  } catch (error) {
    console.error('Lỗi xem chi tiết khách hàng admin:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3. API Thay đổi trạng thái tài khoản khách hàng (Cập nhật nguyên tử cực nhanh)
app.put('/api/admin/customers/:id/status', async (req, res) => {
  try {
    const { status, note } = req.body;
    if (!status || !['active', 'blocked', 'inactive'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ (phải là active, blocked, hoặc inactive)' });
    }

    const customer = await Account.findByIdAndUpdate(
      req.params.id,
      { $set: { status } },
      { new: true }
    ).select('-passwordHash').lean();

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy khách hàng' });
    }

    res.status(200).json({
      success: true,
      message: `Đã cập nhật trạng thái tài khoản sang ${status === 'active' ? 'Hoạt động' : (status === 'blocked' ? 'Đã khóa' : 'Tạm ngừng')}`,
      data: customer
    });
  } catch (error) {
    console.error('Lỗi cập nhật trạng thái khách hàng:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 7. KHỞI ĐỘNG SERVER
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server Backend đang chạy tại http://localhost:${PORT}`);
});