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
const PRODUCT_IMAGE_URL = /^https:\/\/[^/?#]+\/[^?#]*\.(?:png|jpe?g|webp|gif|avif)(?:\?[^#]*)?(?:#.*)?$/i;
const PRODUCT_IMAGE_PATTERN = /^(?:https:\/\/[^/?#]+\/[^?#]*\.(?:png|jpe?g|webp|gif|avif)(?:\?[^#]*)?(?:#.*)?|data:image\/(?:jpeg|jpg|png|webp|gif);base64,)/i;
const MAX_PRODUCT_IMAGE_DATA_URLS_SIZE = 8 * 1024 * 1024;

function isValidProductSource(sourceUrl) {
  return MINHLONG_PRODUCT_URL.test(sourceUrl || '') || PRODUCT_IMAGE_URL.test(sourceUrl || '');
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
    sourceUrl: { $in: [MINHLONG_PRODUCT_URL, PRODUCT_IMAGE_URL] },
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
        sourceUrl: MINHLONG_PRODUCT_URL,
        imageUrl: MINHLONG_IMAGE_URL,
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
          sourceUrl: MINHLONG_PRODUCT_URL,
          imageUrl: MINHLONG_IMAGE_URL,
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
    collectionFilter.sourceUrl = MINHLONG_PRODUCT_URL;
    collectionFilter.imageUrl = MINHLONG_IMAGE_URL;
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
    if (cartItem) {
      cartItem.quantity = updatedQuantity;
      cartItem.unitPrice = product.price;
      cartItem.productName = product.name;
    } else {
      cart.items.push({
        productId: product._id,
        productName: product.name,
        unitPrice: product.price,
        quantity
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

// ==========================================
// THÀNH VIÊN 5: MODULE ĐỔI TRẢ, ĐÁNH GIÁ & DASHBOARD (UC-C08, UC-A05, UC-A06)
// ==========================================
const Review = require('./models/Review');
const ReturnRequest = require('./models/ReturnRequest');

// --- I. ĐÁNH GIÁ SẢN PHẨM (UC-C08) ---
// 1. Tạo đánh giá mới (Kiểm tra nếu có orderId thì đơn phải COMPLETED)
app.post('/api/reviews', async (req, res) => {
  try {
    const { accountId, productId, orderId, rating, comment } = req.body;

    if (!accountId || !productId || !rating) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp accountId, productId và số sao rating' });
    }

    if (orderId) {
      const order = await Order.findById(orderId);
      if (order && order.status !== 'completed' && order.status !== 'COMPLETED') {
        return res.status(400).json({ success: false, message: 'Chỉ được đánh giá tác phẩm khi đơn hàng đã hoàn tất (Completed)' });
      }
    }

    const newReview = new Review({
      accountId,
      productId,
      orderId: orderId || null,
      rating: Number(rating),
      comment: (comment || '').trim()
    });

    await newReview.save();
    res.status(201).json({ success: true, message: 'Gửi đánh giá thành công', data: newReview });
  } catch (error) {
    console.error('Lỗi gửi đánh giá:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. Lấy danh sách đánh giá theo sản phẩm + tính sao trung bình (cho TV2 hiển thị product-detail)
app.get('/api/reviews/product/:productId', async (req, res) => {
  try {
    const reviews = await Review.find({ productId: req.params.productId })
      .populate('accountId', 'fullName email')
      .sort({ createdAt: -1 })
      .lean();

    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0
      ? (reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / totalReviews).toFixed(1)
      : 5.0;

    res.status(200).json({
      success: true,
      data: reviews,
      stats: {
        totalReviews,
        averageRating: Number(averageRating)
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
// 1. Khách gửi yêu cầu đổi trả
app.post('/api/returns', async (req, res) => {
  try {
    const { orderId, accountId, type, reason, evidenceImages, items } = req.body;

    if (!orderId || !accountId || !reason) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp mã đơn hàng, tài khoản và lý do đổi trả' });
    }

    let returnItems = items;
    if (!returnItems || !returnItems.length) {
      const order = await Order.findById(orderId).lean();
      if (order && order.items && order.items.length) {
        returnItems = order.items.map(it => ({
          productId: it.productId,
          quantity: it.quantity || 1,
          reason: reason
        }));
      } else {
        const sampleProd = await Product.findOne().lean();
        returnItems = [{ productId: sampleProd ? sampleProd._id : '670000000000000000000001', quantity: 1, reason }];
      }
    }

    const newReturn = new ReturnRequest({
      orderId,
      accountId,
      type: type || 'return',
      reason: reason.trim(),
      evidenceImages: evidenceImages || [],
      items: returnItems,
      status: 'pending'
    });

    await newReturn.save();
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

// 3. Lấy tất cả yêu cầu đổi trả (phía Admin)
app.get('/api/returns', async (req, res) => {
  try {
    const returns = await ReturnRequest.find()
      .populate('accountId', 'fullName email phone')
      .populate('orderId')
      .populate('items.productId')
      .sort({ createdAt: -1 })
      .lean();
    res.status(200).json({ success: true, data: returns });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 4. Admin duyệt hoặc từ chối yêu cầu đổi trả
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

    returnReq.status = status;
    returnReq.processedAt = new Date();
    if (processedBy) returnReq.processedBy = processedBy;
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
    // 1. Doanh thu: tổng totalAmount của các Order có status === 'completed'
    const completedOrders = await Order.find({ status: { $in: ['completed', 'COMPLETED'] } }).select('totalAmount').lean();
    const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    // 2. Đơn chờ xử lý: số Order có status === 'pending'
    const pendingOrdersCount = await Order.countDocuments({ status: { $in: ['pending', 'PENDING'] } });

    // 3. Cảnh báo hết hàng: số Product có stock === 0 hoặc stock <= 5
    const lowStockCount = await Product.countDocuments({ stock: { $lte: 5 } });

    // 4. Tổng khách hàng: số Account có role === 'customer'
    const totalCustomersCount = await Account.countDocuments({ role: 'customer' });

    // 5. Yêu cầu đổi trả chờ duyệt
    const pendingReturnsCount = await ReturnRequest.countDocuments({ status: 'pending' });

    res.status(200).json({
      success: true,
      data: {
        totalRevenue,
        pendingOrdersCount,
        lowStockCount,
        totalCustomersCount,
        pendingReturnsCount
      }
    });
  } catch (error) {
    console.error('Lỗi lấy thống kê dashboard:', error);
    res.status(500).json({ success: false, message: error.message });
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