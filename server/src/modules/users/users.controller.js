/**
 * ============================================================================
 * [THÀNH VIÊN 1 - AUTH & USER MANAGEMENT]
 * Users Controller (users.controller.js)
 * Phục vụ:
 *   - UC-C07: Cập nhật thông tin cá nhân & Quản lý sổ địa chỉ giao hàng
 *   - UC-A04: Quản lý khách hàng phía Admin (danh sách, tìm kiếm, chi tiết, khóa/mở khóa)
 * ============================================================================
 */

const User = require('../../models/User');
const { uploadToCloudinary, deleteFromCloudinary } = require('../../core/cloudinary');

/**
 * [UC-C07] Cập nhật thông tin cá nhân khách hàng
 */
exports.updateProfile = async (req, res) => {
  try {
    const { fullName, phone, avatar } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }

    if (fullName) user.fullName = fullName.trim();
    if (phone) user.phone = phone.trim();

    // Nếu có upload file kèm trong updateProfile
    if (req.file) {
      if (user.avatarPublicId) {
        try { await deleteFromCloudinary(user.avatarPublicId); } catch (e) { /* ignore */ }
      }
      const uploadResult = await uploadToCloudinary(req.file.buffer, 'craftory_avatars');
      user.avatar = uploadResult.secure_url;
      user.avatarPublicId = uploadResult.public_id;
    } else if (avatar) {
      user.avatar = avatar;
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Cập nhật thông tin cá nhân thành công!',
      data: user
    });
  } catch (error) {
    console.error('[TV1 User Error] Update Profile:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * [UC-C07 / UC-A01] Tải ảnh đại diện lên Cloudinary (Dành cho Khách hàng & Quản trị viên)
 */
exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn tệp hình ảnh để tải lên'
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }

    // Xóa ảnh cũ trên Cloudinary nếu có public_id cũ để tối ưu bộ nhớ
    if (user.avatarPublicId) {
      try {
        await deleteFromCloudinary(user.avatarPublicId);
      } catch (delErr) {
        console.warn('Xóa ảnh cũ Cloudinary:', delErr.message);
      }
    }

    // Upload stream buffer lên Cloudinary vào thư mục 'craftory_avatars'
    const uploadResult = await uploadToCloudinary(req.file.buffer, 'craftory_avatars');
    user.avatar = uploadResult.secure_url;
    user.avatarPublicId = uploadResult.public_id;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Cập nhật ảnh đại diện thành công!',
      data: {
        avatar: user.avatar,
        avatarPublicId: user.avatarPublicId,
        user: {
          id: user._id,
          _id: user._id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          role: user.role,
          avatar: user.avatar
        }
      }
    });
  } catch (error) {
    console.error('[TV1 Avatar Upload Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi tải ảnh đại diện lên Cloudinary'
    });
  }
};

/**
 * [UC-A04] Admin cập nhật ảnh đại diện cho khách hàng
 */
exports.adminUploadCustomerAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn tệp hình ảnh để tải lên'
      });
    }

    const customer = await User.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy khách hàng' });
    }

    if (customer.avatarPublicId) {
      try {
        await deleteFromCloudinary(customer.avatarPublicId);
      } catch (delErr) {
        console.warn('Xóa ảnh cũ Cloudinary:', delErr.message);
      }
    }

    const uploadResult = await uploadToCloudinary(req.file.buffer, 'craftory_avatars');
    customer.avatar = uploadResult.secure_url;
    customer.avatarPublicId = uploadResult.public_id;
    await customer.save();

    return res.status(200).json({
      success: true,
      message: 'Cập nhật ảnh đại diện khách hàng thành công!',
      data: {
        avatar: customer.avatar,
        avatarPublicId: customer.avatarPublicId,
        customer
      }
    });
  } catch (error) {
    console.error('[TV1 Admin Upload Customer Avatar Error]:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * [UC-C07] Thêm địa chỉ nhận hàng mới
 */
exports.addAddress = async (req, res) => {
  try {
    const { recipientName, phone, province, ward, addressDetail, isDefault } = req.body;

    if (!recipientName || !phone || !addressDetail) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ tên người nhận, số điện thoại và địa chỉ'
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'Người dùng không tồn tại' });

    // Nếu đặt làm mặc định, hủy mặc định của các địa chỉ khác
    if (isDefault && user.addresses) {
      user.addresses.forEach(a => { a.isDefault = false; });
    }

    user.addresses.push({
      recipientName,
      phone,
      province,
      ward,
      addressDetail,
      isDefault: isDefault || (user.addresses.length === 0)
    });

    await user.save();

    return res.status(201).json({
      success: true,
      message: 'Đã thêm địa chỉ giao hàng mới',
      data: user.addresses
    });
  } catch (error) {
    console.error('[TV1 User Error] Add Address:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * [UC-C07] Xóa địa chỉ nhận hàng
 */
exports.deleteAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'Người dùng không tồn tại' });

    user.addresses = user.addresses.filter(a => a._id.toString() !== addressId);
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Đã xóa địa chỉ thành công',
      data: user.addresses
    });
  } catch (error) {
    console.error('[TV1 User Error] Delete Address:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * [UC-A04] Admin: Lấy danh sách khách hàng (Có lọc, tìm kiếm, phân trang)
 */
exports.getAdminCustomers = async (req, res) => {
  try {
    const { search, status, page = 1, limit = 10 } = req.query;

    const query = { role: 'CUSTOMER', isDeleted: { $ne: true } };

    // Lọc theo trạng thái ACTIVE / LOCKED / INACTIVE
    if (status && status !== 'ALL') {
      query.status = status.toUpperCase();
    }

    // Tìm kiếm theo tên, email hoặc số điện thoại
    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { fullName: searchRegex },
        { email: searchRegex },
        { phone: searchRegex }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    // Tuyệt đối không chọn passwordHash (UC-A04 E1)
    const [customers, total] = await Promise.all([
      User.find(query)
        .select('-passwordHash -resetPasswordOtp -resetPasswordExpires')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      User.countDocuments(query)
    ]);

    // Thống kê nhanh số lượng hội viên cho các thẻ KPI trên màn hình Admin
    const [totalActive, totalLocked] = await Promise.all([
      User.countDocuments({ role: 'CUSTOMER', status: 'ACTIVE' }),
      User.countDocuments({ role: 'CUSTOMER', status: 'LOCKED' })
    ]);

    return res.status(200).json({
      success: true,
      data: customers,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)) || 1
      },
      stats: {
        totalCustomers: total,
        totalActive,
        totalLocked
      }
    });
  } catch (error) {
    console.error('[TV1 Admin Error] Get Customers:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * [UC-A04] Admin: Xem chi tiết 1 khách hàng
 */
exports.getCustomerDetail = async (req, res) => {
  try {
    const customer = await User.findOne({
      _id: req.params.id,
      role: 'CUSTOMER'
    }).select('-passwordHash -resetPasswordOtp -resetPasswordExpires');

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy hồ sơ khách hàng'
      });
    }

    return res.status(200).json({
      success: true,
      data: customer
    });
  } catch (error) {
    console.error('[TV1 Admin Error] Get Customer Detail:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * [UC-A04 E2 & BR-A15 & BRD-16-05, BRD-16-07] Admin: Khóa / Mở khóa tài khoản kèm lý do
 */
exports.updateCustomerStatus = async (req, res) => {
  try {
    const { status, banReason } = req.body; // 'ACTIVE', 'LOCKED', 'INACTIVE'

    if (!['ACTIVE', 'LOCKED', 'INACTIVE'].includes(status?.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: 'Trạng thái không hợp lệ. Chỉ chấp nhận ACTIVE, LOCKED hoặc INACTIVE'
      });
    }

    const customer = await User.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản khách hàng' });
    }

    // Không cho phép tự khóa tài khoản Admin
    if (customer.role === 'ADMIN') {
      return res.status(400).json({ success: false, message: 'Không thể khóa tài khoản quản trị viên chính' });
    }

    customer.status = status.toUpperCase();
    if (status.toUpperCase() === 'LOCKED') {
      customer.banReason = banReason ? banReason.trim() : 'Vi phạm điều khoản sử dụng';
    } else {
      customer.banReason = undefined;
    }

    await customer.save();

    return res.status(200).json({
      success: true,
      message: status.toUpperCase() === 'LOCKED'
        ? `Tài khoản ${customer.customerCode || customer.fullName} đã bị khóa (isBanned = true). Đã thu hồi toàn bộ phiên làm việc.`
        : `Đã mở khóa tài khoản cho khách hàng ${customer.fullName}.`,
      data: {
        id: customer._id,
        fullName: customer.fullName,
        email: customer.email,
        status: customer.status,
        banReason: customer.banReason
      }
    });
  } catch (error) {
    console.error('[TV1 Admin Error] Update Customer Status:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * [BRD-16-08] Admin: Xóa mềm tài khoản khách hàng (Soft Delete)
 */
exports.softDeleteCustomer = async (req, res) => {
  try {
    const customer = await User.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản khách hàng' });
    }

    if (customer.role === 'ADMIN') {
      return res.status(400).json({ success: false, message: 'Không thể xóa tài khoản Quản trị viên' });
    }

    customer.isDeleted = true;
    customer.deletedAt = new Date();
    customer.status = 'INACTIVE';
    await customer.save();

    return res.status(200).json({
      success: true,
      message: `Đã xóa mềm tài khoản ${customer.customerCode || customer.fullName}. Dữ liệu kế toán được bảo toàn (BRD-16-08).`,
      data: {
        id: customer._id,
        isDeleted: customer.isDeleted
      }
    });
  } catch (error) {
    console.error('[TV1 Admin Error] Soft Delete Customer:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * [BR-A14 & BRD-A19] Admin: Gửi liên kết đặt lại mật khẩu cho khách hàng
 */
exports.triggerResetPassword = async (req, res) => {
  try {
    const customer = await User.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản khách hàng' });
    }

    // Tạo OTP ngẫu nhiên 6 chữ số
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    customer.resetPasswordOtp = otp;
    customer.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 phút
    await customer.save();

    return res.status(200).json({
      success: true,
      message: `Đã gửi liên kết khôi phục mật khẩu (BR-A14) tới ${customer.email}`,
      devOtp: otp
    });
  } catch (error) {
    console.error('[TV1 Admin Error] Trigger Reset Password:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
