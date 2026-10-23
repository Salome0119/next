import { auth } from '@/auth';
import { updatePreferencesAction } from '@/app/actions/settings-actions';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { language } = body;

    if (!language || !['es', 'en'].includes(language)) {
      return NextResponse.json({ error: 'Invalid language' }, { status: 400 });
    }

    const formData = new FormData();
    formData.append('language', language);

    const result = await updatePreferencesAction(formData);

    if (result.success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
  } catch (error) {
    console.error('[API LANGUAGE] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}