/**
 * [THÀNH VIÊN 4] Routes cho Chatbot - gắn vào server.js bằng:
 *   const chatbotRoutes = require('./modules/chatbot/chatbot.routes');
 *   app.use('/api/chatbot', chatbotRoutes);
 * Không cần đăng nhập: khách chưa có tài khoản vẫn hỏi được.
 */

const express = require('express');
const controller = require('./chatbot.controller');

const router = express.Router();

router.post('/', controller.ask);

module.exports = router;