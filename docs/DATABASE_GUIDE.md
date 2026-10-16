# HƯỚNG DẪN THỐNG NHẤT CẤU TRÚC DATABASE & THAO TÁC MONGODB
> Tài liệu chuẩn hóa cấu trúc dữ liệu theo **data_dictionary (1).docx** dành cho các thành viên trong nhóm dự án.

---

## 1. Cấu trúc tổ chức Model (`server/src/models/`)

Tất cả cấu trúc bảng (Collection) được quy chuẩn hóa thành các **Mongoose Schema** đặt trong thư mục `server/src/models/`. Các thành viên chỉ cần import từ thư mục `models`:

```javascript
// Cách 1: Import nhiều model cùng lúc qua index.js (KHUYÊN DÙNG)
const { Account, Product, Category, Order, Cart, Review, Payment, Design, ReturnRequest } = require('./models');

// Cách 2: Import riêng lẻ từng model
const Product = require('./models/Product');
const Account = require('./models/Account'); // hoặc require('./models/User');
```

---

## 2. Bảng tổng hợp 9 Collection theo Data Dictionary

| STT | Model Class | Tên Collection MongoDB | File định nghĩa | Mô tả & Ràng buộc chính |
| :-- | :--- | :--- | :--- | :--- |
| **1** | `Account` (hoặc `User`) | `accounts` | `Account.js` / `User.js` | Tài khoản: `fullName`, `email` (unique), `phone` (unique), `passwordHash`, `role` (`customer`, `admin`), `status`, `addresses` (nhúng mảng), `wishlist` (ref: Product) |
| **2** | `Category` | `categories` | `Category.js` | Danh mục: `name`, `slug`, `description`, `imageUrl`, `status` (`active`, `inactive`) |
| **3** | `Product` | `products` | `Product.js` | Sản phẩm: `name`, `collectionName`, `sku`, `categoryId` (ref: Category), `price`, `stock`, `images` (mảng URL web), `averageRating`, `reviewCount`, `status` |
| **4** | `Cart` | `carts` | `Cart.js` | Giỏ hàng: `accountId` (ref: Account, unique), `items`: mảng gồm `productId`, `productName`, `unitPrice`, `quantity`, `designId` |
| **5** | `Design` | `designs` | `Design.js` | Thiết kế tùy chỉnh 2D: `accountId`, `productId`, `designName`, `configuration` (`baseColor`, `pattern`, `engravingText` tối đa 20 ký tự, `engravingPosition`), `previewImageUrl` |
| **6** | `Order` | `orders` | `Order.js` | Đơn hàng: `orderCode` (unique), `accountId`, `items` (bản chụp sản phẩm tại thời điểm mua), `subtotal`, `shippingFee`, `discount`, `totalAmount`, `shippingAddress`, `paymentStatus`, `orderStatus` |
| **7** | `Payment` | `payments` | `Payment.js` | Giao dịch thanh toán: `orderId` (ref: Order), `accountId`, `method`, `amount`, `status` (`pending`, `success`, `failed`, `refunded`), `transactionCode`, `paidAt` |
| **8** | `Review` | `reviews` | `Review.js` | Đánh giá: `accountId`, `productId`, `orderId`, `rating` (1 - 5 sao), `comment` |
| **9** | `ReturnRequest` | `returnRequests` | `ReturnRequest.js` | Yêu cầu đổi trả: `orderId`, `items`, `accountId`, `type` (`return`, `exchange`), `reason`, `evidenceImages`, `status`, `processedBy` |

---

## 3. Hướng dẫn thao tác với MongoDB cho các thành viên

### 3.1. Thêm mới dữ liệu (Create)
```javascript
const { Product, Category } = require('./models');

// Thêm sản phẩm mới với link ảnh từ web
const newProduct = await Product.create({
  name: 'Bình hoa gốm thủ công họa tiết mây tre',
  collectionName: 'Bộ sưu tập Thủ công Việt',
  sku: 'CRAFT-VASE-001',
  categoryId: category._id,
  price: 250000,
  stock: 50,
  description: 'Sản phẩm làm từ gốm tự nhiên nung thủ công',
  images: [
    'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61',
    'https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c'
  ],
  image: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61'
});
```

### 3.2. Truy vấn dữ liệu & Kết hợp bảng (Read & Populate)
```javascript
const { Product, Order } = require('./models');

// Lấy danh sách sản phẩm active kèm thông tin danh mục
const products = await Product.find({ status: 'active' })
  .populate('categoryId', 'name slug')
  .sort({ createdAt: -1 });

// Lấy chi tiết đơn hàng kèm thông tin người mua và chi tiết sản phẩm
const order = await Order.findById(orderId)
  .populate('accountId', 'fullName email phone')
  .populate('items.productId', 'name images price');
```

### 3.3. Cập nhật dữ liệu (Update)
```javascript
const { Product, Order } = require('./models');

// Cập nhật tồn kho sản phẩm
await Product.findByIdAndUpdate(
  productId,
  { $inc: { stock: -quantity } },
  { new: true, runValidators: true }
);

// Cập nhật trạng thái đơn hàng
await Order.findByIdAndUpdate(
  orderId,
  { orderStatus: 'confirmed' },
  { new: true }
);
```

### 3.4. Xóa dữ liệu (Delete)
```javascript
const { Cart } = require('./models');

// Xóa giỏ hàng khi người dùng đã đặt hàng thành công
await Cart.findOneAndDelete({ accountId: user._id });
```

---

## 4. Quy ước cần nhớ khi làm việc nhóm
1. **Không tự ý đổi tên trường**: Luôn tuân thủ đúng camelCase theo `data_dictionary (1)` (ví dụ `fullName`, `orderCode`, `paymentStatus`).
2. **Không bỏ qua validation**: Không sửa Schema để tắt các `required` hoặc `enum` mà không bàn bạc trước với nhóm.
3. **Ảnh trực tiếp từ URL**: Trường `images` nhận mảng các chuỗi URL từ các nguồn web, không cần thông qua Cloudinary.
