const url = process.argv[2] || 'http://localhost:3000/api/health/supabase';

try {
  const response = await fetch(url);
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
