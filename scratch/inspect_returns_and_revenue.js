const mongoose = require('../server/node_modules/mongoose');

async function inspectData() {
  await mongoose.connect('mongodb://localhost:27017/craftory');
  const Order = mongoose.model('Order', new mongoose.Schema({}, { strict: false }));
  const ReturnRequest = mongoose.model('ReturnRequest', new mongoose.Schema({}, { strict: false }));

  console.log('=== DANH SÁCH RETURN REQUESTS ===');
  const returns = await ReturnRequest.find().lean();
  console.log(`Tìm thấy ${returns.length} return requests:`);
  for (const r of returns) {
    console.log(`- ID: ${r._id}, OrderId: ${r.orderId}, Type: ${r.type}, Status: ${r.status}, Reason: ${r.reason}`);
  }

  console.log('\n=== DANH SÁCH COMPLETED ORDERS ===');
  const orders = await Order.find({
    $or: [{ orderStatus: 'completed' }, { status: 'completed' }]
  }).lean();
  console.log(`Tìm thấy ${orders.length} completed orders:`);
  for (const o of orders) {
    console.log(`- Code: #${o.orderCode}, Total: ${o.totalAmount}, PaymentStatus: ${o.paymentStatus}, ReturnStatus: ${o.returnStatus}, RefundedAmount: ${o.refundedAmount}`);
  }

  await mongoose.disconnect();
}

inspectData().catch(console.error);
