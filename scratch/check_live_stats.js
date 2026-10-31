const http = require('http');

function get(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:5000${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    }).on('error', reject);
  });
}

async function testStats() {
  console.log('1. Gọi /api/dashboard/stats:');
  const dStats = await get('/api/dashboard/stats');
  console.log('Dashboard stats:', dStats);

  console.log('\n2. Gọi /api/orders/admin/stats:');
  const oStats = await get('/api/orders/admin/stats');
  console.log('Order admin stats:', oStats);

  console.log('\n3. Gọi /api/returns:');
  const returns = await get('/api/returns');
  console.log(`Tìm thấy ${returns.data ? returns.data.length : 0} yêu cầu đổi trả:`);
  if (returns.data) {
    returns.data.forEach(r => {
      console.log(`- ID: ${r._id}, Mã đơn: ${r.orderId ? r.orderId.orderCode : 'null'}, Trạng thái: ${r.status}, Tiền đơn: ${r.orderId ? r.orderId.totalAmount : 'null'}`);
    });
  }
}

testStats().catch(console.error);
