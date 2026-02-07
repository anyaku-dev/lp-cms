import { NextRequest, NextResponse } from 'next/server';

export const config = {
  matcher: ['/'],
};

export function middleware(req: NextRequest) {
  const basicAuth = req.headers.get('authorization');
  const url = req.nextUrl;

  if (basicAuth) {
    const authValue = basicAuth.split(' ')[1];
    const [user, pwd] = atob(authValue).split(':');

    // ユーザー：bakuurelp / パス：bakuurelp
    if (user === 'bakuurelp' && pwd === 'bakuurelp') {
      return NextResponse.next();
    }
  }

  url.pathname = '/api/auth';
  return new NextResponse('Basic Auth Required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Secure Area"',
    },
  });
}