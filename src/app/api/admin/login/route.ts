import { NextResponse } from 'next/server';
import { env } from '@/env';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();

    if (password === env.ADMIN_PASSWORD) {
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Invalid password' }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
