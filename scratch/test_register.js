const http = require('http');

const testPayload = JSON.stringify({
  firstName: "Arlina",
  lastName: "Saheba",
  email: "hr.careerwings2017@gmail.com",
  phone: "9365137532",
  password: "password", // lowercase 8 chars
  role: "CANDIDATE"
});

const req = http.request({
  hostname: 'localhost',
  port: 5000,
  path: '/api/auth/register',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(testPayload)
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status code:', res.statusCode);
    console.log('Response body:', data);
  });
});

req.on('error', (e) => console.error(e));
req.write(testPayload);
req.end();
