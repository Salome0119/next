import { NextResponse } from 'next/server';
import { initUserSettingsDb } from '@/lib/user-settings-db';

export async function POST() {
  try {
    await initUserSettingsDb();
    return NextResponse.json({ success: true, message: 'AI tables initialized' });
  } catch (error) {
    console.error('[INIT AI TABLES ERROR]', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to initialize tables' },
      { status: 500 }
    );
  }
}