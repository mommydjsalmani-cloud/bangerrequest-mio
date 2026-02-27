const http = require('node:http');
const https = require('node:https');
const { URL } = require('node:url');

const url = process.argv[2] || 'http://localhost:3000/api/health';

function makeRequest(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) return reject(new Error('Too many redirects'));

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
      // Segui i redirect (301, 302, 307, 308)
      if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
        const location = res.headers.location;
        const nextUrl = location.startsWith('http') ? location : new URL(location, url).toString();
        res.resume(); // consuma il body per liberare la connessione
        return makeRequest(nextUrl, redirects + 1).then(resolve).catch(reject);
      }

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

async function main() {
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
}

main();