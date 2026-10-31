const mongoose = require('mongoose');

const DEFAULT_MONGO_URI = 'mongodb://dinhthenhon_db_user:dinhthenhongmail.com@ac-1u1pbza-shard-00-00.y2hcyuo.mongodb.net:27017,ac-1u1pbza-shard-00-01.y2hcyuo.mongodb.net:27017,ac-1u1pbza-shard-00-02.y2hcyuo.mongodb.net:27017/?ssl=true&replicaSet=atlas-13eeom-shard-0&authSource=admin&appName=craftory-ecommerce-cluster';

mongoose.connect(DEFAULT_MONGO_URI).then(async () => {
  const Account = require('./src/models/Account');
  const Product = require('./src/models/Product');
  const Order = require('./src/models/Order');

  console.log('Seeding initial data strictly matching schemas...');
  const products = await Product.find({});
  const pIds = products.map(p => p._id);

/**
 * =========================================================================
 * MODULE: QUẢN LÝ TÀI KHOẢN & KHÁCH HÀNG (ACCOUNTS)
 * File: server/seed_customers.js
 * Thành viên phụ trách Module Khách hàng / Auth chỉnh sửa và quản lý tại file này.
 * Chạy lệnh: node seed_customers.js
 * =========================================================================
 */
const sampleAccounts = [
    {
      fullName: 'Nguyễn Hoàng Nam',
      email: 'hoangnam@gomthanhxuan.vn',
      phone: '0918345678',
      passwordHash: '123456',
      role: 'customer',
      status: 'active',
      addresses: [
        {
          recipientName: 'Nguyễn Hoàng Nam',
          phone: '0918345678',
          province: 'Hà Nội',
          ward: 'Gia Lâm',
          detail: 'Biệt thự số 12, Khu Đô Thị Ecopark, Bát Tràng',
          isDefault: true
        }
      ],
      wishlist: pIds.slice(0, 3)
    },
    {
      fullName: 'Trưởng ban Quản trị',
      email: 'admin@gomthanhxuan.vn',
      phone: '0901234567',
      passwordHash: 'admin123',
      role: 'admin',
      status: 'active',
      addresses: [],
      wishlist: []
    },
    {
      fullName: 'Trần Thu Hà',
      email: 'thuha.tran@heritage.vn',
      phone: '0987654321',
      passwordHash: '123456',
      role: 'customer',
      status: 'active',
      addresses: [
        {
          recipientName: 'Trần Thu Hà',
          phone: '0987654321',
          province: 'TP. Hồ Chí Minh',
          ward: 'Quận 1',
          detail: '45 Lê Duẩn, Bến Nghé',
          isDefault: true
        }
      ],
      wishlist: pIds.slice(1, 4)
    },
    {
      fullName: 'Lê Anh Tuấn',
      email: 'tuan.le@ceramicart.com',
      phone: '0933456789',
      passwordHash: '123456',
      role: 'customer',
      status: 'active',
      addresses: [
        {
          recipientName: 'Lê Anh Tuấn',
          phone: '0933456789',
          province: 'Đà Nẵng',
          ward: 'Hải Châu',
          detail: '12 Trần Phú',
          isDefault: true
        }
      ],
      wishlist: pIds.slice(2, 5)
    },
    {
      fullName: 'Phạm Minh Quân',
      email: 'quan.pham@battrangpottery.vn',
      phone: '0944567890',
      passwordHash: '123456',
      role: 'customer',
      status: 'blocked', // Tài khoản bị khóa mẫu để hiển thị trên Admin
      addresses: [
        {
          recipientName: 'Phạm Minh Quân',
          phone: '0944567890',
          province: 'Hà Nội',
          ward: 'Cầu Giấy',
          detail: '18 Duy Tân',
          isDefault: true
        }
      ],
      wishlist: []
    }
  ];

  for (const acc of sampleAccounts) {
    let existing = await Account.findOne({ $or: [{ email: acc.email }, { phone: acc.phone }] });
    if (!existing) {
      existing = await Account.create(acc);
      console.log(`Created account: ${existing.fullName} (${existing.phone})`);
    } else {
      console.log(`Account exists: ${existing.fullName}`);
    }

    // Tạo đơn hàng mẫu cho Nguyễn Hoàng Nam nếu chưa có
    if (acc.phone === '0918345678' && pIds.length >= 2) {
      const existingOrder = await Order.findOne({ accountId: existing._id });
      if (!existingOrder) {
        const p1 = products[0];
        const p2 = products[1];
        const subtotal = p1.price * 1 + p2.price * 2;
        const total = subtotal;

        const order1 = await Order.create({
          orderCode: 'DH1705001',
          accountId: existing._id,
          items: [
            {
              productId: p1._id,
              productName: p1.name,
              unitPrice: p1.price,
              quantity: 1
            },
            {
              productId: p2._id,
              productName: p2.name,
              unitPrice: p2.price,
              quantity: 2
            }
          ],
          subtotal: subtotal,
          shippingFee: 0,
          discount: 0,
          totalAmount: total,
          shippingAddress: {
            recipientName: existing.fullName,
            phone: existing.phone,
            province: 'Hà Nội',
            ward: 'Gia Lâm',
            detail: 'Khu Đô Thị Ecopark, Bát Tràng'
          },
          paymentStatus: 'paid',
          orderStatus: 'completed'
        });
        console.log(`Created sample order for ${existing.fullName}: #${order1.orderCode}`);
      }
    }

    // Tạo đơn hàng mẫu cho Trần Thu Hà
    if (acc.phone === '0987654321' && pIds.length >= 3) {
      const existingOrder2 = await Order.findOne({ accountId: existing._id });
      if (!existingOrder2) {
        const p3 = products[2];
        const subtotal2 = p3.price * 1;
        await Order.create({
          orderCode: 'DH1705002',
          accountId: existing._id,
          items: [
            {
              productId: p3._id,
              productName: p3.name,
              unitPrice: p3.price,
              quantity: 1
            }
          ],
          subtotal: subtotal2,
          shippingFee: 30000,
          discount: 0,
          totalAmount: subtotal2 + 30000,
          shippingAddress: {
            recipientName: existing.fullName,
            phone: existing.phone,
            province: 'TP. Hồ Chí Minh',
            ward: 'Quận 1',
            detail: '45 Lê Duẩn, Bến Nghé'
          },
          paymentStatus: 'pending',
          orderStatus: 'confirmed'
        });
        console.log(`Created sample order for ${existing.fullName}: #DH1705002`);
      }
    }
  }

  console.log('Seed completed successfully!');
  process.exit(0);
}).catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
