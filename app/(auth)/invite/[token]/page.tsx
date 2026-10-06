'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { acceptInvitation } from '@/app/actions/invitation-actions';
import { signIn } from 'next-auth/react';

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'auth_required'>('loading');
  const [message, setMessage] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');

  useEffect(() => {
    const checkInvitation = async () => {
      try {
        const res = await fetch(`/api/invite/${token}`);
        const data = await res.json();
        
        if (!res.ok) {
          if (res.status === 401) {
            setStatus('auth_required');
            setWorkspaceName(data.workspace_name || 'este workspace');
            return;
          }
          setStatus('error');
          setMessage(data.error || 'Invitación no encontrada');
          return;
        }
        
        setWorkspaceName(data.workspace_name);
      } catch {
        setStatus('error');
        setMessage('Error al verificar la invitación');
      }
    };
    checkInvitation();
  }, [token]);

  const handleAccept = async () => {
    setStatus('loading');
    try {
      const result = await acceptInvitation(token);
      if (result.success) {
        setStatus('success');
        setMessage('¡Te has unido al workspace exitosamente!');
        setTimeout(() => {
          router.push(`/dashboard/workspace/${result.workspaceId}`);
          router.refresh();
        }, 1500);
      }
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Error al aceptar la invitación');
    }
  };

  const handleSignIn = () => {
    signIn('credentials', { redirectTo: `/invite/${token}` });
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-6" />
          <p className="text-slate-400">Verificando invitación...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-8">
          <div className="text-center mb-8">
            <Link href="/dashboard" className="inline-flex items-center gap-2 text-2xl font-bold text-blue-400 font-orbitron tracking-wider">
              <span>📝</span> TaskFlow
            </Link>
          </div>

          {status === 'auth_required' && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="mx-auto mb-4 w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <span className="text-4xl">📨</span>
                </div>
                <h1 className="text-2xl font-semibold mb-2">Invitación a <span className="text-blue-400">{workspaceName}</span></h1>
                <p className="text-slate-500">Necesitas iniciar sesión para aceptar esta invitación</p>
              </div>
              <button
                onClick={handleSignIn}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                Iniciar sesión para aceptar
              </button>
              <p className="text-center text-slate-500 text-sm">
                ¿No tienes cuenta?{' '}
                <button onClick={() => signIn('credentials', { redirectTo: `/invite/${token}` })} className="text-blue-400 hover:text-blue-300 font-medium">
                  Regístrate
                </button>
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center animate-fade-in">
              <div className="mx-auto mb-4 w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-semibold mb-2 text-emerald-400">¡Bienvenido!</h1>
              <p className="text-slate-400">{message}</p>
              <p className="text-slate-500 text-sm mt-4">Redirigiendo al workspace...</p>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center animate-fade-in">
              <div className="mx-auto mb-4 w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center">
                <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="text-2xl font-semibold mb-2 text-red-400">Invitación no válida</h1>
              <p className="text-slate-400">{message}</p>
              <Link href="/dashboard" className="inline-block mt-6 text-blue-400 hover:text-blue-300 font-medium">
                ← Volver al dashboard
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}