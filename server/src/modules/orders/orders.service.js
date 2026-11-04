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
 * Kiểm tra xem đơn hàng đã từng được thanh toán hay chưa (được xác nhận thu tiền)
 * Bao gồm:
 * - paymentStatus: 'paid', 'partially_refunded', 'refunded' (đã thu tiền rồi hoàn lại)
 * - Có mốc paymentConfirmedAt
 * - Có lịch sử paymentHistory chuyển sang trạng thái đã thanh toán / hoàn tiền
 */
function wasOrderPaid(o) {
  if (!o) return false;
  const payment = (o.paymentStatus || '').toLowerCase();
  if (['paid', 'partially_refunded', 'refunded'].includes(payment)) {
    return true;
  }
  if (o.paymentConfirmedAt) {
    return true;
  }
  if (Array.isArray(o.paymentHistory) && o.paymentHistory.some((h) => {
    const to = (h.toStatus || '').toLowerCase();
    const from = (h.fromStatus || '').toLowerCase();
    return to === 'paid' || to === 'partially_refunded' || to === 'refunded' || from === 'paid';
  })) {
    return true;
  }
  return false;
}

/**
 * Hàm tính Doanh Thu Thuần (Net Revenue) duy nhất dùng chung cho toàn hệ thống:
 * Tiêu chí chuẩn mực kế toán:
 * 1. Tiền thu được (Doanh thu gộp): CHỈ tính khi đơn hàng đã được xác nhận thanh toán (wasOrderPaid: paid / partially_refunded / refunded).
 * 2. Giảm trừ do Hàng hủy: CHỈ ghi nhận khi đơn hàng ĐÃ THANH TOÁN mà bị hủy (khoản tiền đã thu phải chuyển sang hàng hủy để giảm trừ).
 * 3. Đơn chưa thanh toán mà hủy: TUYỆT ĐỐI KHÔNG tính vào giảm trừ doanh thu (vì chưa từng được tính vào doanh thu ban đầu).
 * 4. Giảm trừ do Hàng hoàn trả / Đổi trả: Ghi nhận khi khách nhận hàng muốn đổi/trả và yêu cầu được admin duyệt (returnStatus === 'approved').
 * Doanh thu thuần = Tiền thu được - Giảm trừ hàng hủy (đã thanh toán) - Giảm trừ hàng hoàn trả
 */
async function calculateNetRevenue() {
  const allOrders = await Order.find()
    .select('totalAmount refundedAmount returnStatus paymentStatus orderStatus status paymentConfirmedAt paymentHistory')
    .lean();

  let totalCollected = 0;
  let totalRefunded = 0;
  let totalCancelled = 0;

  allOrders.forEach((o) => {
    const rawStatus = (o.orderStatus || o.status || 'pending').toLowerCase();
    const total = Number(o.totalAmount || 0);
    let refunded = Number(o.refundedAmount || 0);

    const isPaid = wasOrderPaid(o);

    // Tiêu chí 1: Phải khi admin / hệ thống xác nhận ĐÃ THANH TOÁN mới tính vào tiền thu được
    if (isPaid) {
      totalCollected += total;

      if (rawStatus === 'cancelled') {
        // Tiêu chí 2: Đã thanh toán nhưng hủy đơn -> Chuyển sang hàng hủy giảm trừ doanh thu
        totalCancelled += total;
      } else if (o.returnStatus === 'approved' || refunded > 0 || (o.paymentStatus || '').toLowerCase() === 'partially_refunded') {
        // Tiêu chí 4: Khách nhận hàng muốn đổi trả nếu ta xác nhận approved -> Kê khai vô hàng hoàn trả
        if (!refunded || refunded <= 0) refunded = total;
        totalRefunded += Math.min(total, refunded);
      }
    }
    // Tiêu chí 3: Nếu khách hàng đặt nhưng chưa thanh toán đã hủy -> KHÔNG ghi nhận vào các khoản giảm trừ doanh thu
  });

  const netRevenue = Math.max(0, totalCollected - totalRefunded - totalCancelled);
  return netRevenue;
}

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
  let awaitingPaymentVerification = 0;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  let todayOrders = 0;

  allOrders.forEach((o) => {
    const rawStatus = (o.orderStatus || o.status || 'pending').toLowerCase();

    if (rawStatus === 'pending') pending++;
    else if (rawStatus === 'confirmed') confirmed++;
    else if (rawStatus === 'processing') processing++;
    else if (rawStatus === 'shipping') shipping++;
    else if (rawStatus === 'completed') completed++;
    else if (rawStatus === 'cancelled') cancelled++;

    if (o.paymentStatus === 'awaiting_verification') {
      awaitingPaymentVerification++;
    }

    const createdAt = new Date(o.createdAt);
    if (createdAt >= todayStart) {
      todayOrders++;
    }
  });

  const totalRevenue = await calculateNetRevenue();

  // Đếm số đơn hợp lệ đã thanh toán (đóng góp vào doanh thu thuần)
  const paidOrdersCount = allOrders.filter((o) => {
    const rawStatus = (o.orderStatus || o.status || 'pending').toLowerCase();
    const isCancelled = rawStatus === 'cancelled';
    const isFullyReturned = o.returnStatus === 'approved' && (Number(o.refundedAmount || 0) >= Number(o.totalAmount || 0));
    return wasOrderPaid(o) && !isCancelled && !isFullyReturned;
  }).length;

  return {
    totalOrders: allOrders.length,
    pending,
    confirmed,
    processing,
    shipping,
    completed,
    cancelled,
    awaitingPaymentVerification,
    todayOrders,
    totalRevenue,
    paidOrdersCount,
  };
}

/**
 * 2. Lấy danh sách đơn hàng có tìm kiếm, lọc trạng thái và phân trang
 */
async function getOrders({ page = 1, limit = 10, status = 'all', keyword = '', paymentStatus = 'all' }) {
  const numPage = Math.max(1, Number(page) || 1);
  const numLimit = Math.max(1, Number(limit) || 10);
  const skip = (numPage - 1) * numLimit;

  const queryConditions = [];

  // Lọc theo trạng thái đơn hàng
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

  // Lọc theo trạng thái thanh toán (Lỗi 3, Quy tắc 5)
  if (paymentStatus && paymentStatus !== 'all') {
    const cleanPaymentStatus = paymentStatus.trim().toLowerCase();
    queryConditions.push({
      paymentStatus: cleanPaymentStatus,
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
    .populate('paymentConfirmedBy', 'fullName email phone')
    .populate('returnRequestId')
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
      paymentStatus: (o.paymentStatus || 'pending').toLowerCase(),
      returnStatus: o.returnStatus || 'none',
      refundedAmount: Number(o.refundedAmount || 0),
      refundedAt: o.refundedAt || null,
      returnRequestId: o.returnRequestId || null,
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
    .populate('paymentConfirmedBy', 'fullName email phone')
    .populate('returnRequestId')
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
    paymentStatus: (order.paymentStatus || 'pending').toLowerCase(),
    returnStatus: order.returnStatus || 'none',
    refundedAmount: Number(order.refundedAmount || 0),
    refundedAt: order.refundedAt || null,
    returnRequestId: order.returnRequestId || null,
    paymentConfirmedAt: order.paymentConfirmedAt || null,
    paymentConfirmedBy: order.paymentConfirmedBy || null,
    paymentNote: order.paymentNote || '',
    paymentHistory: order.paymentHistory || [],
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

  // RÀNG BUỘC CHỐT (Lỗi 3, Quy tắc 4):
  // backend CHỈ cho chuyển SHIPPING -> COMPLETED khi paymentStatus = PAID.
  if (nextStatus === 'completed') {
    const isPaid = (existingOrder.paymentStatus || '').toLowerCase() === 'paid';
    if (!isPaid) {
      throw {
        status: 400,
        message: 'Đơn hàng chưa được xác nhận thanh toán. Vui lòng xác nhận thanh toán trước khi hoàn tất đơn hàng.',
      };
    }
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
    .populate('paymentConfirmedBy', 'fullName email phone')
    .populate('returnRequestId')
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

  const isPaid = (existingOrder.paymentStatus || '').toLowerCase() === 'paid';
  const newPaymentStatus = isPaid ? 'refunded' : existingOrder.paymentStatus;

  // Khóa đơn chống Race condition: update chỉ khi trạng thái chưa phải completed và chưa phải cancelled
  const statusHistoryEntry = {
    status: 'cancelled',
    updatedAt: new Date(),
    note: `Hủy đơn hàng: ${reason}`,
    changedBy: adminUser?.fullName || 'Quản trị viên',
  };

  const updateFields = {
    orderStatus: 'cancelled',
    status: 'cancelled',
    cancellationReason: reason,
    cancelReason: reason,
    paymentStatus: newPaymentStatus,
    updatedAt: new Date(),
  };

  const pushOperations = {
    statusHistory: statusHistoryEntry,
  };

  if (isPaid) {
    pushOperations.paymentHistory = {
      fromStatus: 'paid',
      toStatus: 'refunded',
      changedBy: adminUser?.fullName || 'Quản trị viên',
      note: `Hủy đơn khi đã thanh toán, ghi nhận cần hoàn tiền: ${reason}`,
      changedAt: new Date(),
    };
  }

  const updatedOrder = await Order.findOneAndUpdate(
    {
      _id: existingOrder._id,
      orderStatus: { $nin: ['completed', 'cancelled'] },
      status: { $nin: ['completed', 'Completed', 'cancelled', 'Cancelled'] },
    },
    {
      $set: updateFields,
      $push: pushOperations,
    },
    { new: true }
  ).lean();

  if (!updatedOrder) {
    throw {
      status: 409,
      message: 'Không thể hủy đơn hàng (Đơn có thể đã hoàn thành hoặc được cập nhật bởi quản trị viên khác)',
    };
  }

  if (isPaid) {
    await Payment.updateMany(
      { orderId: existingOrder._id },
      { $set: { status: 'refunded' } }
    );
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
    const isCustom = Boolean(item.customization || (product && product.isCustomizable));

    if (!product || (!isCustom && product.status !== 'active')) {
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

    // E3: Tồn kho không đủ (Chỉ kiểm tra hàng có sẵn, hàng custom khách đặt xưởng mới chế tác nên không giới hạn tồn kho)
    if (!isCustom && product.stock < item.quantity) {
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
  // Lưu ý: Sản phẩm custom (khách đặt xưởng mới làm) không trừ stock kho thành phẩm và không bao giờ chuyển status sang 'inactive'
  const decrementedItems = [];
  for (const item of cart.items) {
    const product = await Product.findById(item.productId);
    const isCustom = Boolean(item.customization || (product && product.isCustomizable));

    if (isCustom) {
      // Hàng custom chế tác theo yêu cầu, luôn sẵn sàng sản xuất
      continue;
    }

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

    // Cập nhật trạng thái sản phẩm có sẵn nếu tồn kho về 0
    const updatedProd = await Product.findById(item.productId);
    if (updatedProd && updatedProd.stock <= 0 && !updatedProd.isCustomizable) {
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

  // Tự động lưu địa chỉ được nhập vào danh mục địa chỉ của tài khoản khách hàng
  if (accountId) {
    try {
      const account = await Account.findById(accountId);
      if (account) {
        if (!Array.isArray(account.addresses)) {
          account.addresses = [];
        }

        const newAddr = {
          recipientName: shippingAddress.recipientName.trim(),
          phone: cleanPhone,
          province: shippingAddress.province.trim(),
          ward: shippingAddress.ward.trim(),
          detail: shippingAddress.detail.trim(),
          isDefault: true,
        };

        // Bỏ cờ mặc định ở các địa chỉ trước
        account.addresses.forEach(a => {
          a.isDefault = false;
        });

        // Kiểm tra xem địa chỉ này đã có trong danh bạ chưa
        const existingIdx = account.addresses.findIndex(a =>
          (a.detail || '').trim().toLowerCase() === newAddr.detail.toLowerCase() &&
          (a.ward || '').trim().toLowerCase() === newAddr.ward.toLowerCase() &&
          (a.province || '').trim().toLowerCase() === newAddr.province.toLowerCase()
        );

        if (existingIdx > -1) {
          account.addresses[existingIdx].recipientName = newAddr.recipientName;
          account.addresses[existingIdx].phone = newAddr.phone;
          account.addresses[existingIdx].isDefault = true;
          const matched = account.addresses.splice(existingIdx, 1)[0];
          account.addresses.unshift(matched);
        } else {
          account.addresses.unshift(newAddr);
        }

        await account.save();
      }
    } catch (saveAddrErr) {
      console.error('Lỗi tự động lưu địa chỉ vào tài khoản:', saveAddrErr);
    }
  }

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
      .populate('returnRequestId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Order.countDocuments(filter),
  ]);

  const normalized = orders.map((o) => ({
    ...o,
    paymentStatus: (o.paymentStatus || 'pending').toLowerCase(),
    returnStatus: o.returnStatus || 'none',
    refundedAmount: Number(o.refundedAmount || 0),
  }));

  return {
    orders: normalized,
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

  const order = await Order.findOne(filter)
    .populate('items.productId')
    .populate('returnRequestId')
    .lean();
  if (!order) {
    const err = new Error('Không tìm thấy thông tin đơn hàng hoặc bạn không có quyền xem đơn hàng này');
    err.status = 404;
    throw err;
  }

  const payment = await Payment.findOne({ orderId: order._id }).lean();

  return {
    ...order,
    paymentStatus: (order.paymentStatus || 'pending').toLowerCase(),
    returnStatus: order.returnStatus || 'none',
    refundedAmount: Number(order.refundedAmount || 0),
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

  const isPaid = (order.paymentStatus || '').toLowerCase() === 'paid';
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

  if (isPaid) {
    order.paymentStatus = 'refunded';
    order.paymentHistory.push({
      fromStatus: 'paid',
      toStatus: 'refunded',
      changedBy: 'Khách hàng',
      note: `Khách tự hủy đơn khi đã thanh toán, ghi nhận chờ hoàn tiền: ${cancelReasonText}`,
      changedAt: new Date(),
    });
    await Payment.updateMany({ orderId: order._id }, { $set: { status: 'refunded' } });
  }

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

/**
 * 10. Khách hàng thông báo đã thanh toán (MoMo / Chuyển khoản VietQR)
 * Chuyển UNPAID (pending) -> AWAITING_VERIFICATION (Lỗi 3, Quy tắc 1)
 */
async function notifyCustomerPaid(accountId, orderId, { transactionCode, note } = {}) {
  const filter = {
    _id: orderId,
    $or: [{ accountId }, { customer: accountId }],
  };

  const order = await Order.findOne(filter);
  if (!order) {
    const err = new Error('Không tìm thấy đơn hàng');
    err.status = 404;
    throw err;
  }

  const currentPaymentStatus = (order.paymentStatus || 'pending').toLowerCase();
  if (currentPaymentStatus === 'paid') {
    const err = new Error('Đơn hàng này đã được xác nhận thanh toán trước đó');
    err.status = 400;
    throw err;
  }

  const cleanTransCode = (transactionCode || '').trim();
  const cleanNote = (note || '').trim();
  const detailNote = [
    cleanTransCode ? `Mã giao dịch: ${cleanTransCode}` : '',
    cleanNote ? `Ghi chú: ${cleanNote}` : '',
  ]
    .filter(Boolean)
    .join(' | ') || 'Khách hàng báo đã hoàn tất thanh toán chuyển khoản/MoMo';

  order.paymentStatus = 'awaiting_verification';
  order.paymentNote = detailNote;
  order.paymentHistory.push({
    fromStatus: currentPaymentStatus,
    toStatus: 'awaiting_verification',
    changedBy: 'Khách hàng',
    note: detailNote,
    changedAt: new Date(),
  });

  await order.save();

  // Đồng bộ Payment model
  await Payment.updateMany(
    { orderId: order._id },
    {
      $set: {
        transactionCode: cleanTransCode || null,
        status: 'awaiting_verification',
      },
    }
  );

  return order;
}

/**
 * 11. Admin xác nhận hoặc thay đổi trạng thái thanh toán (Lỗi 3, Quy tắc 2 & 3)
 * Admin có thể xác nhận PAID, hoặc chuyển về UNPAID (pending) nếu chưa nhận được tiền
 */
async function confirmPayment(orderId, { status, note, adminUser }) {
  let orderQuery = {};
  if (mongoose.Types.ObjectId.isValid(orderId)) {
    orderQuery = { _id: orderId };
  } else {
    orderQuery = { orderCode: orderId };
  }

  const order = await Order.findOne(orderQuery);
  if (!order) {
    const err = new Error('Không tìm thấy đơn hàng');
    err.status = 404;
    throw err;
  }

  const validStatuses = ['pending', 'awaiting_verification', 'paid', 'failed', 'refunded', 'partially_refunded'];
  const cleanStatus = (status || '').toLowerCase().trim();
  if (!validStatuses.includes(cleanStatus)) {
    const err = new Error('Trạng thái thanh toán không hợp lệ');
    err.status = 400;
    throw err;
  }

  const oldStatus = order.paymentStatus || 'pending';
  const adminName = adminUser?.fullName || adminUser?.name || 'Quản trị viên';
  const adminId = adminUser?._id || null;

  order.paymentStatus = cleanStatus;
  if (cleanStatus === 'paid') {
    order.paymentConfirmedAt = new Date();
    if (adminId && mongoose.Types.ObjectId.isValid(adminId)) {
      order.paymentConfirmedBy = adminId;
    }
  }

  if (note && note.trim()) {
    order.paymentNote = note.trim();
  }

  const actionNote = note || (cleanStatus === 'paid' ? 'Admin xác nhận thanh toán thành công' : `Admin chuyển trạng thái thanh toán sang "${cleanStatus}"`);

  order.paymentHistory.push({
    fromStatus: oldStatus,
    toStatus: cleanStatus,
    changedBy: adminName,
    note: actionNote,
    changedAt: new Date(),
  });

  await order.save();

  // Đồng bộ Payment model
  await Payment.updateMany(
    { orderId: order._id },
    {
      $set: {
        status: cleanStatus === 'paid' ? 'paid' : (cleanStatus === 'awaiting_verification' ? 'pending' : cleanStatus),
        paidAt: cleanStatus === 'paid' ? new Date() : null,
      },
    }
  );

  return order;
}

/**
 * 12. Hàm dùng chung: Đánh dấu đơn hàng Đã Hoàn Trả khi Admin duyệt đổi/trả (Lỗi 4)
 * Gọi từ module returns của Trâm
 */
async function markOrderReturned(orderId, { amount, returnRequestId, note, adminUser } = {}) {
  let orderQuery = {};
  if (mongoose.Types.ObjectId.isValid(orderId)) {
    orderQuery = { _id: orderId };
  } else {
    orderQuery = { orderCode: orderId };
  }

  const order = await Order.findOne(orderQuery);
  if (!order) {
    const err = new Error('Không tìm thấy đơn hàng liên kết để xử lý hoàn tiền');
    err.status = 404;
    throw err;
  }

  const rawStatus = (order.orderStatus || order.status || '').toLowerCase();
  if (rawStatus !== 'completed') {
    const err = new Error('Chỉ có thể duyệt hoàn tiền / đổi trả cho đơn hàng đã hoàn tất (Completed)');
    err.status = 400;
    throw err;
  }

  if (order.refundedAmount && order.refundedAmount >= order.totalAmount) {
    const err = new Error('Đơn hàng này đã được hoàn tiền đầy đủ trước đó (chặn hoàn trùng)');
    err.status = 400;
    throw err;
  }

  const refundValue = Math.min(order.totalAmount, Number(amount || order.totalAmount) || order.totalAmount);
  const newRefundedTotal = Math.min(order.totalAmount, (order.refundedAmount || 0) + refundValue);
  const isFullyRefunded = newRefundedTotal >= order.totalAmount;
  const newPaymentStatus = isFullyRefunded ? 'refunded' : 'partially_refunded';

  const adminName = adminUser?.fullName || adminUser?.name || 'Quản trị viên';

  order.returnStatus = 'approved';
  order.refundedAmount = newRefundedTotal;
  order.refundedAt = new Date();
  if (returnRequestId && mongoose.Types.ObjectId.isValid(returnRequestId)) {
    order.returnRequestId = returnRequestId;
  }

  const oldPaymentStatus = order.paymentStatus || 'paid';
  order.paymentStatus = newPaymentStatus;

  order.statusHistory.push({
    status: order.orderStatus,
    updatedAt: new Date(),
    note: `Duyệt đổi/trả hàng. Hoàn tiền: ${refundValue.toLocaleString('vi-VN')}₫. ${note || ''}`.trim(),
    changedBy: adminName,
  });

  order.paymentHistory.push({
    fromStatus: oldPaymentStatus,
    toStatus: newPaymentStatus,
    changedBy: adminName,
    note: `Hoàn tiền đổi trả: ${refundValue.toLocaleString('vi-VN')}₫. Tổng đã hoàn: ${newRefundedTotal.toLocaleString('vi-VN')}₫`,
    changedAt: new Date(),
  });

  await order.save();

  // Đồng bộ Payment model
  await Payment.updateMany(
    { orderId: order._id },
    {
      $set: {
        status: newPaymentStatus,
      },
    }
  );

  return order;
}

module.exports = {
  wasOrderPaid,
  calculateNetRevenue,
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
  notifyCustomerPaid,
  // Phân hệ thanh toán & đổi trả liên kết
  confirmPayment,
  markOrderReturned,
};

