import { NextResponse } from 'next/server';
import { getInvitationByToken } from '@/app/actions/invitation-actions';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  
  const invitation = await getInvitationByToken(token);
  
  if (!invitation) {
    return NextResponse.json({ error: 'Invitación no encontrada' }, { status: 404 });
  }
  
  if (invitation.status !== 'pending') {
    return NextResponse.json({ error: `Invitación ${invitation.status}` }, { status: 400 });
  }
  
  if (new Date(invitation.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Invitación expirada' }, { status: 400 });
  }
  
  return NextResponse.json({
    workspace_name: invitation.workspace_name,
    email: invitation.email,
    role: invitation.role,
  });
}