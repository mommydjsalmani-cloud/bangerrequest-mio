import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const djSecret = process.env.DJ_PANEL_SECRET?.trim();
  const djUser = process.env.DJ_PANEL_USER?.trim();
  const header = req.headers.get('x-dj-secret')?.trim();
  const headerUser = req.headers.get('x-dj-user')?.trim();

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    env: {
      DJ_PANEL_USER: djUser,
      DJ_PANEL_SECRET: djSecret ? djSecret.substring(0, 3) + '***' : 'MISSING',
      DJ_USER_LENGTH: djUser?.length || 0,
      DJ_SECRET_LENGTH: djSecret?.length || 0
    },
    headers: {
      'x-dj-user': headerUser,
      'x-dj-secret': header ? header.substring(0, 3) + '***' : 'MISSING',
      USER_LENGTH: headerUser?.length || 0,
      SECRET_LENGTH: header?.length || 0
    },
    match: {
      userMatch: headerUser === djUser,
      secretMatch: header === djSecret,
      bothMatch: header === djSecret && headerUser === djUser
    }
  });
}