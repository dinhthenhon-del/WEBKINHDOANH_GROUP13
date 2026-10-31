const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const Product = require('./models/Product');

const app = express();

// Base64 product images are included in JSON requests.
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// 1. KẾT NỐI MONGODB (Tự động fallback URI dùng chung của nhóm nếu chưa có file .env)
const DEFAULT_MONGO_URI = 'mongodb://dinhthenhon_db_user:dinhthenhongmail.com@ac-1u1pbza-shard-00-00.y2hcyuo.mongodb.net:27017,ac-1u1pbza-shard-00-01.y2hcyuo.mongodb.net:27017,ac-1u1pbza-shard-00-02.y2hcyuo.mongodb.net:27017/?ssl=true&replicaSet=atlas-13eeom-shard-0&authSource=admin&appName=craftory-ecommerce-cluster';
const MONGODB_URI = process.env.MONGODB_URI || DEFAULT_MONGO_URI;
const MINHLONG_PRODUCT_URL = /^https:\/\/minhlong\.com\/products\/[a-z0-9-]+\/?$/i;
const MINHLONG_IMAGE_URL = /^https:\/\/(?:cdn\.hstatic\.net\/products\/200000532849\/|product\.hstatic\.net\/200000532849\/product\/)[^?#]+\.(?:png|jpe?g|webp)(?:\?[^#]*)?$/i;
const BATTRANG_PRODUCT_URL = /^https:\/\/gomsulongloan\.vn\/san-pham\/[a-z0-9-]+\/?$/i;
const BATTRANG_IMAGE_URL = /^https:\/\/gomsulongloan\.vn\/wp-content\/uploads\/[^?#]+\.(?:png|jpe?g|webp)(?:\?[^#]*)?$/i;
const PRODUCT_IMAGE_URL = /^(?:https:\/\/[^/?#]+\/[^?#]*\.(?:png|jpe?g|webp|gif|avif)(?:\?[^#]*)?(?:#.*)?|https:\/\/encrypted-tbn\d*\.gstatic\.com\/images\?[^#]+)$/i;
const PRODUCT_IMAGE_PATTERN = /^(?:https:\/\/[^/?#]+\/[^?#]*\.(?:png|jpe?g|webp|gif|avif)(?:\?[^#]*)?(?:#.*)?|https:\/\/encrypted-tbn\d*\.gstatic\.com\/images\?[^#]+|data:image\/(?:jpeg|jpg|png|webp|gif);base64,)/i;
const MAX_PRODUCT_IMAGE_DATA_URLS_SIZE = 8 * 1024 * 1024;

function isValidProductSource(sourceUrl) {
  return MINHLONG_PRODUCT_URL.test(sourceUrl || '') ||
    BATTRANG_PRODUCT_URL.test(sourceUrl || '') ||
    PRODUCT_IMAGE_URL.test(sourceUrl || '');
}

function validateCatalogImage(image) {
  if (typeof image !== 'string' || image.length === 0) {
    return { valid: false, message: 'Ảnh sản phẩm không hợp lệ' };
  }
  if (image.startsWith('data:image/')) {
    return validateImageInput(image);
  }
  if (!PRODUCT_IMAGE_URL.test(image)) {
    return { valid: false, message: 'URL ảnh sản phẩm không hợp lệ' };
  }
  return { valid: true };
}

function validateCatalogImages(images) {
  let totalDataUrlBytes = 0;
  for (const image of images) {
    const validation = validateCatalogImage(image);
    if (!validation.valid) {
      return validation;
    }
    if (image.startsWith('data:image/')) {
      totalDataUrlBytes += Buffer.byteLength(image, 'utf8');
    }
  }
  if (totalDataUrlBytes > MAX_PRODUCT_IMAGE_DATA_URLS_SIZE) {
    return { valid: false, message: 'Tổng dung lượng ảnh Base64 không được vượt quá 8 MB' };
  }
  return { valid: true };
}

function getVerifiedCatalogProductFilter() {
  return {
    sourceUrl: { $in: [MINHLONG_PRODUCT_URL, BATTRANG_PRODUCT_URL, PRODUCT_IMAGE_URL] },
    name: { $type: 'string', $ne: '' },
    sku: { $type: 'string', $ne: '' },
    price: { $gt: 0 },
    categoryId: { $ne: null },
    image: PRODUCT_IMAGE_PATTERN,
    images: PRODUCT_IMAGE_PATTERN
  };
}

// Models TV2
const Category = require('./models/Category');
const Collection = require('./models/Collection');
const {
  validateImageInput,
  createProductWithSync,
  updateProductWithSync,
} = require('./core/productSyncStore');

// Helper sinh slug tiếng Việt không dấu
function slugifyVietnamese(str) {
  if (!str) return '';
  return str
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

// ==========================================
// THÀNH VIÊN 2: SẢN PHẨM, DANH MỤC, TỒN KHO & WISHLIST
// ==========================================

// 2. API: Lấy danh sách sản phẩm (Tìm kiếm, Lọc theo giá, danh mục, BST, Sắp xếp, Phân trang)
app.get('/api/products', async (req, res) => {
  try {
    const {
      search,
      q,
      categoryId,
      categorySlug,
      collectionId,
      collectionSlug,
      collectionName,
      glaze,
      minPrice,
      maxPrice,
      status,
      scope,
      sort,
      page = 1,
      limit = 12
    } = req.query;

    const query = { $and: [getVerifiedCatalogProductFilter()] };
    const keyword = (search || q || '').trim();

    // 1. Tìm kiếm theo tên hoặc SKU
    if (keyword) {
      const searchRegex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [
        { name: searchRegex },
        { sku: searchRegex },
        { collectionName: searchRegex },
        { description: searchRegex }
      ];
    }

    // 2. Lọc theo danh mục
    if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
      query.categoryId = new mongoose.Types.ObjectId(categoryId);
    } else if (categorySlug && categorySlug !== 'all') {
      const cat = await Category.findOne({ slug: categorySlug });
      if (cat) {
        query.categoryId = cat._id;
      }
    }

    // 3. Lọc theo bộ sưu tập, ưu tiên quan hệ ID; hỗ trợ sản phẩm cũ chưa có collectionId.
    let selectedCollection = null;
    if (collectionId && mongoose.Types.ObjectId.isValid(collectionId)) {
      selectedCollection = await Collection.findById(collectionId).select('_id name').lean();
    } else if (collectionSlug && collectionSlug !== 'all') {
      selectedCollection = await Collection.findOne({ slug: collectionSlug }).select('_id name').lean();
    } else if (collectionName && collectionName !== 'all') {
      selectedCollection = await Collection.findOne({
        name: new RegExp(`^${collectionName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')
      }).select('_id name').lean();
      if (!selectedCollection) {
        selectedCollection = { name: collectionName.trim(), _id: null };
      }
    }

    if (selectedCollection) {
      const escapedCollectionName = selectedCollection.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (selectedCollection._id) {
        query.$and = (query.$and || []).concat([{
          $or: [
            { collectionId: selectedCollection._id },
            {
              collectionId: { $in: [null] },
              collectionName: new RegExp(`^${escapedCollectionName}$`, 'i')
            }
          ]
        }]);
      } else {
        query.collectionName = new RegExp(`^${escapedCollectionName}$`, 'i');
      }
    } else if (collectionId || collectionSlug || (collectionName && collectionName !== 'all')) {
      query._id = { $exists: false };
    }
    if (glaze && glaze !== 'all') {
      const glazeMap = {
        'men-lam': 'Men Lam',
        'men-ran': 'Men Rạn',
        'men-ngoc': 'Men Ngọc',
        'men-hoa-bien': 'Men Hỏa Biến',
        'men-moc': 'Đất Nung Mộc'
      };
      const glazeText = glazeMap[glaze] || glaze;
      query.$or = (query.$or || []).concat([
        { glazeColor: new RegExp(glazeText, 'i') },
        { name: new RegExp(glazeText, 'i') },
        { description: new RegExp(glazeText, 'i') }
      ]);
    }

    // 4. Lọc theo khoảng giá
    if (minPrice !== undefined || maxPrice !== undefined) {
      query.price = {};
      if (minPrice !== undefined && !isNaN(minPrice)) query.price.$gte = Number(minPrice);
      if (maxPrice !== undefined && !isNaN(maxPrice)) query.price.$lte = Number(maxPrice);
    }

    // 5. Kiểm tra trạng thái sản phẩm
    // Nếu là Admin (scope=admin hoặc status='all'), hiển thị đầy đủ
    if (scope === 'admin' || status === 'all') {
      if (status && status !== 'all') {
        query.status = status;
      }
    } else {
      // Phía Customer (UC-C03): Không hiển thị sản phẩm trạng thái "Ngừng bán" (inactive) hoặc "Hết hàng" (stock = 0)
      query.status = 'active';
      query.stock = { $gt: 0 };
    }

    // 6. Sắp xếp
    let sortOption = { createdAt: -1 };
    if (sort === 'price-asc') sortOption = { price: 1 };
    else if (sort === 'price-desc') sortOption = { price: -1 };
    else if (sort === 'rating' || sort === 'averageRating') sortOption = { averageRating: -1, reviewCount: -1 };
    else if (sort === 'stock-asc') sortOption = { stock: 1 };
    else if (sort === 'stock-desc') sortOption = { stock: -1 };

    // 7. Phân trang
    const numLimit = Number(limit) > 0 ? Number(limit) : 0;
    const numPage = Math.max(1, Number(page) || 1);
    const skip = numLimit > 0 ? (numPage - 1) * numLimit : 0;

    const total = await Product.countDocuments(query);
    let productQuery = Product.find(query).populate('categoryId', 'name slug imageUrl description').sort(sortOption);

    if (numLimit > 0) {
      productQuery = productQuery.skip(skip).limit(numLimit);
    }

    const products = await productQuery.lean();

    res.status(200).json({
      success: true,
      data: products,
      pagination: {
        total,
        page: numPage,
        limit: numLimit > 0 ? numLimit : total,
        totalPages: numLimit > 0 ? Math.ceil(total / numLimit) : 1
      }
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách sản phẩm:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2.1. API: Thống kê tổng quan Kho & Sản phẩm dành cho Admin (Inventory KPI)
app.get('/api/admin/inventory/summary', async (req, res) => {
  try {
    const verifiedFilter = getVerifiedCatalogProductFilter();
    const totalProducts = await Product.countDocuments(verifiedFilter);
    const activeProducts = await Product.countDocuments({ ...verifiedFilter, status: 'active' });
    const inactiveProducts = await Product.countDocuments({ ...verifiedFilter, status: 'inactive' });
    const outOfStockProducts = await Product.countDocuments({ ...verifiedFilter, stock: { $lte: 0 } });
    const lowStockProducts = await Product.countDocuments({ ...verifiedFilter, stock: { $gt: 0, $lte: 5 } });
    const categoriesCount = (await Product.distinct('categoryId', {
      ...verifiedFilter,
      categoryId: { $ne: null }
    })).length;

    // Tính tổng tồn khả dụng
    const stockAgg = await Product.aggregate([
      { $match: verifiedFilter },
      { $group: { _id: null, totalStock: { $sum: '$stock' } } }
    ]);
    const totalStock = stockAgg.length > 0 ? stockAgg[0].totalStock : 0;

    res.status(200).json({
      success: true,
      data: {
        totalProducts,
        totalStock,
        activeProducts,
        inactiveProducts,
        outOfStockProducts,
        lowStockProducts,
        categoriesCount
      }
    });
  } catch (error) {
    console.error('Lỗi thống kê kho:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3. API: Lấy chi tiết 1 sản phẩm (hỗ trợ ID hoặc slug) + Sản phẩm gợi ý cùng bộ sưu tập
app.get('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const verifiedFilter = getVerifiedCatalogProductFilter();
    let product = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      product = await Product.findOne({ _id: id, ...verifiedFilter }).populate('categoryId', 'name slug imageUrl description').lean();
    }
    if (!product) {
      product = await Product.findOne({ slug: id, ...verifiedFilter }).populate('categoryId', 'name slug imageUrl description').lean();
    }

    if (!product) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
    }

    // Lấy 4 sản phẩm liên quan (cùng danh mục hoặc bộ sưu tập)
    const relatedQuery = {
      _id: { $ne: product._id },
      status: 'active',
      ...verifiedFilter
    };
    if (product.categoryId && product.categoryId._id) {
      relatedQuery.categoryId = product.categoryId._id;
    } else if (product.collectionName) {
      relatedQuery.collectionName = product.collectionName;
    }

    const related = await Product.find(relatedQuery).limit(4).lean();

    res.status(200).json({
      success: true,
      data: product,
      related
    });
  } catch (error) {
    console.error('Lỗi lấy chi tiết sản phẩm:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 4. API: Thêm sản phẩm mới từ nguồn Minh Long (Admin -> Runtime JSON -> MongoDB)
app.post('/api/products', async (req, res) => {
  try {
    const {
      name,
      sku,
      categoryId,
      collectionName,
      slug,
      description,
      price,
      stock,
      images,
      image,
      status,
      material,
      size,
      glazeColor,
      firingTemp,
      unit,
      minStockAlert,
      custom2DEnabled,
      sourceUrl
    } = req.body;

    // 1. Validation bắt buộc
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Tên sản phẩm là bắt buộc (E2)' });
    }
    if (!isValidProductSource(sourceUrl)) {
      return res.status(400).json({ success: false, message: 'URL nguồn phải là link trang sản phẩm hoặc link ảnh HTTPS hợp lệ' });
    }
    const imageList = Array.isArray(images) && images.length > 0
      ? images.filter(Boolean)
      : (image ? [image] : []);
    if (imageList.length === 0 && PRODUCT_IMAGE_URL.test(sourceUrl || '')) {
      imageList.push(sourceUrl);
    }
    if (image && !imageList.includes(image)) {
      imageList.unshift(image);
    }
    if (imageList.length === 0) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp ảnh sản phẩm' });
    }
    const imageValidation = validateCatalogImages(imageList);
    if (!imageValidation.valid) {
      return res.status(400).json({ success: false, message: imageValidation.message });
    }
    if (collectionName !== undefined && collectionName !== null && typeof collectionName !== 'string') {
      return res.status(400).json({ success: false, message: 'Tên bộ sưu tập không hợp lệ' });
    }
    const cleanCollectionName = typeof collectionName === 'string' ? collectionName.trim() : '';
    let selectedCollection = null;
    if (cleanCollectionName) {
      selectedCollection = await Collection.findOne({
        name: cleanCollectionName,
        sourceUrl: { $in: [MINHLONG_PRODUCT_URL, BATTRANG_PRODUCT_URL] },
        imageUrl: { $in: [MINHLONG_IMAGE_URL, BATTRANG_IMAGE_URL] },
        status: 'active'
      });
      if (!selectedCollection) {
        return res.status(400).json({ success: false, message: 'Không tìm thấy bộ sưu tập tương ứng' });
      }
    }
    if (!mongoose.Types.ObjectId.isValid(categoryId) ||
      !await Category.exists({ _id: categoryId, status: 'active' })) {
      return res.status(400).json({ success: false, message: 'Phải chọn danh mục đang hoạt động' });
    }
    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice <= 0) {
      return res.status(400).json({ success: false, message: 'Giá sản phẩm phải lớn hơn 0 (E3)' });
    }
    const numStock = Number(stock);
    if (isNaN(numStock) || numStock < 0 || !Number.isInteger(numStock)) {
      return res.status(400).json({ success: false, message: 'Số lượng tồn kho phải là số nguyên không âm (E5)' });
    }

    // 2. Kiểm tra SKU duy nhất
    let cleanSku = (sku || '').trim().toUpperCase();
    if (!cleanSku) {
      return res.status(400).json({ success: false, message: 'SKU phải được cung cấp từ nguồn sản phẩm' });
    } else {
      const existingSku = await Product.findOne({ sku: cleanSku });
      if (existingSku) {
        return res.status(400).json({ success: false, message: `Mã sản phẩm (SKU) "${cleanSku}" đã tồn tại trong hệ thống (E1)` });
      }
    }

    // 3. Chuẩn hóa hình ảnh; ảnh tải lên được giữ dưới dạng Data URI Base64.
    const primaryImage = imageList[0];
    const cleanSlug = (slug || slugifyVietnamese(name)).trim() || `sp-${Date.now()}`;

    // 4. Chuẩn bị payload
    const productPayload = {
      name: name.trim(),
      sku: cleanSku,
      categoryId: categoryId && mongoose.Types.ObjectId.isValid(categoryId) ? new mongoose.Types.ObjectId(categoryId) : null,
      collectionName: selectedCollection ? selectedCollection.name : '',
      collectionId: selectedCollection ? selectedCollection._id : null,
      sourceUrl: sourceUrl.trim(),
      slug: cleanSlug,
      description: (description || '').trim(),
      price: numPrice,
      stock: numStock,
      images: imageList,
      image: primaryImage,
      status: status === 'inactive' ? 'inactive' : 'active',
      material: (material || '').trim(),
      size: (size || '').trim(),
      glazeColor: (glazeColor || '').trim(),
      firingTemp: (firingTemp || '').trim(),
      unit: (unit || 'chiếc').trim(),
      minStockAlert: Number(minStockAlert) >= 0 ? Number(minStockAlert) : 2,
      custom2DEnabled: Boolean(custom2DEnabled),
      averageRating: 0,
      reviewCount: 0
    };

    // 5. Thực thi luồng: Admin Form -> Runtime JSON -> MongoDB
    const savedProduct = await createProductWithSync(productPayload, Product);

    res.status(201).json({
      success: true,
      message: 'Đã lưu sản phẩm thành công vào hệ thống (JSON Runtime & MongoDB)',
      data: savedProduct
    });
  } catch (error) {
    console.error('Lỗi khi thêm sản phẩm:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 5. API: Cập nhật sản phẩm có nguồn Minh Long (Admin -> Runtime JSON -> MongoDB)
app.put('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await Product.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
    }

    const {
      name,
      sku,
      categoryId,
      collectionName,
      slug,
      description,
      price,
      stock,
      images,
      image,
      status,
      material,
      size,
      glazeColor,
      firingTemp,
      unit,
      minStockAlert,
      custom2DEnabled,
      sourceUrl
    } = req.body;

    // Validation
    if (name !== undefined && !name.trim()) {
      return res.status(400).json({ success: false, message: 'Tên sản phẩm không được để trống (E2)' });
    }

    if (sku !== undefined) {
      const cleanSku = sku.trim().toUpperCase();
      if (cleanSku && cleanSku !== existing.sku) {
        const dup = await Product.findOne({ sku: cleanSku, _id: { $ne: existing._id } });
        if (dup) {
          return res.status(400).json({ success: false, message: `Mã SKU "${cleanSku}" đã tồn tại ở sản phẩm khác (E1)` });
        }
      }
    }

    if (price !== undefined) {
      const numPrice = Number(price);
      if (isNaN(numPrice) || numPrice <= 0) {
        return res.status(400).json({ success: false, message: 'Giá sản phẩm phải lớn hơn 0 (E3)' });
      }
    }

    if (stock !== undefined) {
      const numStock = Number(stock);
      if (isNaN(numStock) || numStock < 0 || !Number.isInteger(numStock)) {
        return res.status(400).json({ success: false, message: 'Số lượng tồn kho phải là số nguyên không âm (E5)' });
      }
    }

    // Validate uploaded Base64 data and supported source URLs if supplied.
    if (sourceUrl !== undefined && !isValidProductSource(sourceUrl)) {
      return res.status(400).json({ success: false, message: 'URL nguồn phải là link trang sản phẩm hoặc link ảnh HTTPS hợp lệ' });
    }
    const imagesToValidate = Array.isArray(images) ? images.filter(Boolean) : [];
    if (image !== undefined && !imagesToValidate.includes(image)) {
      imagesToValidate.unshift(image);
    }
    if (imagesToValidate.length === 0 && PRODUCT_IMAGE_URL.test(sourceUrl || '')) {
      imagesToValidate.push(sourceUrl);
    }
    if (image !== undefined || imagesToValidate.length > 0) {
      const imageValidation = validateCatalogImages(imagesToValidate);
      if (!imageValidation.valid) {
        return res.status(400).json({ success: false, message: imageValidation.message });
      }
    }
    let selectedCollection = null;
    let shouldUpdateCollection = false;
    if (collectionName !== undefined) {
      if (collectionName !== null && typeof collectionName !== 'string') {
        return res.status(400).json({ success: false, message: 'Tên bộ sưu tập không hợp lệ' });
      }
      shouldUpdateCollection = true;
      const cleanCollectionName = typeof collectionName === 'string' ? collectionName.trim() : '';
      if (cleanCollectionName) {
        selectedCollection = await Collection.findOne({
          name: cleanCollectionName,
          sourceUrl: { $in: [MINHLONG_PRODUCT_URL, BATTRANG_PRODUCT_URL] },
          imageUrl: { $in: [MINHLONG_IMAGE_URL, BATTRANG_IMAGE_URL] },
          status: 'active'
        });
        if (!selectedCollection) {
          return res.status(400).json({ success: false, message: 'Không tìm thấy bộ sưu tập tương ứng' });
        }
      }
    }
    if (categoryId !== undefined &&
      (!mongoose.Types.ObjectId.isValid(categoryId) ||
        !await Category.exists({ _id: categoryId, status: 'active' }))) {
      return res.status(400).json({ success: false, message: 'Phải chọn danh mục đang hoạt động' });
    }

    const updatePayload = {};
    if (name !== undefined) updatePayload.name = name.trim();
    if (sku !== undefined) updatePayload.sku = sku.trim().toUpperCase();
    if (categoryId !== undefined) {
      updatePayload.categoryId = new mongoose.Types.ObjectId(categoryId);
    }
    if (shouldUpdateCollection) {
      updatePayload.collectionName = selectedCollection ? selectedCollection.name : '';
      updatePayload.collectionId = selectedCollection ? selectedCollection._id : null;
    }
    if (sourceUrl !== undefined) updatePayload.sourceUrl = sourceUrl.trim();
    if (slug !== undefined) updatePayload.slug = slug.trim();
    if (description !== undefined) updatePayload.description = description.trim();
    if (price !== undefined) updatePayload.price = Number(price);
    if (stock !== undefined) updatePayload.stock = Number(stock);
    if (material !== undefined) updatePayload.material = material.trim();
    if (size !== undefined) updatePayload.size = size.trim();
    if (glazeColor !== undefined) updatePayload.glazeColor = glazeColor.trim();
    if (firingTemp !== undefined) updatePayload.firingTemp = firingTemp.trim();
    if (unit !== undefined) updatePayload.unit = unit.trim();
    if (minStockAlert !== undefined) updatePayload.minStockAlert = Number(minStockAlert);
    if (custom2DEnabled !== undefined) updatePayload.custom2DEnabled = Boolean(custom2DEnabled);
    if (status !== undefined) updatePayload.status = status;

    if (Array.isArray(images)) {
      updatePayload.images = images.filter(Boolean);
      updatePayload.image = updatePayload.images[0] || image || existing.image || '';
    } else if (image !== undefined) {
      updatePayload.image = image;
      if (!existing.images || existing.images.length === 0) {
        updatePayload.images = [image];
      }
    } else if (PRODUCT_IMAGE_URL.test(sourceUrl || '')) {
      updatePayload.image = sourceUrl;
      updatePayload.images = [sourceUrl];
    }

    // Thực thi luồng: Admin Form -> Runtime JSON -> MongoDB
    const updatedProduct = await updateProductWithSync(id, updatePayload, Product);

    res.status(200).json({
      success: true,
      message: 'Đã cập nhật sản phẩm thành công',
      data: updatedProduct
    });
  } catch (error) {
    console.error('Lỗi cập nhật sản phẩm:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 5.1. API: Cập nhật nhanh trạng thái kinh doanh (Đang bán / Ngừng bán)
app.patch('/api/products/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!status || !['active', 'inactive'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Trạng thái phải là active hoặc inactive' });
    }

    const updated = await updateProductWithSync(req.params.id, { status }, Product);
    res.status(200).json({
      success: true,
      message: `Đã đổi trạng thái sản phẩm sang "${status === 'active' ? 'Đang bán' : 'Ngừng bán'}"`,
      data: updated
    });
  } catch (error) {
    console.error('Lỗi đổi trạng thái sản phẩm:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 5.2. API: Cập nhật nhanh số lượng tồn kho (Inventory Quick Update)
app.patch('/api/products/:id/stock', async (req, res) => {
  try {
    const numStock = Number(req.body.stock);
    if (isNaN(numStock) || numStock < 0 || !Number.isInteger(numStock)) {
      return res.status(400).json({ success: false, message: 'Số lượng tồn kho phải là số nguyên không âm (E5)' });
    }

    const updated = await updateProductWithSync(req.params.id, { stock: numStock }, Product);
    res.status(200).json({
      success: true,
      message: `Đã cập nhật số lượng tồn kho thành công (${numStock} chiếc)`,
      data: updated
    });
  } catch (error) {
    console.error('Lỗi cập nhật tồn kho:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 6. API: Xóa sản phẩm
app.delete('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
    }

    const OrderModel = require('./models/Order');
    const existingOrder = await OrderModel.findOne({ 'items.productId': id });

    if (existingOrder) {
      await updateProductWithSync(id, { status: 'inactive' }, Product);
      return res.status(200).json({
        success: true,
        isDeactivated: true,
        message: 'Tác phẩm đã phát sinh giao dịch trong đơn hàng. Hệ thống đã tự động chuyển sang trạng thái "Ngừng bán" (Inactive) để bảo tồn lịch sử đơn hàng.'
      });
    }

    await Product.findByIdAndDelete(id);

    // Xóa khỏi file runtime JSON
    const { readRuntimeProducts, writeRuntimeProductsAtomic } = require('./core/productSyncStore');
    const runtimeList = readRuntimeProducts().filter(p => p._id !== id);
    writeRuntimeProductsAtomic(runtimeList);

    res.status(200).json({
      success: true,
      message: 'Đã xóa tác phẩm gốm sứ khỏi hệ thống thành công!'
    });
  } catch (error) {
    console.error('Lỗi khi xóa sản phẩm:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 7. API: Lấy danh sách danh mục (kèm số lượng sản phẩm tương ứng)
app.get('/api/categories', async (req, res) => {
  try {
    const { status, all } = req.query;
    const filter = {};
    if (all !== 'true' && status !== 'all') {
      filter.status = status || 'active';
    }

    const categories = await Category.find(filter).sort({ createdAt: 1 }).lean();

    // Đếm số lượng sản phẩm cho từng danh mục
    const counts = await Product.aggregate([
      {
        $match: {
          ...getVerifiedCatalogProductFilter(),
          categoryId: { $ne: null }
        }
      },
      { $group: { _id: '$categoryId', count: { $sum: 1 } } }
    ]);
    const countMap = new Map(counts.map(c => [c._id.toString(), c.count]));

    const enriched = categories
      .map(c => ({
        ...c,
        name: c.slug === 'binh' ? 'Bình' : c.name,
        productCount: countMap.get(c._id.toString()) || 0
      }))
      .filter(category => category.productCount > 0 || category.slug === 'binh');

    res.status(200).json({ success: true, data: enriched });
  } catch (error) {
    console.error('Lỗi lấy danh mục:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 7.1. API: Thêm danh mục mới
app.post('/api/categories', async (req, res) => {
  try {
    const { name, slug, description, imageUrl, status } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Tên danh mục là bắt buộc' });
    }

    const cleanSlug = (slug || slugifyVietnamese(name)).trim();
    const existing = await Category.findOne({ slug: cleanSlug });
    if (existing) {
      return res.status(400).json({ success: false, message: `Danh mục với slug "${cleanSlug}" đã tồn tại` });
    }

    const category = new Category({
      name: name.trim(),
      slug: cleanSlug,
      description: (description || '').trim(),
      imageUrl: imageUrl || '',
      status: status === 'inactive' ? 'inactive' : 'active'
    });

    await category.save();
    res.status(201).json({ success: true, message: 'Đã tạo danh mục thành công', data: category });
  } catch (error) {
    console.error('Lỗi tạo danh mục:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 7.2. API: Lấy danh sách bộ sưu tập nghệ phẩm
app.get('/api/collections', async (req, res) => {
  try {
    const adminScope = req.query.scope === 'admin';
    const productFilter = {
      collectionName: { $nin: ['', null] },
      ...(!adminScope ? { status: 'active', stock: { $gt: 0 } } : {}),
      ...getVerifiedCatalogProductFilter()
    };
    const distinctNames = await Product.distinct('collectionName', productFilter);
    const collectionFilter = { status: 'active' };
    collectionFilter.sourceUrl = { $in: [MINHLONG_PRODUCT_URL, BATTRANG_PRODUCT_URL] };
    collectionFilter.imageUrl = { $in: [MINHLONG_IMAGE_URL, BATTRANG_IMAGE_URL] };
    collectionFilter.name = { $in: distinctNames };
    let collections = await Collection.find(collectionFilter).sort({ createdAt: 1 }).lean();

    const linkedProductCounts = await Product.aggregate([
      { $match: { ...productFilter, collectionId: { $ne: null } } },
      { $group: { _id: '$collectionId', count: { $sum: 1 } } }
    ]);
    const legacyProductCounts = await Product.aggregate([
      { $match: { ...productFilter, collectionId: null } },
      {
        $group: {
          _id: { $trim: { input: '$collectionName' } },
          count: { $sum: 1 }
        }
      }
    ]);
    const linkedCountMap = new Map(
      linkedProductCounts.map(item => [item._id.toString(), item.count])
    );
    const legacyCountMap = new Map(legacyProductCounts.map(item => [item._id.trim().toLowerCase(), item.count]));
    collections = collections.map(collection => ({
      ...collection,
      productCount:
        (linkedCountMap.get(String(collection._id || '')) || 0) +
        (legacyCountMap.get(collection.name.trim().toLowerCase()) || 0)
    }));

    res.status(200).json({ success: true, data: collections });
  } catch (error) {
    console.error('Lỗi lấy bộ sưu tập:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 7.3. API: Lấy chi tiết Wishlist đầy đủ sản phẩm (UC-C10)
app.get('/api/accounts/wishlist/:accountId', async (req, res) => {
  try {
    const account = await Account.findById(req.params.accountId)
      .populate({ path: 'wishlist', match: getVerifiedCatalogProductFilter() })
      .lean();

    if (!account) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản' });
    }
    account.wishlist = (account.wishlist || []).filter(Boolean);

    res.status(200).json({
      success: true,
      data: account.wishlist || []
    });
  } catch (error) {
    console.error('Lỗi lấy chi tiết wishlist:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// THÀNH VIÊN 1: AUTH, PROFILE, WISHLIST, ORDERS
// Tuân thủ 100% Phase 4 và Model Account / Order
// ==========================================
const Account = require('./models/Account');
const Order = require('./models/Order');
const Cart = require('./models/Cart');

// Phân hệ Giỏ hàng khách hàng (UC-C05 - TV3)
const cartRoutes = require('./modules/cart/cart.routes');
app.use('/api/cart', cartRoutes);

// 0. API giỏ hàng khách hàng
app.get('/api/cart/:accountId', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.accountId)) {
      return res.status(400).json({ success: false, message: 'Mã tài khoản không hợp lệ' });
    }
    const account = await Account.findById(req.params.accountId).select('_id status');
    if (!account || account.status === 'blocked') {
      return res.status(account ? 403 : 404).json({
        success: false,
        message: account ? 'Tài khoản của bạn hiện tại đã bị khóa' : 'Không tìm thấy tài khoản'
      });
    }
    const cart = await Cart.findOne({ accountId: account._id })
      .populate({ path: 'items.productId', match: getVerifiedCatalogProductFilter() })
      .lean();
    const data = cart || { accountId: account._id, items: [] };
    data.items = (data.items || []).filter(item => item.productId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Lỗi lấy giỏ hàng:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/cart/items', async (req, res) => {
  try {
    const { accountId, productId, quantity } = req.body;
    if (!mongoose.Types.ObjectId.isValid(accountId) || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ success: false, message: 'Mã tài khoản hoặc sản phẩm không hợp lệ' });
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({ success: false, message: 'Số lượng sản phẩm phải là số nguyên dương' });
    }
    const account = await Account.findById(accountId).select('_id status');
    if (!account || account.status !== 'active') {
      return res.status(account ? 403 : 404).json({
        success: false,
        message: account ? 'Tài khoản hiện không thể mua hàng' : 'Không tìm thấy tài khoản'
      });
    }
    const product = await Product.findOne({
      _id: productId,
      status: 'active',
      ...getVerifiedCatalogProductFilter()
    });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Sản phẩm không khả dụng hoặc chưa được xác minh' });
    }
    let cart = await Cart.findOne({ accountId: account._id });
    if (!cart) cart = new Cart({ accountId: account._id, items: [] });
    const cartItem = cart.items.find(item => item.productId.toString() === product._id.toString());
    const updatedQuantity = quantity + (cartItem ? cartItem.quantity : 0);
    if (updatedQuantity > product.stock) {
      return res.status(400).json({
        success: false,
        message: `Số lượng sản phẩm trong kho không đủ (chỉ còn ${product.stock} chiếc)`
      });
    }

    const customization = req.body.customization || null;
    const effectivePrice = (customization && Number(customization.price) > 0)
      ? Number(customization.price)
      : product.price;
    const effectiveName = (customization && customization.designName)
      ? customization.designName
      : product.name;

    if (cartItem) {
      cartItem.quantity = updatedQuantity;
      cartItem.unitPrice = effectivePrice;
      cartItem.productName = effectiveName;
      if (customization) cartItem.customization = customization;
    } else {
      cart.items.push({
        productId: product._id,
        productName: effectiveName,
        unitPrice: effectivePrice,
        quantity,
        customization,
      });
    }
    await cart.save();
    const updatedCart = await Cart.findById(cart._id).populate('items.productId').lean();
    res.status(200).json({ success: true, message: 'Đã thêm sản phẩm vào giỏ hàng', data: updatedCart });
  } catch (error) {
    console.error('Lỗi thêm sản phẩm vào giỏ hàng:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.patch('/api/cart/:accountId/items/:productId', async (req, res) => {
  try {
    const { accountId, productId } = req.params;
    const { quantity } = req.body;
    if (!mongoose.Types.ObjectId.isValid(accountId) || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ success: false, message: 'Mã tài khoản hoặc sản phẩm không hợp lệ' });
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({ success: false, message: 'Số lượng sản phẩm phải là số nguyên dương' });
    }
    const account = await Account.findById(accountId).select('_id status');
    if (!account || account.status !== 'active') {
      return res.status(account ? 403 : 404).json({
        success: false,
        message: account ? 'Tài khoản hiện không thể mua hàng' : 'Không tìm thấy tài khoản'
      });
    }
    const product = await Product.findOne({
      _id: productId,
      status: 'active',
      ...getVerifiedCatalogProductFilter()
    });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Sản phẩm không khả dụng hoặc chưa được xác minh' });
    }
    if (quantity > product.stock) {
      return res.status(400).json({
        success: false,
        message: `Số lượng sản phẩm trong kho không đủ (chỉ còn ${product.stock} chiếc)`
      });
    }
    const cart = await Cart.findOne({ accountId: account._id });
    const cartItem = cart && cart.items.find(item => item.productId.toString() === product._id.toString());
    if (!cartItem) {
      return res.status(404).json({ success: false, message: 'Sản phẩm không có trong giỏ hàng' });
    }
    cartItem.quantity = quantity;
    cartItem.unitPrice = product.price;
    cartItem.productName = product.name;
    await cart.save();
    const updatedCart = await Cart.findById(cart._id).populate('items.productId').lean();
    res.status(200).json({ success: true, message: 'Đã cập nhật số lượng sản phẩm', data: updatedCart });
  } catch (error) {
    console.error('Lỗi cập nhật số lượng giỏ hàng:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/cart/:accountId/items/:productId', async (req, res) => {
  try {
    const { accountId, productId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(accountId) || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ success: false, message: 'Mã tài khoản hoặc sản phẩm không hợp lệ' });
    }
    const account = await Account.findById(accountId).select('_id status');
    if (!account || account.status !== 'active') {
      return res.status(account ? 403 : 404).json({
        success: false,
        message: account ? 'Tài khoản hiện không thể mua hàng' : 'Không tìm thấy tài khoản'
      });
    }
    const cart = await Cart.findOne({ accountId: account._id });
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy giỏ hàng' });
    }
    const normalizedProductId = new mongoose.Types.ObjectId(productId).toString();
    const itemIndex = cart.items.findIndex(item => item.productId.toString() === normalizedProductId);
    if (itemIndex === -1) {
      return res.status(404).json({ success: false, message: 'Sản phẩm không có trong giỏ hàng' });
    }
    cart.items.splice(itemIndex, 1);
    await cart.save();
    const updatedCart = await Cart.findById(cart._id).populate('items.productId').lean();
    res.status(200).json({ success: true, message: 'Đã xóa sản phẩm khỏi giỏ hàng', data: updatedCart });
  } catch (error) {
    console.error('Lỗi xóa sản phẩm khỏi giỏ hàng:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 1. API Đăng ký tài khoản khách hàng (UC-C01)
app.post('/api/auth/register', async (req, res) => {
  try {
    const { fullName, email, phone, password } = req.body;
    if (!fullName || !email || !phone || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đầy đủ thông tin bắt buộc' });
    }

    const cleanFullName = String(fullName).trim();
    const cleanEmail = String(email).toLowerCase().trim();
    const cleanPhone = String(phone).replace(/[\s.\-()]/g, '').replace(/^\+84/, '0').trim();

    if (cleanFullName.length < 2) {
      return res.status(400).json({ success: false, message: 'Họ và tên phải có ít nhất 2 ký tự' });
    }

    // Kiểm tra định dạng email
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ success: false, message: 'Địa chỉ Email không hợp lệ' });
    }

    // Kiểm tra định dạng số điện thoại Việt Nam (10 chữ số, đầu 03, 05, 07, 08, 09)
    const phoneRegex = /^0[35789][0-9]{8}$/;
    if (!phoneRegex.test(cleanPhone)) {
      return res.status(400).json({ success: false, message: 'Số điện thoại không hợp lệ (cần 10 chữ số bắt đầu bằng 03, 05, 07, 08, 09)' });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ success: false, message: 'Mật khẩu phải có ít nhất 6 ký tự' });
    }

    const existingEmail = await Account.findOne({ email: cleanEmail });
    if (existingEmail) {
      return res.status(400).json({ success: false, message: 'Thư điện tử này đã được đăng ký' });
    }

    const existingPhone = await Account.findOne({ phone: cleanPhone });
    if (existingPhone) {
      return res.status(400).json({ success: false, message: 'Đường dây liên lạc (SĐT) này đã được sử dụng' });
    }

    const newAccount = new Account({
      fullName: cleanFullName,
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

// 2.1 API Lấy lại mật khẩu thật sau khi chơi mini game giải trí
app.post('/api/auth/forgot-password-reveal', async (req, res) => {
  try {
    const { emailOrPhone } = req.body;
    if (!emailOrPhone) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp Email, Số điện thoại hoặc Tên đăng nhập' });
    }

    const cleanInput = String(emailOrPhone).trim();
    const normalizedPhone = cleanInput.replace(/[\s.\-()]/g, '').replace(/^\+84/, '0');
    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const orConditions = [
      { email: cleanInput.toLowerCase() },
      { phone: cleanInput },
      { phone: normalizedPhone },
      { fullName: new RegExp('^' + escapeRegex(cleanInput) + '$', 'i') },
      { email: new RegExp('^' + escapeRegex(cleanInput) + '@', 'i') }
    ];

    const account = await Account.findOne({ $or: orConditions });

    if (!account) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản với thông tin đã nhập' });
    }

    res.status(200).json({
      success: true,
      message: 'Lấy mật khẩu thành công',
      data: {
        fullName: account.fullName,
        email: account.email,
        phone: account.phone,
        password: account.passwordHash || '123456'
      }
    });
  } catch (error) {
    console.error('Lỗi lấy lại mật khẩu:', error);
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

// 3.2. API Lưu hoặc Cập nhật địa chỉ nhận hàng của khách hàng (UC-C06, UC-C07)
app.post('/api/accounts/address', async (req, res) => {
  try {
    const { accountId, recipientName, phone, province, ward, detail, isDefault } = req.body;
    if (!accountId || !recipientName || !phone || !province || !ward || !detail) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đầy đủ thông tin địa chỉ nhận hàng' });
    }

    const account = await Account.findById(accountId);
    if (!account) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản' });
    }

    if (!Array.isArray(account.addresses)) account.addresses = [];

    const newAddr = {
      recipientName: recipientName.trim(),
      phone: phone.trim().replace(/[\s.\-()]/g, ''),
      province: province.trim(),
      ward: ward.trim(),
      detail: detail.trim(),
      isDefault: isDefault !== false,
    };

    if (newAddr.isDefault) {
      account.addresses.forEach(a => { a.isDefault = false; });
    }

    const existingIdx = account.addresses.findIndex(a =>
      (a.detail || '').trim().toLowerCase() === newAddr.detail.toLowerCase() &&
      (a.ward || '').trim().toLowerCase() === newAddr.ward.toLowerCase() &&
      (a.province || '').trim().toLowerCase() === newAddr.province.toLowerCase()
    );

    if (existingIdx > -1) {
      account.addresses[existingIdx] = newAddr;
      const matched = account.addresses.splice(existingIdx, 1)[0];
      account.addresses.unshift(matched);
    } else {
      account.addresses.unshift(newAddr);
    }

    await account.save();

    const accountData = account.toObject();
    delete accountData.passwordHash;

    res.status(200).json({
      success: true,
      message: 'Đã lưu địa chỉ nhận hàng thành công',
      data: account.addresses,
      user: accountData
    });
  } catch (error) {
    console.error('Lỗi lưu địa chỉ:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3.3. API Lấy danh sách địa chỉ nhận hàng của khách hàng
app.get('/api/accounts/addresses/:accountId', async (req, res) => {
  try {
    const account = await Account.findById(req.params.accountId).select('addresses');
    if (!account) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản' });
    }
    res.status(200).json({ success: true, data: account.addresses || [] });
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

    const targetProdId = String(productId);
    const index = account.wishlist.findIndex(id => String(id) === targetProdId);
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

// Phân hệ Quản lý Đơn hàng phía Admin (UC-A03 - TV3)
const ordersRoutes = require('./modules/orders/orders.routes');
const ordersService = require('./modules/orders/orders.service');
app.use('/api/orders', ordersRoutes);

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

// 4. API Chỉnh sửa thông tin khách hàng (Họ tên, email, SĐT, trạng thái, địa chỉ)
app.put('/api/admin/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'ID khách hàng không hợp lệ' });
    }

    const customer = await Account.findById(id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy khách hàng' });
    }

    const { fullName, email, phone, status, address, addresses } = req.body;

    // Validate Họ tên
    if (fullName !== undefined) {
      if (!fullName || !fullName.trim()) {
        return res.status(400).json({ success: false, message: 'Họ và tên khách hàng không được để trống' });
      }
      customer.fullName = fullName.trim();
    }

    // Validate Email
    if (email !== undefined) {
      const cleanEmail = email.trim().toLowerCase();
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(cleanEmail)) {
        return res.status(400).json({ success: false, message: 'Địa chỉ Email không hợp lệ' });
      }
      const duplicateEmail = await Account.findOne({ email: cleanEmail, _id: { $ne: id } });
      if (duplicateEmail) {
        return res.status(400).json({ success: false, message: 'Email này đã được sử dụng bởi một tài khoản khác' });
      }
      customer.email = cleanEmail;
    }

    // Validate Số điện thoại
    if (phone !== undefined) {
      const cleanPhone = phone.trim().replace(/[\s.\-()]/g, '');
      const phoneRegex = /^0[35789][0-9]{8}$/;
      if (!phoneRegex.test(cleanPhone)) {
        return res.status(400).json({ success: false, message: 'Số điện thoại không hợp lệ (cần 10 chữ số bắt đầu bằng 03, 05, 07, 08, 09)' });
      }
      const duplicatePhone = await Account.findOne({ phone: cleanPhone, _id: { $ne: id } });
      if (duplicatePhone) {
        return res.status(400).json({ success: false, message: 'Số điện thoại này đã được sử dụng bởi một tài khoản khác' });
      }
      customer.phone = cleanPhone;
    }

    // Validate Trạng thái
    if (status !== undefined) {
      if (!['active', 'blocked', 'inactive'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ (phải là active, blocked, hoặc inactive)' });
      }
      customer.status = status;
    }

    // Cập nhật địa chỉ nhận hàng
    if (Array.isArray(addresses)) {
      customer.addresses = addresses;
    } else if (address && (address.detail || address.province || address.ward)) {
      if (!Array.isArray(customer.addresses)) {
        customer.addresses = [];
      }
      const newAddr = {
        recipientName: (address.recipientName || customer.fullName || '').trim(),
        phone: (address.phone || customer.phone || '').trim().replace(/[\s.\-()]/g, ''),
        province: (address.province || '').trim(),
        ward: (address.ward || '').trim(),
        detail: (address.detail || '').trim(),
        isDefault: address.isDefault !== false,
      };

      if (customer.addresses.length > 0) {
        customer.addresses[0] = { ...(customer.addresses[0].toObject ? customer.addresses[0].toObject() : customer.addresses[0]), ...newAddr };
      } else {
        customer.addresses.push(newAddr);
      }
    }

    await customer.save();

    // Thống kê đơn hàng và tổng tiền
    const orders = await Order.find({ accountId: customer._id }).lean();
    const totalSpent = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    const customerData = customer.toObject();
    delete customerData.passwordHash;
    customerData.orderCount = orders.length;
    customerData.totalSpent = totalSpent;
    customerData.wishlistCount = (customerData.wishlist || []).length;

    res.status(200).json({
      success: true,
      message: 'Cập nhật thông tin khách hàng thành công!',
      data: customerData
    });
  } catch (error) {
    console.error('Lỗi cập nhật thông tin khách hàng:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 5. API Xóa khách hàng (Admin Delete Customer)
app.delete('/api/admin/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'ID khách hàng không hợp lệ' });
    }

    const customer = await Account.findById(id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy khách hàng' });
    }

    if (customer.role === 'admin') {
      return res.status(403).json({ success: false, message: 'Không thể xóa tài khoản Quản trị viên' });
    }

    const orderCount = await Order.countDocuments({ accountId: id });
    const force = req.query.force === 'true' || req.body?.force === true;

    if (orderCount > 0 && !force) {
      return res.status(400).json({
        success: false,
        hasOrders: true,
        orderCount,
        message: `Khách hàng này đã có ${orderCount} đơn hàng trong hệ thống. Để bảo tồn lịch sử giao dịch và kế toán, bạn có thể chuyển trạng thái sang "Tạm ngưng" hoặc chọn xác nhận xóa bắt buộc.`
      });
    }

    // Xóa giỏ hàng liên kết
    await Cart.deleteMany({ accountId: id });

    // Xóa tài khoản
    await Account.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: `Đã xóa khách hàng "${customer.fullName}" khỏi hệ thống thành công!`
    });
  } catch (error) {
    console.error('Lỗi khi xóa khách hàng:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// THÀNH VIÊN 5: MODULE ĐỔI TRẢ, ĐÁNH GIÁ & DASHBOARD (UC-C08, UC-A05, UC-A06)
// ==========================================
const Review = require('./models/Review');
const ReturnRequest = require('./models/ReturnRequest');

// --- I. ĐÁNH GIÁ SẢN PHẨM (UC-C08) ---
// 1. Tạo đánh giá mới (Chỉ cho đánh giá 1 lần, kiểm tra đơn hoàn tất nếu có orderId)
app.post('/api/reviews', async (req, res) => {
  try {
    let { accountId, productId, orderId, rating, comment } = req.body;

    if (!productId || !rating) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp productId và số sao rating' });
    }

    if (!accountId) {
      accountId = 'guest_customer';
    }

    // Tìm và chuẩn hóa account
    let resolvedAccountId = accountId;
    let customerName = req.body.customerName || '';
    if (mongoose.Types.ObjectId.isValid(accountId)) {
      const acc = await Account.findById(accountId).lean();
      if (acc) {
        resolvedAccountId = acc._id;
        customerName = customerName || acc.fullName || acc.email;
      }
    } else {
      const acc = await Account.findOne({ $or: [{ email: accountId }, { phone: accountId }] }).lean();
      if (acc) {
        resolvedAccountId = acc._id;
        customerName = customerName || acc.fullName || acc.email;
      }
    }

    // Tìm và chuẩn hóa product
    let resolvedProductId = productId;
    let foundProduct = null;
    if (mongoose.Types.ObjectId.isValid(productId)) {
      foundProduct = await Product.findById(productId);
    }
    if (!foundProduct) {
      foundProduct = await Product.findOne({
        $or: [
          { sku: productId },
          { name: productId },
          { name: new RegExp('^' + String(productId).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }
        ]
      });
    }
    if (foundProduct) {
      resolvedProductId = foundProduct._id;
    }

    // Chỉ cho phép đánh giá nếu sản phẩm đã được mua trong đơn hàng hoàn tất
    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Chỉ có hàng nào quý khách đã mua và hoàn tất nhận hàng thì mới được gửi đánh giá.'
      });
    }

    let resolvedOrderId = orderId;
    let order = null;
    if (mongoose.Types.ObjectId.isValid(orderId)) {
      order = await Order.findById(orderId).lean();
    } else {
      order = await Order.findOne({ orderCode: orderId }).lean();
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin đơn hàng đã mua tương ứng để đánh giá.'
      });
    }

    resolvedOrderId = order._id;
    const status = (order.orderStatus || order.status || '').toLowerCase();
    if (status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Chỉ có tác phẩm trong đơn hàng đã hoàn tất giao hàng (Completed) mới được đánh giá.'
      });
    }

    // Kiểm tra tác phẩm có thuộc đơn hàng này không
    const items = order.items || [];
    const hasProduct = items.some(it => {
      const itProd = it.productId;
      const itId = (itProd && (itProd._id || itProd.id)) ? (itProd._id || itProd.id).toString() : String(itProd || '');
      const itName = it.productName || '';
      return itId === String(resolvedProductId) || itId === String(productId) || (foundProduct && foundProduct.sku && itId === foundProduct.sku) || (foundProduct && itName === foundProduct.name);
    });

    if (!hasProduct) {
      return res.status(400).json({
        success: false,
        message: 'Tác phẩm này không thuộc đơn hàng của quý khách.'
      });
    }

    // KIỂM TRA CHỈ CHO ĐÁNH GIÁ 1 LẦN CHO MỖI LẦN MUA (Theo orderId)
    // Khi người dùng mua sản phẩm đó lần thứ 2 (ở đơn hàng mới), orderId mới sẽ cho phép gửi thêm 1 đánh giá nữa
    const existingReview = await Review.findOne({
      orderId: resolvedOrderId,
      $or: [
        { productId: resolvedProductId },
        { productId: resolvedProductId.toString() },
        { productId: productId },
        { 'productId._id': resolvedProductId }
      ]
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        alreadyReviewed: true,
        message: 'Đơn hàng này của quý khách đã được gửi đánh giá cho tác phẩm này rồi. Khi nào quý khách mua tác phẩm đó lần thứ 2 thì mới được đánh giá thêm 1 lần nữa.'
      });
    }

    const newReview = new Review({
      accountId: resolvedAccountId,
      productId: resolvedProductId,
      orderId: resolvedOrderId || null,
      customerName: customerName || 'Nhà Sưu Tầm',
      rating: Number(rating),
      comment: (comment || '').trim()
    });

    await newReview.save();

    // Cập nhật lại sao trung bình & số lượng đánh giá trên sản phẩm
    if (foundProduct) {
      const allReviewsForProd = await Review.find({
        $or: [
          { productId: foundProduct._id },
          { productId: foundProduct._id.toString() },
          { 'productId._id': foundProduct._id },
          { 'productId._id': foundProduct._id.toString() },
          { productId: foundProduct.sku }
        ]
      }).lean();
      const count = allReviewsForProd.length;
      const avg = count > 0 ? (allReviewsForProd.reduce((sum, r) => sum + (Number(r.rating) || 5), 0) / count) : Number(rating);
      const roundedAvg = Math.round(avg * 10) / 10;
      await Product.findByIdAndUpdate(foundProduct._id, {
        averageRating: roundedAvg,
        reviewCount: count
      });
    }

    res.status(201).json({ success: true, message: 'Gửi đánh giá thành công', data: newReview });
  } catch (error) {
    console.error('Lỗi gửi đánh giá:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. Lấy danh sách đánh giá theo sản phẩm + tính sao trung bình (hiển thị đầy đủ ở product-detail)
app.get('/api/reviews/product/:productId', async (req, res) => {
  try {
    const pId = req.params.productId;
    let queryConditions = [
      { productId: pId },
      { 'productId._id': pId },
      { product: pId },
      { 'product._id': pId }
    ];
    if (mongoose.Types.ObjectId.isValid(pId)) {
      const objId = new mongoose.Types.ObjectId(pId);
      queryConditions.push({ productId: objId });
      queryConditions.push({ 'productId._id': objId });
      queryConditions.push({ product: objId });
      queryConditions.push({ 'product._id': objId });
    }
    const prod = mongoose.Types.ObjectId.isValid(pId)
      ? await Product.findById(pId).lean()
      : await Product.findOne({ $or: [{ sku: pId }, { name: pId }] }).lean();

    if (prod) {
      const pObjId = prod._id;
      const pStrId = prod._id.toString();
      queryConditions.push({ productId: pObjId });
      queryConditions.push({ productId: pStrId });
      queryConditions.push({ 'productId._id': pObjId });
      queryConditions.push({ 'productId._id': pStrId });
      queryConditions.push({ product: pObjId });
      queryConditions.push({ product: pStrId });
      if (prod.sku) {
        queryConditions.push({ productId: prod.sku });
        queryConditions.push({ 'productId.sku': prod.sku });
        queryConditions.push({ product: prod.sku });
      }
      if (prod.name) {
        queryConditions.push({ 'productId.name': prod.name });
      }
    }

    const rawReviews = await Review.find({ $or: queryConditions })
      .populate({ path: 'accountId', select: 'fullName email phone', strictPopulate: false })
      .sort({ createdAt: -1 })
      .lean();

    const reviews = rawReviews.map(r => {
      const customerName = r.customerName || (r.accountId && (r.accountId.fullName || r.accountId.name || r.accountId.email)) || 'Nhà Sưu Tầm';
      const rating = Number(r.rating || 5);
      return {
        _id: r._id,
        productId: r.productId || r.product,
        orderId: r.orderId || r.order,
        rating,
        comment: r.comment || '',
        customerName,
        createdAt: r.createdAt || new Date(),
        images: r.images || []
      };
    });

    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0
      ? (reviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0) / totalReviews).toFixed(1)
      : '0.0';

    const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(r => {
      const star = Math.min(5, Math.max(1, Math.round(Number(r.rating) || 5)));
      breakdown[star] = (breakdown[star] || 0) + 1;
    });

    // Cập nhật lại số sao trung bình vào Product nếu có
    if (prod) {
      await Product.findByIdAndUpdate(prod._id, {
        averageRating: Number(averageRating),
        reviewCount: totalReviews
      });
    }

    res.status(200).json({
      success: true,
      data: reviews,
      stats: {
        totalReviews,
        averageRating: Number(averageRating),
        breakdown
      }
    });
  } catch (error) {
    console.error('Lỗi lấy đánh giá sản phẩm:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3. Lấy toàn bộ đánh giá (quản trị)
app.get('/api/reviews', async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate('accountId', 'fullName email')
      .populate('productId', 'name image price')
      .sort({ createdAt: -1 })
      .lean();
    res.status(200).json({ success: true, data: reviews });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- II. YÊU CẦU ĐỔI / TRẢ HÀNG (UC-A05) ---
// 1. Khách gửi yêu cầu đổi trả (Bắt buộc có lý do chi tiết & đính kèm ảnh/video minh chứng)
app.post('/api/returns', async (req, res) => {
  try {
    const { orderId, accountId, type, reason, evidenceImages, items } = req.body;

    if (!orderId || !accountId) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp mã đơn hàng và tài khoản' });
    }

    // Bắt buộc nhập lý do cụ thể (không được để trống hoặc chỉ ghi 'Lý do khác')
    const trimmedReason = (reason || '').trim();
    if (!trimmedReason || trimmedReason === 'Lý do khác' || trimmedReason === 'Khác' || trimmedReason.startsWith('Lý do khác:') && trimmedReason.replace('Lý do khác:', '').trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập chi tiết lý do đề nghị đổi trả tác phẩm' });
    }

    // Bắt buộc đính kèm ảnh/video minh chứng
    const hasEvidence = Array.isArray(evidenceImages) && evidenceImages.length > 0 && evidenceImages.some(img => img && String(img).trim().length > 0);
    if (!hasEvidence) {
      return res.status(400).json({ success: false, message: 'Bắt buộc đính kèm ít nhất 1 hình ảnh hoặc video minh chứng để gửi yêu cầu đổi trả' });
    }

    let resolvedOrderId = orderId;
    let order = null;
    if (mongoose.Types.ObjectId.isValid(orderId)) {
      order = await Order.findById(orderId).lean();
    } else {
      order = await Order.findOne({ orderCode: orderId }).lean();
      if (order) resolvedOrderId = order._id;
    }

    let returnItems = items;
    if (!returnItems || !returnItems.length) {
      if (order && order.items && order.items.length) {
        returnItems = order.items.map(it => ({
          productId: it.productId || it.product,
          quantity: it.quantity || 1,
          reason: trimmedReason
        }));
      } else {
        const sampleProd = await Product.findOne().lean();
        returnItems = [{ productId: sampleProd ? sampleProd._id : '670000000000000000000001', quantity: 1, reason: trimmedReason }];
      }
    }

    const newReturn = new ReturnRequest({
      orderId: resolvedOrderId,
      accountId,
      type: type || 'return',
      reason: trimmedReason,
      evidenceImages: evidenceImages || [],
      items: returnItems,
      status: 'pending'
    });

    await newReturn.save();

    // Liên kết với Đơn hàng: Cập nhật returnStatus sang 'requested'
    if (resolvedOrderId && mongoose.Types.ObjectId.isValid(resolvedOrderId)) {
      await Order.updateOne(
        { _id: resolvedOrderId },
        { $set: { returnStatus: 'requested', returnRequestId: newReturn._id } }
      );
    }

    res.status(201).json({ success: true, message: 'Đã tiếp nhận yêu cầu đổi trả thành công', data: newReturn });
  } catch (error) {
    console.error('Lỗi gửi yêu cầu đổi trả:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. Lấy danh sách đổi trả của một tài khoản khách hàng
app.get('/api/returns/user/:userId', async (req, res) => {
  try {
    const returns = await ReturnRequest.find({ accountId: req.params.userId })
      .populate('orderId')
      .populate('items.productId')
      .sort({ createdAt: -1 })
      .lean();
    res.status(200).json({ success: true, data: returns });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3. Lấy tất cả yêu cầu đổi trả (phía Admin - UC-A05)
app.get('/api/returns', async (req, res) => {
  try {
    const { status, type, search } = req.query;
    const filter = {};

    if (status && status !== 'all') {
      filter.status = status;
    }
    if (type && type !== 'all') {
      filter.type = type;
    }

    let returns = await ReturnRequest.find(filter)
      .populate('accountId', 'fullName email phone')
      .populate('orderId')
      .populate('items.productId')
      .populate('processedBy', 'fullName email')
      .sort({ createdAt: -1 })
      .lean();

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      returns = returns.filter(r => {
        const orderCode = (r.orderId?.orderCode || '').toLowerCase();
        const customerName = (r.accountId?.fullName || '').toLowerCase();
        const customerPhone = (r.accountId?.phone || '').toLowerCase();
        const reason = (r.reason || '').toLowerCase();
        const idStr = (r._id ? r._id.toString() : '').toLowerCase();
        return orderCode.includes(q) || customerName.includes(q) || customerPhone.includes(q) || reason.includes(q) || idStr.includes(q);
      });
    }

    res.status(200).json({ success: true, count: returns.length, data: returns });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 4. Admin duyệt hoặc từ chối yêu cầu đổi trả (UC-A05)
app.put('/api/returns/:id/status', async (req, res) => {
  try {
    const { status, rejectionReason, processedBy } = req.body;

    if (!status || !['pending', 'approved', 'rejected', 'completed'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Trạng thái đổi trả không hợp lệ' });
    }

    if (status === 'rejected' && (!rejectionReason || !rejectionReason.trim())) {
      return res.status(400).json({ success: false, message: 'Bắt buộc phải nhập lý do từ chối (E1)' });
    }

    const returnReq = await ReturnRequest.findById(req.params.id);
    if (!returnReq) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu đổi trả' });
    }

    // Kiểm tra ràng buộc duyệt đổi trả (Lỗi 4): Chỉ duyệt cho đơn đã COMPLETED & chưa hoàn đủ tiền
    let linkedOrder = null;
    if (status === 'approved' && returnReq.orderId) {
      linkedOrder = await Order.findById(returnReq.orderId);
      if (linkedOrder) {
        const orderCurrentStatus = (linkedOrder.orderStatus || linkedOrder.status || '').toLowerCase();
        if (orderCurrentStatus !== 'completed') {
          return res.status(400).json({
            success: false,
            message: 'Chỉ có thể duyệt đổi trả / hoàn tiền cho đơn hàng đã hoàn tất (Completed)',
          });
        }
        if (linkedOrder.refundedAmount && linkedOrder.refundedAmount >= linkedOrder.totalAmount) {
          return res.status(400).json({
            success: false,
            message: 'Đơn hàng này đã được hoàn tiền đầy đủ trước đó (chặn hoàn trùng)',
          });
        }
      }
    }

    returnReq.status = status;
    returnReq.processedAt = new Date();
    if (processedBy && mongoose.Types.ObjectId.isValid(processedBy)) {
      returnReq.processedBy = processedBy;
    }
    if (status === 'rejected') {
      returnReq.rejectionReason = rejectionReason.trim();
    }

    // Nếu Duyệt đổi trả: Hoàn lại số lượng tồn kho (stock + quantity)
    if (status === 'approved') {
      for (const item of returnReq.items) {
        if (item.productId) {
          await Product.findByIdAndUpdate(item.productId, { $inc: { stock: item.quantity || 1 } });
        }
      }

      // Tính toán số tiền hoàn tương ứng với các mặt hàng đổi/trả
      let refundAmount = 0;
      if (linkedOrder && Array.isArray(linkedOrder.items)) {
        for (const retItem of returnReq.items) {
          const matched = linkedOrder.items.find(
            it => String(it.productId?._id || it.productId) === String(retItem.productId?._id || retItem.productId)
          );
          if (matched) {
            const unitPrice = Number(matched.unitPrice || matched.price || 0);
            refundAmount += unitPrice * Number(retItem.quantity || 1);
          }
        }
      }
      if (!refundAmount || refundAmount <= 0) {
        refundAmount = linkedOrder ? linkedOrder.totalAmount : 0;
      }

      // Gọi MỘT hàm dùng chung do TV3 viết trong orders.service (Lỗi 4):
      if (returnReq.orderId) {
        await ordersService.markOrderReturned(returnReq.orderId, {
          amount: refundAmount,
          returnRequestId: returnReq._id,
          note: 'Duyệt yêu cầu đổi trả từ Admin - Khấu trừ doanh thu thuần',
          adminUser: req.admin || { fullName: 'Admin' },
        });
      }
    } else if (status === 'rejected') {
      if (returnReq.orderId) {
        await Order.updateOne(
          { _id: returnReq.orderId },
          { $set: { returnStatus: 'rejected' } }
        );
      }
    }

    await returnReq.save();
    res.status(200).json({
      success: true,
      message: `Đã ${status === 'approved' ? 'duyệt' : (status === 'rejected' ? 'từ chối' : 'cập nhật')} yêu cầu đổi trả`,
      data: returnReq
    });
  } catch (error) {
    console.error('Lỗi cập nhật trạng thái đổi trả:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- III. DASHBOARD THỐNG KÊ QUẢN TRỊ (UC-A06) ---
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    // 1. Doanh thu thực: Sử dụng hàm dùng chung ordersService.calculateNetRevenue() (Lỗi 4)
    const totalRevenue = await ordersService.calculateNetRevenue();

    // 2. Đơn chờ xử lý: số Order có status / orderStatus === 'pending'
    const pendingOrdersCount = await Order.countDocuments({
      $or: [
        { status: { $in: ['pending', 'PENDING'] } },
        { orderStatus: { $in: ['pending', 'PENDING'] } }
      ]
    });

    // 3. Cảnh báo hết hàng: số Product có stock <= 5 (Đồng bộ với catalog sản phẩm hợp lệ)
    const verifiedProductFilter = getVerifiedCatalogProductFilter();
    const lowStockCount = await Product.countDocuments({
      ...verifiedProductFilter,
      stock: { $lte: 5 }
    });

    // 4. Tổng sản phẩm (Đồng bộ với 33 sản phẩm hợp lệ trong Quản lý sản phẩm)
    const totalProductsCount = await Product.countDocuments(verifiedProductFilter);

    // 5. Tổng khách hàng: số Account có role === 'customer'
    const totalCustomersCount = await Account.countDocuments({ role: 'customer' });

    // 6. Yêu cầu đổi trả chờ duyệt
    const pendingReturnsCount = await ReturnRequest.countDocuments({ status: 'pending' });

    // 7. Danh sách 5 đơn hàng chờ xác nhận gần đây nhất (Recent Orders)
    const recentOrders = await Order.find({
      $or: [
        { status: { $in: ['pending', 'PENDING'] } },
        { orderStatus: { $in: ['pending', 'PENDING'] } }
      ]
    })
      .populate('accountId', 'fullName phone email')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // 8. Danh sách sản phẩm sắp hết hàng (Low Stock Products <= 5) sắp xếp tăng dần theo tồn kho
    const lowStockRaw = await Product.find({
      ...verifiedProductFilter,
      stock: { $lte: 5 }
    })
      .select('name sku stock price image images glazeColor collectionName')
      .sort({ stock: 1 })
      .limit(10)
      .lean();

    const lowStockProducts = lowStockRaw.map(p => ({
      _id: p._id,
      name: p.name,
      sku: p.sku || 'SKU-' + String(p._id).slice(-4).toUpperCase(),
      glazeColor: p.glazeColor || p.collectionName || 'Men truyền thống Bát Tràng',
      stock: typeof p.stock === 'number' ? p.stock : 0,
      price: p.price || 0,
      image: p.image || (Array.isArray(p.images) && p.images[0]) || 'assets/img/logo.png',
    }));

    // 9. Tính toán Biểu Đồ 7 Ngày Thực Tế & Báo Cáo Tuần Chi Tiết
    const now = new Date();
    const daysLabelMap = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const revenueDays = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayLabel = daysLabelMap[d.getDay()];
      revenueDays.push({
        date: dateStr,
        dayLabel,
        fullDateLabel: d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        menLamAmount: 0,
        saThachAmount: 0,
        totalAmount: 0,
        menLamHeightPercent: 10,
        saThachHeightPercent: 10,
        refundedAmount: 0,
        cancelledOrders: 0,
        cancelledAmount: 0,
        returnedOrders: 0,
        paidOrders: 0,
        isPeak: false,
      });
    }

    const start7Days = new Date(revenueDays[0].date + 'T00:00:00.000Z');
    const ordersIn7Days = await Order.find({ createdAt: { $gte: start7Days } })
      .populate('accountId', 'fullName phone')
      .lean();

    let maxDayRevenue = 0;
    let peakIndex = -1;
    let highestSingleOrder = null;
    let weekTotalGross = 0;
    let weekTotalNet = 0;
    let weekTotalRefund = 0;
    let weekTotalCancelled = 0;
    let weekPaidOrdersCount = 0;

    ordersIn7Days.forEach(o => {
      const dStr = o.createdAt ? new Date(o.createdAt).toISOString().slice(0, 10) : '';
      const dayBucket = revenueDays.find(r => r.date === dStr);
      if (!dayBucket) return;

      const rawStatus = (o.orderStatus || o.status || 'pending').toLowerCase();
      const payment = (o.paymentStatus || '').toLowerCase();
      const total = Number(o.totalAmount || 0);
      let refunded = Number(o.refundedAmount || 0);

      const isCancelled = rawStatus === 'cancelled';
      const isPaid = ['paid', 'partially_refunded'].includes(payment);

      // TIÊU CHÍ KẾ TOÁN DOANH THU THUẦN:
      // 1. Chỉ khi đơn ĐÃ THANH TOÁN (isPaid) mới tính vào doanh thu bán hàng
      if (isPaid) {
        dayBucket.grossRevenue = (dayBucket.grossRevenue || 0) + total;
        weekTotalGross += total;

        if (isCancelled) {
          // 2. Đã thanh toán nhưng hủy đơn -> ghi nhận vào các đơn giảm trừ doanh thu diện hủy hàng
          dayBucket.cancelledOrders++;
          dayBucket.cancelledAmount += total;
          weekTotalCancelled += total;
        } else if (o.returnStatus === 'approved' || refunded > 0) {
          // 4. Khách nhận hàng muốn đổi/trả -> ghi nhận vào hàng hoàn trả giảm trừ doanh thu
          dayBucket.returnedOrders++;
          if (!refunded || refunded <= 0) refunded = total;
          dayBucket.refundedAmount += refunded;
          weekTotalRefund += refunded;
        } else {
          // Đơn hợp lệ đã thanh toán thành công
          dayBucket.paidOrders++;
          weekPaidOrdersCount++;
        }

        if (!highestSingleOrder || total > highestSingleOrder.amount) {
          const firstItem = Array.isArray(o.items) && o.items[0];
          highestSingleOrder = {
            orderCode: o.orderCode,
            amount: total,
            productName: firstItem ? (firstItem.productName || firstItem.name) : 'Tác phẩm Gốm Sứ',
            customerName: o.shippingAddress?.recipientName || o.accountId?.fullName || 'Khách hàng',
          };
        }
      } else {
        // 3. Đơn CHƯA THANH TOÁN: Nếu khách hàng đặt nhưng chưa thanh toán đã hủy -> ĐỪNG ghi nhận nó vào các khoản giảm trừ doanh thu
        if (isCancelled) {
          dayBucket.unpaidCancelledOrders = (dayBucket.unpaidCancelledOrders || 0) + 1;
          // Tuyệt đối KHÔNG cộng vào dayBucket.cancelledAmount và KHÔNG cộng vào weekTotalCancelled!
        }
      }
    });

    // Tính toán lại Doanh Thu Thuần và Các Khoản Giảm Trừ cho từng ngày (2 Cột trực quan):
    // Cột 1: Doanh Thu Thuần = Tiền thu được (đã thanh toán) - Hàng hoàn trả - Đơn hủy (đã thanh toán)
    // Cột 2: Các Khoản Giảm Trừ Doanh Thu = Hàng hoàn trả + Đơn hủy (đã thanh toán)
    revenueDays.forEach(d => {
      const gross = d.grossRevenue || 0;
      const ref = d.refundedAmount || 0;
      const can = d.cancelledAmount || 0;
      const dailyNet = Math.max(0, gross - ref - can);
      const deductions = ref + can;

      d.totalAmount = dailyNet;
      d.netRevenue = dailyNet;
      d.deductionAmount = deductions;
      // Đồng bộ menLamAmount (Doanh thu thuần) & saThachAmount (Giảm trừ)
      d.menLamAmount = dailyNet;
      d.saThachAmount = deductions;
    });

    weekTotalNet = Math.max(0, weekTotalGross - weekTotalRefund - weekTotalCancelled);

    // Tìm ngày đỉnh cao nhất theo Doanh thu thuần hoặc Giảm trừ để scale chiều cao 2 cột
    let maxChartValue = 0;
    revenueDays.forEach((d, idx) => {
      if (d.totalAmount > maxDayRevenue) {
        maxDayRevenue = d.totalAmount;
        peakIndex = idx;
      }
      if (d.totalAmount > maxChartValue) maxChartValue = d.totalAmount;
      if (d.deductionAmount > maxChartValue) maxChartValue = d.deductionAmount;
    });

    if (peakIndex >= 0 && maxDayRevenue > 0) {
      revenueDays[peakIndex].isPeak = true;
    }

    const chartCeiling = Math.max(maxChartValue, 1000000);
    revenueDays.forEach(d => {
      if (chartCeiling > 0) {
        // Cột 1: Doanh Thu Thuần
        d.netHeightPercent = d.totalAmount > 0 ? Math.max(12, Math.min(95, Math.round((d.totalAmount / chartCeiling) * 90))) : 8;
        // Cột 2: Các Khoản Giảm Trừ Doanh Thu
        d.deductionHeightPercent = d.deductionAmount > 0 ? Math.max(12, Math.min(95, Math.round((d.deductionAmount / chartCeiling) * 90))) : 8;

        // Giữ tương thích ngược
        d.menLamHeightPercent = d.netHeightPercent;
        d.saThachHeightPercent = d.deductionHeightPercent;
      }
    });

    // Cấu trúc báo cáo tuần chi tiết
    const weeklyReport = {
      dateRangeLabel: `${revenueDays[0].fullDateLabel} – ${revenueDays[6].fullDateLabel}`,
      totalGrossRevenue: weekTotalGross,
      totalNetRevenue: weekTotalNet,
      totalRefundedAmount: weekTotalRefund,
      totalCancelledAmount: weekTotalCancelled,
      paidOrdersCount: weekPaidOrdersCount,
      peakDayLabel: peakIndex >= 0 ? `${revenueDays[peakIndex].dayLabel} (${revenueDays[peakIndex].fullDateLabel})` : 'Chưa có',
      peakDayRevenue: maxDayRevenue,
      highestOrder: highestSingleOrder,
      dailyBreakdown: revenueDays.map(d => ({
        date: d.date,
        dayLabel: d.dayLabel,
        fullDateLabel: d.fullDateLabel,
        grossRevenue: d.grossRevenue || d.totalAmount + d.refundedAmount,
        netRevenue: d.totalAmount,
        refundedAmount: d.refundedAmount,
        cancelledOrders: d.cancelledOrders,
        cancelledAmount: d.cancelledAmount,
        paidOrders: d.paidOrders,
        isPeak: !!d.isPeak,
      })),
    };

    res.status(200).json({
      success: true,
      data: {
        totalRevenue: totalRevenue,
        totalProductsCount: totalProductsCount || 125,
        pendingOrdersCount: typeof pendingOrdersCount === 'number' ? pendingOrdersCount : 0,
        lowStockCount: lowStockCount || lowStockProducts.length,
        totalCustomersCount: totalCustomersCount || 1250,
        pendingReturnsCount: pendingReturnsCount || 14,
        recentOrders,
        lowStockProducts,
        revenueDays,
        weeklyReport,
      }
    });
  } catch (error) {
    console.error('Lỗi lấy thống kê dashboard:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// THÀNH VIÊN 4: CHATBOT TƯ VẤN GỐM MỘC (UC-C09)
// ==========================================
function getLocalCeramicReply(text) {
  const raw = (text || '').toLowerCase().trim();
  const norm = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');

  // 1. Địa chỉ, Showroom, Xưởng, Bản đồ, Giờ mở cửa, Đến thăm, Đỗ xe
  if (norm.includes('dia chi') || norm.includes('o dau') || norm.includes('showroom') || norm.includes('cua hang') || norm.includes('den xem') || norm.includes('gio mo cua') || norm.includes('vi tri') || norm.includes('ban do') || norm.includes('do xe') || norm.includes('lo bau')) {
    return 'Dạ, Làng Gốm Thanh Xuân trân trọng đón tiếp quý khách tại 2 không gian di sản:\n\n• **Cơ sở 1 (Lò Bầu Di Sản & Xưởng):** Thôn 1 Giang Cao, Bát Tràng, Gia Lâm, HN *(có bãi đỗ ô tô miễn phí, trải nghiệm vuốt nặn gốm lò củi 1.380°C)*.\n• **Cơ sở 2 (Bảo Phủ Giám Tuyển):** Tầng 2, 24 Tràng Tiền, Hoàn Kiếm, HN *(thưởng trà & ngắm các ngự tác độc bản)*.\n\n*Giờ mở cửa: 08:30 – 21:00 hàng ngày (Hotline: 1800 1705)*. Quý khách dự định ghé thăm cơ sở nào để em chuẩn bị đón tiếp chu đáo ạ?';
  }

  // 2. Sản phẩm của shop / Có những loại gì / Danh mục mặt hàng
  if (norm.includes('san pham') || norm.includes('co nhung gi') || norm.includes('ban gi') || norm.includes('danh muc') || norm.includes('loai nao') || norm.includes('mat hang') || norm.includes('bo do an') || norm.includes('am chen') || norm.includes('bat dia')) {
    return 'Dạ, xưởng hiện có 4 dòng sản phẩm gốm sứ nghệ thuật tiêu biểu:\n\n• **Bộ đồ ăn cao cấp:** Bát đĩa Jasmine Thạch Vân, viền Chỉ Vàng (set 9 – 22 món, chén cơm từ 63k).\n• **Bộ ấm chén trà đạo:** Bộ trà Camellia, ấm men rạn bọc đồng, tách hoàng gia có nắp (380k).\n• **Bình phong thủy & Bình hoa:** Mai bình hút lộc (2.850k), bình hoa cổ sóng (1.850k), bình men hỏa biến.\n• **Studio 2D tự thiết kế:** Tự tay phối phôi và khắc chữ nghệ thuật theo bản vẽ riêng.\n\nQuý khách đang tìm sản phẩm để dùng cho gia đình, bài trí phong thủy hay làm quà tặng ạ?';
  }

  // 3. Quà tặng doanh nghiệp / Sự kiện / In logo
  if (norm.includes('qua tang') || norm.includes('doanh nghiep') || norm.includes('in logo') || norm.includes('so luong lon') || norm.includes('chiet khau') || norm.includes('su kien') || norm.includes('dai hoi')) {
    return 'Dạ, xưởng chuyên chế tác **Quà tặng doanh nghiệp & Ngoại giao** cao cấp:\n\n• In logo thương hiệu, khắc niên hiệu, mạ dát vàng kim sa 24K tinh xảo.\n• Đóng hộp xi lụa lót nhung sang trọng kèm chứng thư bảo vật độc bản.\n• Chiết khấu hấp dẫn theo số lượng và hỗ trợ chế tác mẫu duyệt trước.\n\nQuý khách dự kiến đặt cho sự kiện nào hoặc cần số lượng khoảng bao nhiêu bộ để em gửi mẫu thiết kế phù hợp ạ?';
  }

  // 4. Lời chào, biểu cảm vui vẻ (Ha ha, hihi, cười, xin chào, hello...)
  if (/^(ha\s*)+$/i.test(raw) || /^(hi\s*)+$/i.test(raw) || raw.includes('haha') || raw.includes('hihi') || raw.includes('cười') || raw.includes('vui') || norm.includes('xin chao') || norm.includes('hello') || norm === 'hi' || norm === 'alo' || norm.includes('ban la ai')) {
    return 'Dạ, tiếng cười hoan hỷ của quý khách làm xưởng gốm Thanh Xuân thêm phần rộn rã! Chúc quý khách một ngày an vui, vạn sự cát tường.\n\nNhân lúc vui vẻ, quý khách có muốn ngắm các mẫu bình hút tài lộc phong thủy hay thử tự tay thiết kế bình gốm 2D khắc chữ riêng của mình không ạ?';
  }

  // 5. Chữ khắc tối đa bao nhiêu ký tự & Quy chuẩn khắc chữ UC-C04 E1
  if (norm.includes('chu khac') || norm.includes('bao nhieu ky tu') || norm.includes('gioi han ky tu') || norm.includes('khac chu') || norm.includes('20 ky tu')) {
    return 'Dạ, theo quy chuẩn nghệ thuật của xưởng (**Chuẩn UC-C04 E1**):\n\n• Chữ khắc nghệ thuật được giới hạn **TỐI ĐA 20 KÝ TỰ** (bao gồm khoảng trắng và số).\n• **Lý do nghệ nhân:** Đường cong phôi gốm đòi hỏi chữ khắc phải thanh thoát, cân đối mỹ thuật thị giác và không che khuất họa tiết chính.\n\nQuý khách dự định khắc tên, lời chúc hay niên hiệu kỷ niệm gì trên tác phẩm ạ?';
  }

  // 6. Hướng dẫn tự thiết kế gốm 2D
  if (norm.includes('tu thiet ke') || norm.includes('studio 2d') || norm.includes('lam sao de') || norm.includes('cach thiet ke') || norm.includes('2d')) {
    return 'Dạ, để tự tạo tác phẩm độc bản trên phân hệ **Studio 2D (UC-C04)**, quý khách chỉ cần 5 bước:\n\n1. **Chọn phôi:** Mai bình, Bình hoa cổ sóng, Ấm trà, Đĩa sứ hoặc Tách trà.\n2. **Chọn họa tiết:** 13 mẫu vẽ tay truyền thống (Sen lam, Rồng mây, Song ngư...).\n3. **Căn chỉnh:** Kéo chuột xoay 360 độ, phóng to thu nhỏ (25% - 150%).\n4. **Khắc chữ:** Nhập lời chúc tối đa 20 ký tự.\n5. **Thêm vào giỏ:** Nghệ nhân sẽ nung củi 1.380°C và hoàn thiện trong 5 - 7 ngày.\n\nQuý khách muốn thử tạo mẫu trên dáng Mai bình hay Bình hoa tròn cổ sóng ạ?';
  }

  // 7. Bảng giá 5 dáng phôi Studio 2D
  if (norm.includes('gia') || norm.includes('bao nhieu tien') || norm.includes('bang gia') || norm.includes('phoi') || norm.includes('mai binh') || norm.includes('binh hoa')) {
    return 'Dạ, xưởng xin gửi quý khách **Bảng giá 5 dáng phôi thủ công Studio 2D**:\n\n• **Mai Bình Dáng Cao:** 2.850.000₫ (Hút tài lộc phong thủy)\n• **Bình Hoa Tròn Cổ Sóng:** 1.850.000₫ (Thanh nhã phòng trà)\n• **Ấm Trà Sứ Trắng:** 1.450.000₫ (Thấu quang cao cấp)\n• **Đĩa Sứ Nghệ Thuật (Kèm giá gỗ):** 1.200.000₫\n• **Tách Trà Có Nắp Hoàng Gia:** 380.000₫\n\nQuý khách ưng ý dáng phôi nào để em mở ngay giao diện thiết kế 2D hỗ trợ mình ạ?';
  }

  // 8. 5 Sắc men danh tiếng
  if (norm.includes('men') || norm.includes('sac men') || norm.includes('men lam') || norm.includes('men ran') || norm.includes('hoa bien') || norm.includes('celadon') || norm.includes('dat vang')) {
    return 'Dạ, xưởng sở hữu **5 sắc men danh tiếng Bát Tràng**:\n\n• **Men Lam:** Xanh cobalt cổ kính thế kỷ XIV, nét vẽ ẩn dưới men vĩnh cửu.\n• **Men Rạn:** Đường rạn tự nhiên gia truyền thời Lê - Nguyễn độc bản.\n• **Men Ngọc Celadon:** Sắc xanh ngọc bích mịn màng hoàng cung.\n• **Men Hỏa Biến:** Biến ảo kỳ diệu từ ngọn lửa lò nung củi 1.380°C.\n• **Dát Vàng Kim Sa:** Điểm xuyết vàng ròng 24K vương giả, thịnh vượng.\n\nQuý khách chuộng vẻ cổ kính của Men Rạn hay nét sang trọng của Dát Vàng 24K ạ?';
  }

  // 9. Thanh toán, vận chuyển & Đổi trả 7 ngày
  if (norm.includes('thanh toan') || norm.includes('giao hang') || norm.includes('doi tra') || norm.includes('nut vo') || norm.includes('bao hanh') || norm.includes('ship')) {
    return 'Dạ, chính sách mua sắm tại xưởng cam kết an tâm tuyệt đối:\n\n• **Giao hàng toàn quốc:** Bọc chống sốc 3 lớp, thượng khách được **đồng kiểm mở hộp** trước khi thanh toán (COD).\n• **Đổi trả (UC-A05, UC-C08):** Đổi mới 100% trong **7 ngày** nếu nứt vỡ do vận chuyển (chỉ cần quay video lúc khui kiện).\n• **Tổng đài nghệ nhân 24/7:** 1800 1705 (miễn cước gọi).';
  }

  // 10. Khi khách hỏi ngoài vấn đề (toán, lập trình, thời tiết, đời sống...)
  return 'Dạ, câu hỏi của quý khách thật thú vị! Dù ngày đêm gắn bó cùng đất sét và lửa lò nung 1.380°C, em thấy điều gì trong cuộc sống cũng cần sự tinh tế, bền bỉ hệt như cách người nghệ nhân chuốt nên từng dáng gốm Bát Tràng.\n\nNhân duyên gặp gỡ, em mời quý khách cùng ngắm nhìn những tác phẩm gốm mộc tinh hoa của xưởng hoặc thử tự tay thiết kế bình gốm 2D nhé ạ! Quý khách thích dòng bình phong thủy hay bộ ấm chén thưởng trà ạ?';
}

app.post('/api/chatbot', async (req, res) => {
  try {
    const { message, apiKey: reqApiKey, history } = req.body || {};
    const text = (message || '').trim();
    const rawApiKey = reqApiKey || req.headers['x-gemini-api-key'] || process.env.GEMINI_API_KEY || '';
    const apiKey = String(rawApiKey).trim().replace(/^['"`\s]+|['"`\s]+$/g, '');

    if (!text) {
      return res.status(200).json({
        success: true,
        data: {
          reply: 'Xin chào quý khách! Mình là Trợ lý Nghệ nhân AI của Làng Gốm Thanh Xuân (Gốm Mộc Bát Tràng). Quý khách cần em tư vấn về sản phẩm, địa chỉ ghé thăm xưởng hay phân hệ tự thiết kế 2D khắc chữ ạ?'
        }
      });
    }

    const SYSTEM_KNOWLEDGE = `Bạn là Trợ lý Nghệ nhân AI cao cấp của Làng Gốm Thanh Xuân (hội tụ tinh hoa Gốm Mộc Bát Tràng - Gia Lâm, Hà Nội).

TÀI LIỆU TRI THỨC VÀ QUY CHUẨN XƯỞNG GỐM:
1. Không Gian Trưng Bày & Địa Chỉ:
- Cơ sở 1 (Lò Bầu Di Sản & Xưởng Chế Tác): Thôn 1 Giang Cao, Làng Cổ Bát Tràng, Gia Lâm, Hà Nội (Có bãi đỗ ô tô miễn phí, trải nghiệm vuốt gốm và tham quan lò nung củi 1.380°C).
- Cơ sở 2 (Bảo Phủ Giám Tuyển - Showroom Phố Cổ): Tầng 2, 24 Tràng Tiền, Quận Hoàn Kiếm, Hà Nội (Không gian thưởng trà, chiêm ngưỡng ngự tác gốm sứ độc bản).
- Giờ mở cửa: 08:30 – 21:00 hàng ngày (kể cả Thứ 7, Chủ Nhật và ngày Lễ Tết).
- Tổng đài nghệ nhân 24/7: 1800 1705 (Miễn phí cước gọi). Email: Thuongkhach@langgomthanhxuan.vn.

2. Danh Mục Sản Phẩm Đa Dạng Của Shop:
- Bộ bàn ăn & Bát đĩa gia đình: Bộ đồ ăn Jasmine Thạch Vân 09 món (988.200₫), 22 món (1.710.720₫), Jasmine Chỉ Vàng (911.520₫), chén cơm (63.000₫), tô thố men ngọc.
- Bộ ấm chén trà đạo: Bộ trà Camellia Chỉ Vàng, Bộ ấm chén Men Rạn bọc đồng cổ, Tách trà hoàng gia có nắp (380.000₫).
- Bình hút lộc & Bình hoa phong thủy: Mai Bình Dáng Cao (2.850.000₫ - hút tài lộc phong thủy), Bình Hoa Tròn Cổ Sóng (1.850.000₫ - thanh nhã phòng trà), Bình Men Hỏa Biến 1.380°C kỳ ảo độc bản.
- Đĩa sứ nghệ thuật: Đĩa Sứ Trưng Bày kèm giá gỗ tiện cao cấp (1.200.000₫ - vẽ hoa sen, phố cổ, rồng phượng).
- Quà tặng doanh nghiệp & Ngoại giao: Chế tác theo yêu cầu, in logo thương hiệu, mạ dát vàng 24K, hộp xi lụa lót nhung cao cấp, chiết khấu hấp dẫn theo số lượng.

3. Phân Hệ Studio Tự Thiết Kế Gốm 2D (UC-C04):
- 5 bước tự phối tác phẩm: Chọn 1 trong 5 dáng phôi thủ công -> Chọn 1 trong 13 mẫu vẽ tay truyền thống -> Căn chỉnh 360 độ (phóng to/thu nhỏ 25%-150%) -> Khắc chữ nghệ thuật -> Thêm vào giỏ.
- QUY ĐỊNH CHỮ KHẮC NGHỆ THUẬT (Chuẩn UC-C04 E1): Giới hạn TỐI ĐA 20 KÝ TỰ (để nét chữ thanh thoát mỹ thuật trên đường cong phôi gốm, không che khuất họa tiết chính).

4. 5 Sắc Men Danh Tiếng Bát Tràng:
- Men Lam (thế kỷ XIV, xanh cobalt vĩnh cửu), Men Rạn (vân rạn tự nhiên thời Lê - Nguyễn), Men Ngọc Celadon (xanh ngọc thạch hoàng cung), Men Hỏa Biến (nung củi 1.380°C liên tục 72 giờ), Dát Vàng Kim Sa (vàng ròng 24K phú quý).

5. Chính Sách Bán Hàng & Hậu Mãi:
- Thanh toán: COD đồng kiểm tận tay (mở hộp kiểm tra trước khi trả tiền), QR VietQR, thẻ ngân hàng.
- Giao hàng: Hàng sẵn 2-3 ngày, hàng 2D chế tác 5-7 ngày. Giao toàn quốc bọc chống sốc 3 lớp.
- Chính sách đổi trả (UC-A05, UC-C08): Đổi mới 100% trong vòng 7 ngày nếu nứt vỡ do vận chuyển (chỉ cần quay video lúc khui kiện).

QUY TẮC CỐT LÕI BẮT BUỘC VỀ PHONG THÁI TRẢ LỜI:
1. TRẢ LỜI NGẮN GỌN & SÚC TÍCH: Chỉ trả lời đúng trọng tâm trong khoảng 2 ĐẾN 4 CÂU (hoặc 2-3 gạch đầu dòng ngắn). Tuyệt đối KHÔNG viết dài lê thê để khách hàng đọc nhanh và thoải mái trên khung chat.
2. PHONG PHÚ & CHỦ ĐỘNG GỢI MỞ: Tùy ý khách, linh hoạt giới thiệu sản phẩm phù hợp và LUÔN KẾT THÚC BẰNG 1 CÂU HỎI GỢI MỞ TINH TẾ.
3. KHI KHÁCH HỎI NGOÀI LỀ (toán, lập trình, thời tiết, chuyện vui...): Trả lời nhã nhặn trong 1 câu, sau đó khéo léo chuyển hướng về các tuyệt tác gốm sứ Bát Tràng.`;

    if (apiKey && apiKey.length >= 15) {
      try {
        const contents = [];
        if (Array.isArray(history)) {
          history.slice(-6).forEach(h => {
            contents.push({ role: h.role === 'user' ? 'user' : 'model', parts: [{ text: h.text }] });
          });
        }
        contents.push({ role: 'user', parts: [{ text }] });

        const models = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'];
        for (const m of models) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);

            const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${encodeURIComponent(apiKey)}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': apiKey
              },
              body: JSON.stringify({
                system_instruction: { parts: [{ text: SYSTEM_KNOWLEDGE }] },
                contents,
                generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
              }),
              signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (geminiRes.ok) {
              const gData = await geminiRes.json();
              const parts = gData?.candidates?.[0]?.content?.parts;
              let reply = '';
              if (Array.isArray(parts)) {
                reply = parts.map(p => p.text || '').join('\n').trim();
              }
              if (reply) {
                return res.status(200).json({ success: true, data: { reply, source: 'gemini' } });
              }
            } else if (geminiRes.status === 400) {
              const gErr = await geminiRes.json().catch(() => ({}));
              const msg = gErr?.error?.message || '';
              if (msg.includes('API key') || msg.includes('API_KEY_INVALID') || msg.includes('not valid')) {
                return res.status(400).json({ success: false, errorType: 'INVALID_API_KEY', message: msg });
              }
            }
          } catch (modelErr) {
            // thử model tiếp theo
          }
        }
      } catch (geminiErr) {
        console.error('Lỗi gọi Gemini từ backend:', geminiErr);
      }
    }

    // Fallback thông minh từ Kho tri thức xưởng
    const fallbackReply = getLocalCeramicReply(text);
    return res.status(200).json({
      success: true,
      data: {
        reply: fallbackReply + '\n\n*(💡 Phản hồi từ Kho tri thức Nghệ nhân Bát Tràng)*',
        source: 'local'
      }
    });
  } catch (error) {
    console.error('Lỗi xử lý chatbot:', error);
    return res.status(500).json({ success: false, message: 'Lỗi xử lý từ máy chủ tư vấn.' });
  }
});

// 7. KHỞI ĐỘNG SERVER
const PORT = process.env.PORT || 5000;
mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 20000
})
  .then(() => {
    console.log('✅ KẾT NỐI MONGODB THÀNH CÔNG!');
    app.listen(PORT, () => {
      console.log(`🚀 Server Backend đang chạy tại http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Không thể kết nối MongoDB; backend không khởi động:', err.message);
    process.exitCode = 1;
  });