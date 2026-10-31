const cartService = require('./cart.service');

/**
 * Controller xử lý Giỏ hàng khách hàng (UC-C05)
 */
const cartController = {
  // GET /api/cart
  async getCart(req, res) {
    try {
      const accountId = req.accountId;
      const cartData = await cartService.getCart(accountId);
      return res.status(200).json({
        success: true,
        message: 'Lấy thông tin giỏ hàng thành công',
        data: cartData,
      });
    } catch (error) {
      console.error('Lỗi lấy giỏ hàng:', error);
      const status = error.statusCode || 500;
      return res.status(status).json({
        success: false,
        message: error.message || 'Lỗi lấy giỏ hàng từ máy chủ',
      });
    }
  },

  // POST /api/cart/items
  async addItem(req, res) {
    try {
      const accountId = req.accountId;
      const { productId, quantity, customization } = req.body;

      if (!productId) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp mã sản phẩm (productId)',
        });
      }

      const cartData = await cartService.addToCart(productId, quantity || 1, customization, accountId);
      return res.status(200).json({
        success: true,
        message: 'Đã thêm tác phẩm vào giỏ hàng thành công',
        data: cartData,
      });
    } catch (error) {
      console.error('Lỗi thêm vào giỏ hàng:', error);
      const status = error.statusCode || 400;
      return res.status(status).json({
        success: false,
        message: error.message || 'Không thể thêm sản phẩm vào giỏ hàng',
      });
    }
  },

  // PATCH /api/cart/items/:itemId
  async updateItem(req, res) {
    try {
      const accountId = req.accountId;
      const { itemId } = req.params;
      const { quantity } = req.body;

      if (quantity === undefined || quantity === null) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp số lượng mới',
        });
      }

      const cartData = await cartService.updateItemQuantity(accountId, itemId, quantity);
      return res.status(200).json({
        success: true,
        message: 'Cập nhật số lượng thành công',
        data: cartData,
      });
    } catch (error) {
      console.error('Lỗi cập nhật số lượng:', error);
      const status = error.statusCode || 400;
      return res.status(status).json({
        success: false,
        message: error.message || 'Không thể cập nhật số lượng sản phẩm',
      });
    }
  },

  // DELETE /api/cart/items/:itemId
  async removeItem(req, res) {
    try {
      const accountId = req.accountId;
      const { itemId } = req.params;

      const cartData = await cartService.removeItem(accountId, itemId);
      return res.status(200).json({
        success: true,
        message: 'Đã xóa sản phẩm khỏi giỏ hàng',
        data: cartData,
      });
    } catch (error) {
      console.error('Lỗi xóa sản phẩm khỏi giỏ:', error);
      const status = error.statusCode || 400;
      return res.status(status).json({
        success: false,
        message: error.message || 'Không thể xóa sản phẩm khỏi giỏ hàng',
      });
    }
  },

  // DELETE /api/cart
  async clearCart(req, res) {
    try {
      const accountId = req.accountId;
      const cartData = await cartService.clearCart(accountId);
      return res.status(200).json({
        success: true,
        message: 'Đã xóa sạch giỏ hàng',
        data: cartData,
      });
    } catch (error) {
      console.error('Lỗi làm sạch giỏ hàng:', error);
      const status = error.statusCode || 500;
      return res.status(status).json({
        success: false,
        message: error.message || 'Không thể làm sạch giỏ hàng',
      });
    }
  },
};

module.exports = cartController;
