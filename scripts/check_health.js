const url = process.argv[2] || 'http://localhost:3000/api/health/supabase';

try {
  // Fetch con timeout di 10 secondi
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  
  const response = await fetch(url, { 
    signal: controller.signal,
    headers: {
      'User-Agent': 'Health-Check-Script/1.0'
    }
  });
  
  clearTimeout(timeoutId);
  
  console.log('STATUS', response.status);
  const body = await response.text();
  console.log('BODY', body);
  
  if (!response.ok) {
    process.exit(1);
  }
} catch (err) {
  console.error('ERR', err.message);
  process.exit(1);
}
