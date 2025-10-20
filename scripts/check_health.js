import http from 'node:http';

const url = process.argv[2] || 'http://localhost:3000/api/health/supabase';

http.get(url, (res) => {
  console.log('STATUS', res.statusCode);
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log('BODY', data));
}).on('error', (err) => {
  console.error('ERR', err.message);
  process.exit(1);
});
