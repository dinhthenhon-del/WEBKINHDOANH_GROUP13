const mongoose = require('mongoose');
const Order = require('../../models/Order');
const Product = require('../../models/Product');
const Account = require('../../models/Account');
const Cart = require('../../models/Cart');
const Payment = require('../../models/Payment');

// Luồng chuyển trạng thái hợp lệ DUY NHẤT theo Use Case UC-A03
const VALID_TRANSITIONS = {
  pending: 'confirmed',
  confirmed: 'processing',
  processing: 'shipping',
  shipping: 'completed',
};

/**
 * 1. Lấy danh sách thống kê đơn hàng (phục vụ Order Dashboard & KPI)
 */
async function getOrderStats() {
  const allOrders = await Order.find().lean();

  let pending = 0;
  let confirmed = 0;
  let processing = 0;
  let shipping = 0;
  let completed = 0;
  let cancelled = 0;
  let totalRevenue = 0;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  let todayOrders = 0;

  allOrders.forEach((o) => {
    const rawStatus = (o.orderStatus || o.status || 'pending').toLowerCase();

    if (rawStatus === 'pending') pending++;
    else if (rawStatus === 'confirmed') confirmed++;
    else if (rawStatus === 'processing') processing++;
    else if (rawStatus === 'shipping') shipping++;
    else if (rawStatus === 'completed') {
      completed++;
      totalRevenue += Number(o.totalAmount || 0);
    } else if (rawStatus === 'cancelled') cancelled++;

    const createdAt = new Date(o.createdAt);
    if (createdAt >= todayStart) {
      todayOrders++;
    }
  });

  return {
    totalOrders: allOrders.length,
    pending,
    confirmed,
    processing,
    shipping,
    completed,
    cancelled,
    todayOrders,
    totalRevenue,
  };
}

/**
 * 2. Lấy danh sách đơn hàng có tìm kiếm, lọc trạng thái và phân trang
 */
async function getOrders({ page = 1, limit = 10, status = 'all', keyword = '' }) {
  const numPage = Math.max(1, Number(page) || 1);
  const numLimit = Math.max(1, Number(limit) || 10);
  const skip = (numPage - 1) * numLimit;

  const queryConditions = [];

  // Lọc theo trạng thái
  if (status && status !== 'all') {
    const cleanStatus = status.trim().toLowerCase();
    // Khớp cả orderStatus mới và status cũ
    queryConditions.push({
      $or: [
        { orderStatus: cleanStatus },
        { status: new RegExp(`^${cleanStatus}$`, 'i') },
      ],
    });
  }

  // Tìm kiếm theo mã đơn hoặc thông tin người nhận / khách hàng
  if (keyword && keyword.trim()) {
    const kw = keyword.trim();
    const regex = new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    // Tìm thêm tài khoản khách hàng khớp tên hoặc sđt
    const matchedAccounts = await Account.find({
      $or: [{ fullName: regex }, { phone: regex }, { email: regex }],
    })
      .select('_id')
      .lean();
    const matchedAccountIds = matchedAccounts.map((a) => a._id);

    queryConditions.push({
      $or: [
        { orderCode: regex },
        { 'shippingAddress.recipientName': regex },
        { 'shippingAddress.phone': regex },
        { customerName: regex },
        { customerPhone: regex },
        { customerEmail: regex },
        { accountId: { $in: matchedAccountIds } },
        { customer: { $in: matchedAccountIds } },
      ],
    });
  }

  const finalQuery = queryConditions.length > 0 ? { $and: queryConditions } : {};

  const total = await Order.countDocuments(finalQuery);

  const orders = await Order.find(finalQuery)
    .populate('accountId', 'fullName email phone')
    .populate('customer', 'fullName email phone')
    .populate('items.productId', 'name sku image images price stock glazeColor')
    .populate('items.product', 'name sku image images price stock glazeColor')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(numLimit)
    .lean();

  // Chuẩn hóa dữ liệu trả về cho Frontend
  const normalizedOrders = orders.map((o) => {
    const rawStatus = (o.orderStatus || o.status || 'pending').toLowerCase();
    const customerInfo = o.accountId || o.customer || {
      fullName: o.customerName || o.shippingAddress?.recipientName || 'Khách vãng lai',
      phone: o.customerPhone || o.shippingAddress?.phone || '',
      email: o.customerEmail || '',
    };

    return {
      ...o,
      orderStatus: rawStatus,
      status: rawStatus,
      customer: customerInfo,
      accountId: customerInfo,
      paymentMethod: o.paymentMethod || 'COD',
      cancellationReason: o.cancellationReason || o.cancelReason || null,
      cancelReason: o.cancellationReason || o.cancelReason || null,
    };
  });

  return {
    orders: normalizedOrders,
    pagination: {
      total,
      page: numPage,
      limit: numLimit,
      totalPages: Math.ceil(total / numLimit) || 1,
    },
  };
}

/**
 * 3. Lấy chi tiết đơn hàng theo ID hoặc orderCode
 */
async function getOrderById(orderId) {
  let query = {};
  if (mongoose.Types.ObjectId.isValid(orderId)) {
    query = { _id: orderId };
  } else {
    query = { orderCode: orderId };
  }

  const order = await Order.findOne(query)
    .populate('accountId', 'fullName email phone addresses')
    .populate('customer', 'fullName email phone addresses')
    .populate('items.productId', 'name sku image images price stock glazeColor firingTemp')
    .populate('items.product', 'name sku image images price stock glazeColor firingTemp')
    .lean();

  if (!order) {
    return null;
  }

  const rawStatus = (order.orderStatus || order.status || 'pending').toLowerCase();
  const customerInfo = order.accountId || order.customer || {
    fullName: order.customerName || order.shippingAddress?.recipientName || 'Khách vãng lai',
    phone: order.customerPhone || order.shippingAddress?.phone || '',
    email: order.customerEmail || '',
  };

  return {
    ...order,
    orderStatus: rawStatus,
    status: rawStatus,
    customer: customerInfo,
    accountId: customerInfo,
    paymentMethod: order.paymentMethod || 'COD',
    cancellationReason: order.cancellationReason || order.cancelReason || null,
    cancelReason: order.cancellationReason || order.cancelReason || null,
  };
}

/**
 * 4. Chuyển đổi trạng thái đơn hàng (E1, E2, Concurrency lock)
 */
async function updateOrderStatus(orderId, nextStatusInput, adminUser) {
  if (!nextStatusInput || typeof nextStatusInput !== 'string') {
    throw { status: 400, message: 'Trạng thái chuyển đổi không hợp lệ' };
  }

  const nextStatus = nextStatusInput.trim().toLowerCase();

  // Tìm đơn hiện tại để đối chiếu trạng thái
  let orderQuery = {};
  if (mongoose.Types.ObjectId.isValid(orderId)) {
    orderQuery = { _id: orderId };
  } else {
    orderQuery = { orderCode: orderId };
  }

  const existingOrder = await Order.findOne(orderQuery);
  if (!existingOrder) {
    throw { status: 404, message: 'Không tìm thấy đơn hàng' };
  }

  const currentStatus = (existingOrder.orderStatus || existingOrder.status || 'pending').toLowerCase();

  // E2: Đơn đã COMPLETED không được chuyển ngược
  if (currentStatus === 'completed') {
    throw { status: 400, message: 'Trạng thái không thể chuyển đổi' };
  }

  // Đơn đã CANCELLED không được đổi trạng thái
  if (currentStatus === 'cancelled') {
    throw { status: 400, message: 'Đơn hàng đã bị hủy, không thể thay đổi trạng thái' };
  }

  // E1: Kiểm tra bước chuyển tiếp hợp lệ duy nhất:
  // PENDING -> CONFIRMED -> PROCESSING -> SHIPPING -> COMPLETED
  const expectedNextStatus = VALID_TRANSITIONS[currentStatus];
  if (!expectedNextStatus || expectedNextStatus !== nextStatus) {
    throw { status: 400, message: 'Trạng thái không thể chuyển đổi' };
  }

  // Chống 2 admin bấm cùng lúc (Optimistic Concurrency Control):
  // Dùng updateOne với điều kiện status hiện tại
  const statusHistoryEntry = {
    status: nextStatus,
    updatedAt: new Date(),
    note: `Chuyển trạng thái từ "${currentStatus}" sang "${nextStatus}"`,
    changedBy: adminUser?.fullName || 'Quản trị viên',
  };

  const updateResult = await Order.findOneAndUpdate(
    {
      _id: existingOrder._id,
      $or: [
        { orderStatus: currentStatus },
        { status: new RegExp(`^${currentStatus}$`, 'i') },
      ],
    },
    {
      $set: {
        orderStatus: nextStatus,
        status: nextStatus,
        updatedAt: new Date(),
      },
      $push: {
        statusHistory: statusHistoryEntry,
      },
    },
    { new: true }
  )
    .populate('accountId', 'fullName email phone')
    .populate('items.productId', 'name sku image images price stock')
    .lean();

  if (!updateResult) {
    // Có thể một admin khác vừa cập nhật trạng thái đơn hàng
    throw {
      status: 409,
      message: 'Trạng thái đơn hàng vừa được cập nhật bởi quản trị viên khác. Vui lòng tải lại trang.',
    };
  }

  return {
    ...updateResult,
    orderStatus: nextStatus,
    status: nextStatus,
  };
}

/**
 * 5. Hủy đơn hàng và hoàn trả tồn kho (E3, Transaction / Safe Rollback)
 */
async function cancelOrder(orderId, reasonInput, adminUser) {
  const reason = (reasonInput || '').trim();

  // E3: Bắt buộc có lý do hủy đơn (không được trống)
  if (!reason) {
    throw { status: 400, message: 'Lý do hủy đơn là bắt buộc và không được để trống' };
  }

  // Tìm đơn hàng hiện tại
  let orderQuery = {};
  if (mongoose.Types.ObjectId.isValid(orderId)) {
    orderQuery = { _id: orderId };
  } else {
    orderQuery = { orderCode: orderId };
  }

  const existingOrder = await Order.findOne(orderQuery);
  if (!existingOrder) {
    throw { status: 404, message: 'Không tìm thấy đơn hàng' };
  }

  const currentStatus = (existingOrder.orderStatus || existingOrder.status || 'pending').toLowerCase();

  // Chỉ hủy được đơn chưa COMPLETED và chưa CANCELLED
  if (currentStatus === 'completed') {
    throw { status: 400, message: 'Không thể hủy đơn hàng đã hoàn thành' };
  }
  if (currentStatus === 'cancelled') {
    throw { status: 400, message: 'Đơn hàng này đã ở trạng thái hủy trước đó' };
  }

  // Khóa đơn chống Race condition: update chỉ khi trạng thái chưa phải completed và chưa phải cancelled
  const statusHistoryEntry = {
    status: 'cancelled',
    updatedAt: new Date(),
    note: `Hủy đơn hàng: ${reason}`,
    changedBy: adminUser?.fullName || 'Quản trị viên',
  };

  const updatedOrder = await Order.findOneAndUpdate(
    {
      _id: existingOrder._id,
      orderStatus: { $nin: ['completed', 'cancelled'] },
      status: { $nin: ['completed', 'Completed', 'cancelled', 'Cancelled'] },
    },
    {
      $set: {
        orderStatus: 'cancelled',
        status: 'cancelled',
        cancellationReason: reason,
        cancelReason: reason,
        updatedAt: new Date(),
      },
      $push: {
        statusHistory: statusHistoryEntry,
      },
    },
    { new: true }
  ).lean();

  if (!updatedOrder) {
    throw {
      status: 409,
      message: 'Không thể hủy đơn hàng (Đơn có thể đã hoàn thành hoặc được cập nhật bởi quản trị viên khác)',
    };
  }

  // Hoàn tồn kho (E3): $inc stock +quantity cho từng item trong đơn
  // Nếu stock từ 0 lên > 0 thì đổi status sản phẩm từ inactive sang active
  const items = existingOrder.items || [];
  const inventoryLogs = [];

  for (const item of items) {
    const prodId = item.productId || item.product;
    const qty = Number(item.quantity) || 0;

    if (prodId && qty > 0) {
      try {
        // Tăng tồn kho trực tiếp
        const prod = await Product.findByIdAndUpdate(
          prodId,
          { $inc: { stock: qty } },
          { new: true }
        );

        if (prod) {
          // Nếu tồn kho mới > 0 và trạng thái đang inactive thì chuyển về active
          if (prod.stock > 0 && prod.status === 'inactive') {
            await Product.updateOne({ _id: prodId }, { $set: { status: 'active' } });
          }
          inventoryLogs.push({ productId: prodId, restoredQuantity: qty, newStock: prod.stock });
        }
      } catch (err) {
        console.error(`Lỗi khi hoàn kho cho sản phẩm ${prodId}:`, err);
      }
    }
  }

  return {
    ...updatedOrder,
    orderStatus: 'cancelled',
    status: 'cancelled',
    cancellationReason: reason,
    cancelReason: reason,
    inventoryRestored: inventoryLogs,
  };
}

/**
 * ====================================================
 * PHÂN HỆ KHÁCH HÀNG: ĐẶT HÀNG, THEO DÕI & HỦY ĐƠN (UC-C06, UC-C07)
 * ====================================================
 */

/**
 * 6. Khách hàng tạo đơn hàng từ giỏ hàng (UC-C06)
 * Kiểm tra E1 (thông tin giao hàng), E2 (giá đổi), E3 (thiếu kho),
 * Trừ tồn kho nguyên tử & Rollback nếu có lỗi
 */
async function createCustomerOrder(accountId, orderData) {
  const { shippingAddress, paymentMethod, note } = orderData || {};

  // E1: Kiểm tra thông tin giao hàng
  if (!shippingAddress || typeof shippingAddress !== 'object') {
    const err = new Error('Thông tin giao hàng là bắt buộc');
    err.status = 400;
    throw err;
  }

  const fieldErrors = {};
  if (!shippingAddress.recipientName || !shippingAddress.recipientName.trim()) {
    fieldErrors.recipientName = 'Họ và tên người nhận không được để trống';
  }

  const cleanPhone = (shippingAddress.phone || '').trim().replace(/[\s.\-()]/g, '');
  const vnPhoneRegex = /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/;
  if (!cleanPhone) {
    fieldErrors.phone = 'Số điện thoại không được để trống';
  } else if (!vnPhoneRegex.test(cleanPhone)) {
    fieldErrors.phone = 'Số điện thoại không đúng định dạng Việt Nam (10 chữ số, đầu 03, 05, 07, 08, 09)';
  }

  if (!shippingAddress.province || !shippingAddress.province.trim()) {
    fieldErrors.province = 'Tỉnh / Thành phố không được để trống';
  }
  if (!shippingAddress.ward || !shippingAddress.ward.trim()) {
    fieldErrors.ward = 'Phường / Xã không được để trống';
  }
  if (!shippingAddress.detail || !shippingAddress.detail.trim()) {
    fieldErrors.detail = 'Địa chỉ chi tiết không được để trống';
  }

  if (Object.keys(fieldErrors).length > 0) {
    const err = new Error('Thông tin giao hàng chưa đầy đủ hoặc không hợp lệ');
    err.status = 400;
    err.fieldErrors = fieldErrors;
    throw err;
  }

  // Lấy giỏ hàng của khách hàng
  const cart = await Cart.findOne({ accountId });
  if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
    const err = new Error('Giỏ hàng của bạn đang trống, không thể tạo đơn hàng');
    err.status = 400;
    throw err;
  }

  // Kiểm tra E2 (thay đổi giá) và E3 (thiếu tồn kho)
  const priceChanges = [];
  const stockShortages = [];
  let cartModified = false;

  for (const item of cart.items) {
    const product = await Product.findById(item.productId);
    if (!product || product.status !== 'active') {
      const err = new Error(`Sản phẩm "${item.productName || 'này'}" hiện không còn kinh doanh. Vui lòng cập nhật lại giỏ hàng.`);
      err.status = 400;
      throw err;
    }

    const effectivePrice = (item.customization && Number(item.customization.price) > 0)
      ? Number(item.customization.price)
      : product.price;

    // E2: Giá hiện tại khác giá trong giỏ
    if (effectivePrice !== item.unitPrice) {
      priceChanges.push({
        productId: product._id,
        productName: item.customization?.designName || product.name,
        oldPrice: item.unitPrice,
        newPrice: effectivePrice,
      });
      item.unitPrice = effectivePrice;
      cartModified = true;
    }

    // E3: Tồn kho không đủ
    if (product.stock < item.quantity) {
      stockShortages.push({
        productId: product._id,
        productName: product.name,
        requestedQuantity: item.quantity,
        availableStock: product.stock,
      });
    }
  }

  if (cartModified) {
    await cart.save();
  }

  if (priceChanges.length > 0) {
    const err = new Error('Giá một số sản phẩm đã được xưởng cập nhật. Giỏ hàng đã đồng bộ đơn giá mới, quý khách vui lòng xác nhận lại tổng tiền.');
    err.status = 409;
    err.priceChanges = priceChanges;
    throw err;
  }

  if (stockShortages.length > 0) {
    const names = stockShortages.map(s => `"${s.productName}" (chỉ còn ${s.availableStock})`).join(', ');
    const err = new Error(`Số lượng sản phẩm trong kho không đủ để đặt hàng: ${names}. Quý khách vui lòng điều chỉnh số lượng trong giỏ hàng.`);
    err.status = 400;
    err.stockShortages = stockShortages;
    throw err;
  }

  // Trừ tồn kho NGUYÊN TỬ (Atomic decrement) & Rollback nếu có lỗi
  const decrementedItems = [];
  for (const item of cart.items) {
    const decResult = await Product.updateOne(
      { _id: item.productId, stock: { $gte: item.quantity } },
      { $inc: { stock: -item.quantity } }
    );

    if (decResult.modifiedCount === 0) {
      // Rollback các sản phẩm đã trừ trước đó
      for (const dec of decrementedItems) {
        await Product.updateOne({ _id: dec.productId }, { $inc: { stock: dec.quantity } });
      }
      const p = await Product.findById(item.productId);
      const err = new Error(`Sản phẩm "${item.productName || (p && p.name)}" vừa hết hàng hoặc không đủ tồn kho để đáp ứng đơn hàng.`);
      err.status = 400;
      throw err;
    }

    decrementedItems.push(item);

    // Cập nhật trạng thái sản phẩm nếu tồn kho về 0
    const updatedProd = await Product.findById(item.productId);
    if (updatedProd && updatedProd.stock <= 0) {
      await Product.updateOne({ _id: item.productId, stock: 0 }, { $set: { status: 'inactive' } });
    }
  }

  // Tính toán tổng tiền
  let subtotal = 0;
  const orderItems = cart.items.map(i => {
    const lineTotal = i.unitPrice * i.quantity;
    subtotal += lineTotal;
    return {
      productId: i.productId,
      product: i.productId,
      productName: i.productName,
      unitPrice: i.unitPrice,
      quantity: i.quantity,
      customization: i.customization || null,
      designSnapshot: i.customization || null,
    };
  });

  const shippingFee = subtotal >= 1000000 ? 0 : 30000;
  const totalAmount = subtotal + shippingFee;
  const orderCode = 'DH' + Date.now();

  const newOrder = new Order({
    orderCode,
    accountId,
    customer: accountId,
    items: orderItems,
    subtotal,
    shippingFee,
    discount: 0,
    totalAmount,
    shippingAddress: {
      recipientName: shippingAddress.recipientName.trim(),
      phone: cleanPhone,
      province: shippingAddress.province.trim(),
      ward: shippingAddress.ward.trim(),
      detail: shippingAddress.detail.trim(),
    },
    note: (note || '').trim(),
    paymentMethod: paymentMethod || 'COD',
    paymentStatus: 'pending',
    orderStatus: 'pending',
    statusHistory: [
      {
        status: 'pending',
        updatedAt: new Date(),
        note: 'Khách hàng đặt hàng thành công từ giỏ hàng',
        changedBy: 'Khách hàng',
      },
    ],
  });

  await newOrder.save();

  // Tạo bản ghi Payment tương ứng
  await Payment.create({
    orderId: newOrder._id,
    accountId,
    method: paymentMethod || 'COD',
    amount: totalAmount,
    status: 'pending',
  });

  // Xóa các item đã đặt khỏi giỏ hàng
  cart.items = [];
  await cart.save();

  return newOrder;
}

/**
 * 7. Khách hàng xem danh sách đơn hàng của mình (UC-C07)
 */
async function getMyOrders(accountId, query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.max(1, Math.min(50, parseInt(query.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const filter = {
    $or: [{ accountId }, { customer: accountId }],
  };

  if (query.status && query.status !== 'all') {
    filter.orderStatus = query.status.toLowerCase().trim();
  }

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate('items.productId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Order.countDocuments(filter),
  ]);

  return {
    orders,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * 8. Khách hàng xem chi tiết đơn hàng của mình
 */
async function getMyOrderById(accountId, orderId) {
  const filter = {
    _id: orderId,
    $or: [{ accountId }, { customer: accountId }],
  };

  const order = await Order.findOne(filter).populate('items.productId').lean();
  if (!order) {
    const err = new Error('Không tìm thấy thông tin đơn hàng hoặc bạn không có quyền xem đơn hàng này');
    err.status = 404;
    throw err;
  }

  const payment = await Payment.findOne({ orderId: order._id }).lean();

  return {
    ...order,
    payment: payment || null,
  };
}

/**
 * 9. Khách hàng hủy đơn hàng (Chỉ cho phép khi đơn ở trạng thái PENDING)
 * Hoàn lại tồn kho và khôi phục trạng thái ACTIVE nếu stock > 0
 */
async function cancelMyOrder(accountId, orderId, reason) {
  const filter = {
    _id: orderId,
    $or: [{ accountId }, { customer: accountId }],
  };

  const order = await Order.findOne(filter);
  if (!order) {
    const err = new Error('Không tìm thấy đơn hàng cần hủy');
    err.status = 404;
    throw err;
  }

  // E1: Đơn đã sang trạng thái khác PENDING -> từ chối
  if (order.orderStatus !== 'pending') {
    const err = new Error('Đơn hàng không thể hủy tại thời điểm này (Chỉ được hủy khi đơn ở trạng thái Chờ xử lý)');
    err.status = 400;
    err.currentStatus = order.orderStatus;
    throw err;
  }

  const cancelReasonText = (reason || 'Khách hàng tự hủy').trim();
  order.orderStatus = 'cancelled';
  order.cancelReason = cancelReasonText;
  order.cancellationReason = cancelReasonText;
  order.statusHistory.push({
    status: 'cancelled',
    updatedAt: new Date(),
    note: cancelReasonText,
    changedBy: 'Khách hàng',
  });

  await order.save();

  // Hoàn lại tồn kho cho từng sản phẩm
  for (const item of order.items) {
    const prodId = item.productId || item.product;
    const qty = Number(item.quantity) || 1;
    if (prodId) {
      await Product.updateOne({ _id: prodId }, { $inc: { stock: qty } });
      const prod = await Product.findById(prodId);
      if (prod && prod.stock > 0 && prod.status === 'inactive') {
        await Product.updateOne({ _id: prodId }, { $set: { status: 'active' } });
      }
    }
  }

  return order;
}

module.exports = {
  getOrderStats,
  getOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
  VALID_TRANSITIONS,
  // Phân hệ khách hàng
  createCustomerOrder,
  getMyOrders,
  getMyOrderById,
  cancelMyOrder,
};

