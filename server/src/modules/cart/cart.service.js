const mongoose = require('mongoose');
const Cart = require('../../models/Cart');
const Product = require('../../models/Product');

/**
 * So sánh 2 customization xem có trùng khớp hoàn toàn không
 */
function areCustomizationsEqual(c1, c2) {
  if (!c1 && !c2) return true;
  if (!c1 || !c2) return false;
  
  const glaze1 = (c1.glazeColor || c1.men || '').toString().trim().toLowerCase();
  const glaze2 = (c2.glazeColor || c2.men || '').toString().trim().toLowerCase();
  
  const pattern1 = (c1.pattern || c1.hoaVan || '').toString().trim().toLowerCase();
  const pattern2 = (c2.pattern || c2.hoaVan || '').toString().trim().toLowerCase();
  
  const text1 = (c1.engravingText || c1.chuKhac || '').toString().trim();
  const text2 = (c2.engravingText || c2.chuKhac || '').toString().trim();

  return glaze1 === glaze2 && pattern1 === pattern2 && text1 === text2;
}

/**
 * Kiểm tra tính hợp lệ của customization (engravingText <= 20 ký tự)
 */
function validateCustomization(customization) {
  if (!customization) return null;
  const clean = { ...customization };
  const text = clean.engravingText || clean.chuKhac || '';
  if (typeof text === 'string' && text.length > 20) {
    const err = new Error('Nội dung khắc chữ tối đa 20 ký tự');
    err.statusCode = 400;
    throw err;
  }
  return clean;
}

/**
 * Thêm sản phẩm vào giỏ hàng
 * Chữ ký hàm bắt buộc: addToCart(productId, quantity, customization)
 * Hỗ trợ accountId làm tham số thứ 4 hoặc truyền object payload
 */
async function addToCart(productIdOrPayload, maybeQuantity = 1, maybeCustomization = null, maybeAccountId = null) {
  let productId = productIdOrPayload;
  let quantity = Number(maybeQuantity) || 1;
  let customization = maybeCustomization;
  let accountId = maybeAccountId;

  // Hỗ trợ truyền object payload nếu có
  if (typeof productIdOrPayload === 'object' && productIdOrPayload !== null && !mongoose.Types.ObjectId.isValid(productIdOrPayload)) {
    productId = productIdOrPayload.productId;
    quantity = Number(productIdOrPayload.quantity) || 1;
    customization = productIdOrPayload.customization || null;
    accountId = productIdOrPayload.accountId || maybeAccountId;
  }

  if (!productId) {
    const err = new Error('Mã sản phẩm không hợp lệ');
    err.statusCode = 400;
    throw err;
  }

  if (quantity < 1) {
    const err = new Error('Số lượng sản phẩm phải từ 1 trở lên');
    err.statusCode = 400;
    throw err;
  }

  // Xác thực nội dung khắc chữ
  customization = validateCustomization(customization);

  // Kiểm tra sản phẩm trong database
  const product = await Product.findById(productId);
  if (!product) {
    const err = new Error('Sản phẩm không tồn tại');
    err.statusCode = 404;
    throw err;
  }

  if (product.status !== 'active') {
    const err = new Error('Sản phẩm hiện đang ngừng kinh doanh');
    err.statusCode = 400;
    throw err;
  }

  if (product.stock <= 0) {
    const err = new Error('Số lượng sản phẩm trong kho không đủ (Sản phẩm đã hết hàng)');
    err.statusCode = 400;
    throw err;
  }

  if (!accountId) {
    const err = new Error('Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng');
    err.statusCode = 401;
    throw err;
  }

  let cart = await Cart.findOne({ accountId });
  if (!cart) {
    cart = new Cart({ accountId, items: [] });
  }

  // Tìm xem đã có dòng nào trùng cả productId và customization chưa
  const existingItemIndex = cart.items.findIndex(item => {
    const sameProduct = item.productId.toString() === product._id.toString();
    const sameCustom = areCustomizationsEqual(item.customization, customization);
    return sameProduct && sameCustom;
  });

  const effectivePrice = (customization && Number(customization.price) > 0)
    ? Number(customization.price)
    : product.price;
  const effectiveName = (customization && customization.designName)
    ? customization.designName
    : product.name;

  if (existingItemIndex > -1) {
    const currentItem = cart.items[existingItemIndex];
    const newQuantity = currentItem.quantity + quantity;
    if (newQuantity > product.stock) {
      const err = new Error(`Số lượng sản phẩm trong kho không đủ (Hiện còn ${product.stock} sản phẩm)`);
      err.statusCode = 400;
      throw err;
    }
    currentItem.quantity = newQuantity;
    currentItem.unitPrice = effectivePrice;
    currentItem.productName = effectiveName;
    if (customization) {
      currentItem.customization = customization;
    }
  } else {
    if (quantity > product.stock) {
      const err = new Error(`Số lượng sản phẩm trong kho không đủ (Hiện còn ${product.stock} sản phẩm)`);
      err.statusCode = 400;
      throw err;
    }
    cart.items.push({
      productId: product._id,
      productName: effectiveName,
      unitPrice: effectivePrice,
      quantity,
      customization,
    });
  }

  await cart.save();
  return getCart(accountId);
}

/**
 * Lấy giỏ hàng chi tiết kèm giá hiện tại, tồn kho và cờ hợp lệ
 */
async function getCart(accountId) {
  let cart = await Cart.findOne({ accountId });
  if (!cart) {
    cart = await Cart.create({ accountId, items: [] });
  }

  const enrichedItems = [];
  let subtotal = 0;
  let totalCount = 0;
  let hasInvalidItems = false;
  let invalidMessage = '';

  let cartNeedsSave = false;
  for (const item of cart.items) {
    const product = await Product.findById(item.productId);
    
    const isProductActive = Boolean(product && product.status === 'active');
    const currentStock = product ? product.stock : 0;
    const currentPrice = (item.customization && Number(item.customization.price) > 0)
      ? Number(item.customization.price)
      : (product ? product.price : item.unitPrice);

    if (item.customization && Number(item.customization.price) > 0) {
      if (item.unitPrice !== currentPrice) {
        item.unitPrice = currentPrice;
        cartNeedsSave = true;
      }
      if (item.customization.designName && item.productName !== item.customization.designName) {
        item.productName = item.customization.designName;
        cartNeedsSave = true;
      }
    }
    
    // Kiểm tra cờ available
    let isAvailable = true;
    let itemStatus = 'AVAILABLE';
    let itemMessage = '';

    if (!product || !isProductActive) {
      isAvailable = false;
      itemStatus = 'DISCONTINUED';
      itemMessage = 'Sản phẩm đã ngừng kinh doanh';
      hasInvalidItems = true;
    } else if (currentStock <= 0) {
      isAvailable = false;
      itemStatus = 'OUT_OF_STOCK';
      itemMessage = 'Sản phẩm đã hết hàng trong kho';
      hasInvalidItems = true;
    } else if (item.quantity > currentStock) {
      isAvailable = false;
      itemStatus = 'STOCK_EXCEEDED';
      itemMessage = `Tồn kho không đủ (chỉ còn ${currentStock} sản phẩm)`;
      hasInvalidItems = true;
    }

    const itemTotalPrice = currentPrice * item.quantity;
    if (isAvailable) {
      subtotal += itemTotalPrice;
      totalCount += item.quantity;
    }

    const displayName = (item.customization && item.customization.designName)
      ? item.customization.designName
      : (product ? product.name : (item.productName || 'Tác phẩm gốm'));

    const displayImage = (item.customization && (item.customization.previewImage || item.customization.blankImage))
      || (product && product.image)
      || (product && product.images && product.images[0])
      || '';

    enrichedItems.push({
      _id: item._id,
      productId: item.productId,
      name: displayName,
      image: displayImage,
      currentPrice,
      storedUnitPrice: item.unitPrice,
      priceChanged: false,
      quantity: item.quantity,
      stock: currentStock,
      isAvailable,
      status: itemStatus,
      statusMessage: itemMessage,
      customization: item.customization || null,
      totalPrice: itemTotalPrice,
    });
  }

  if (cartNeedsSave) {
    try {
      cart.markModified('items');
      await cart.save();
    } catch (e) {
      console.warn('Lỗi tự động đồng bộ giá giỏ hàng:', e.message);
    }
  }

  if (hasInvalidItems) {
    invalidMessage = 'Trong giỏ hàng có sản phẩm đã hết hàng hoặc thay đổi tồn kho. Vui lòng cập nhật trước khi thanh toán.';
  }

  return {
    _id: cart._id,
    accountId: cart.accountId,
    items: enrichedItems,
    totalItems: totalCount,
    subtotal,
    hasInvalidItems,
    invalidMessage,
  };
}

/**
 * Cập nhật số lượng của một dòng trong giỏ hàng
 */
async function updateItemQuantity(accountId, itemId, quantity) {
  const qty = Number(quantity);
  if (!qty || qty < 1) {
    const err = new Error('Số lượng sản phẩm phải từ 1 trở lên');
    err.statusCode = 400;
    throw err;
  }

  const cart = await Cart.findOne({ accountId });
  if (!cart) {
    const err = new Error('Giỏ hàng không tồn tại');
    err.statusCode = 404;
    throw err;
  }

  const item = cart.items.id(itemId);
  if (!item) {
    const err = new Error('Không tìm thấy sản phẩm trong giỏ hàng');
    err.statusCode = 404;
    throw err;
  }

  const product = await Product.findById(item.productId);
  if (!product || product.status !== 'active') {
    const err = new Error('Sản phẩm đã ngừng kinh doanh');
    err.statusCode = 400;
    throw err;
  }

  if (qty > product.stock) {
    const err = new Error(`Số lượng sản phẩm trong kho không đủ (Hiện còn ${product.stock} sản phẩm)`);
    err.statusCode = 400;
    throw err;
  }

  item.quantity = qty;
  item.unitPrice = product.price;
  await cart.save();

  return getCart(accountId);
}

/**
 * Xóa một dòng sản phẩm khỏi giỏ hàng
 */
async function removeItem(accountId, itemId) {
  const cart = await Cart.findOne({ accountId });
  if (!cart) {
    const err = new Error('Giỏ hàng không tồn tại');
    err.statusCode = 404;
    throw err;
  }

  cart.items.pull({ _id: itemId });
  await cart.save();

  return getCart(accountId);
}

/**
 * Xóa sạch toàn bộ giỏ hàng
 */
async function clearCart(accountId) {
  let cart = await Cart.findOne({ accountId });
  if (cart) {
    cart.items = [];
    await cart.save();
  }
  return {
    items: [],
    totalItems: 0,
    subtotal: 0,
    hasInvalidItems: false,
  };
}

module.exports = {
  addToCart,
  getCart,
  updateItemQuantity,
  removeItem,
  clearCart,
};
