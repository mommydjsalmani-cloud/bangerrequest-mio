import { NextResponse } from 'next/server';
import { getAllDJSubscriptions } from '@/lib/webpush';

// Endpoint di debug: elenca le subscriptions registrate
export async function GET() {
  try {
    console.log('📋 [DEBUG] /api/push/list called - checking subscription count...');
    const subscriptions = getAllDJSubscriptions();
    console.log(`📋 [DEBUG] Found ${subscriptions.length} subscriptions in memory`);

    // Non esporre le chiavi sensibili in produzione; questo endpoint è pensato per debug locale.
    const sanitized = subscriptions.map((s) => ({ endpoint: s.endpoint }));
    console.log(`📋 [DEBUG] Sanitized endpoints:`, sanitized.map(s => s.endpoint.substring(0, 50) + '...'));

    return NextResponse.json({ ok: true, total: subscriptions.length, subscriptions: sanitized });
  } catch (error) {
    console.error('Error listing push subscriptions:', error);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}
