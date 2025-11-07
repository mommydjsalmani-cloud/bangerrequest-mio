import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';

const url = process.argv[2] || 'http://localhost:3000/api/health';

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Health-Check-Script/1.0'
      },
      timeout: 10000
    };

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          body: data
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

try {
  console.log('Checking', url);
  const result = await makeRequest(url);
  console.log('STATUS', result.status);
  console.log('BODY', result.body);
  
  if (result.status !== 200) {
    process.exit(1);
  }
} catch (err) {
  console.error('ERR', err.message);
  process.exit(1);
}
