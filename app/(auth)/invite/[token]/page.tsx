'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn, signOut } from 'next-auth/react';
import { acceptInvitation } from '@/app/actions/invitation-actions';

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [status, setStatus] = useState<'loading' | 'valid' | 'auth_required' | 'success' | 'error' | 'email_mismatch' | 'generic'>('loading');
  const [message, setMessage] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [invitationEmail, setInvitationEmail] = useState('');
  const [currentEmail, setCurrentEmail] = useState('');
  const [invitationRole, setInvitationRole] = useState('');
  const [isGeneric, setIsGeneric] = useState(false);
  const [accepting, setAccepting] = useState(false);

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
        setInvitationEmail(data.email);
        setInvitationRole(data.role);
        setIsGeneric(data.isGeneric || false);

        if (data.isGeneric) {
          setStatus('generic');
        } else {
          setStatus('valid');
        }
      } catch {
        setStatus('error');
        setMessage('Error al verificar la invitación');
      }
    };
    checkInvitation();
  }, [token]);

  const handleAccept = async (acceptAnyway = false) => {
    setAccepting(true);
    try {
      const result = await acceptInvitation(token, { acceptAnyway });
      if (!result.success) {
        if (result.error === 'Email mismatch' && result.data?.emailMismatch) {
          setCurrentEmail(result.data.emailMismatch.currentEmail);
          setStatus('email_mismatch');
          return;
        }
        setStatus('error');
        setMessage(result.error || 'Error al aceptar la invitación');
        return;
      }
      const workspaceId = result.data?.workspaceId;
      if (workspaceId) {
        setStatus('success');
        setMessage('¡Te has unido al workspace exitosamente!');
        setTimeout(() => {
          router.push(`/dashboard/workspace/${workspaceId}`);
          router.refresh();
        }, 1500);
      }
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Error al aceptar la invitación');
    } finally {
      setAccepting(false);
    }
  };

  const handleSignOutAndSignIn = () => {
    signOut({ callbackUrl: `/login?callbackUrl=/invite/${token}` });
  };

  const handleSignIn = () => {
    signIn('credentials', { redirectTo: `/invite/${token}` });
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#020617] text-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-violet-500 border-t-transparent mx-auto mb-6" />
          <p className="text-slate-400">Verificando invitación...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="max-w-md w-full bg-slate-900/80 border border-slate-800 rounded-2xl p-8 shadow-2xl backdrop-blur-xl text-center space-y-6 animate-fade-in">
          <div className="pt-2">
            <Link href="/dashboard" className="inline-flex items-center gap-2 text-2xl font-heading font-bold text-gradient-primary tracking-tight">
              <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-white font-heading font-bold text-xl">P</span>
              <span>PlanAI</span>
            </Link>
          </div>

          {status === 'auth_required' && (
            <div className="space-y-6">
              <div>
                <div className="mx-auto mb-4 w-20 h-20 rounded-full bg-violet-500/10 flex items-center justify-center">
                  <span className="text-4xl">📨</span>
                </div>
                <h1 className="text-2xl font-heading font-semibold mb-2">Invitación a <span className="text-violet-400">{workspaceName}</span></h1>
                <p className="text-slate-500">Necesitas iniciar sesión para aceptar esta invitación</p>
              </div>
              <button
                onClick={handleSignIn}
                className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold rounded-xl py-3 shadow-lg shadow-violet-600/20 transition-all duration-200 flex items-center justify-center gap-2"
              >
                Iniciar sesión para aceptar
              </button>
              <p className="text-center text-slate-500 text-sm">
                ¿No tienes cuenta?{' '}
                <button onClick={() => signIn('credentials', { redirectTo: `/invite/${token}` })} className="text-violet-400 hover:text-violet-300 font-medium">
                  Regístrate
                </button>
              </p>
            </div>
          )}

          {status === 'valid' && (
            <div className="space-y-6 animate-slide-up">
              <div>
                <div className="mx-auto mb-4 w-20 h-20 rounded-full bg-violet-500/10 flex items-center justify-center">
                  <span className="text-4xl">📨</span>
                </div>
                <h1 className="text-2xl font-heading font-semibold mb-2">Invitación a <span className="text-violet-400">{workspaceName}</span></h1>
                <p className="text-slate-500 mb-2">Se te ha invitado como <span className="font-medium capitalize">{invitationRole}</span></p>
                <p className="text-slate-500 text-sm">Email: <span className="font-mono text-slate-300">{invitationEmail}</span></p>
              </div>
              <button
                onClick={() => handleAccept()}
                disabled={accepting}
                className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-3 shadow-lg shadow-violet-600/20 transition-all duration-200 flex items-center justify-center gap-2"
              >
                {accepting ? (
                  <>
                    <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                    Aceptando...
                  </>
                ) : 'Aceptar invitación'}
              </button>
              <p className="text-center text-slate-500 text-sm">
                ¿No es tu cuenta? <button onClick={() => signIn('credentials', { redirectTo: `/invite/${token}` })} className="text-violet-400 hover:text-violet-300 font-medium">
                  Cambiar cuenta
                </button>
              </p>
            </div>
          )}

          {status === 'generic' && (
            <div className="space-y-6 animate-slide-up">
              <div>
                <div className="mx-auto mb-4 w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <span className="text-4xl">🔗</span>
                </div>
                <h1 className="text-2xl font-heading font-semibold mb-2">Enlace de invitación a <span className="text-emerald-400">{workspaceName}</span></h1>
                <p className="text-slate-500 mb-2">Este es un enlace de invitación genérico</p>
                <p className="text-slate-500 text-sm">Rol asignado: <span className="font-medium capitalize text-emerald-400">{invitationRole}</span></p>
              </div>
              <button
                onClick={() => handleAccept()}
                disabled={accepting}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-3 shadow-lg shadow-emerald-600/20 transition-all duration-200 flex items-center justify-center gap-2"
              >
                {accepting ? (
                  <>
                    <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                    Uniéndote...
                  </>
                ) : 'Unirse al workspace'}
              </button>
            </div>
          )}

          {status === 'email_mismatch' && (
            <div className="space-y-6 animate-slide-up">
              <div className="p-5 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h1 className="text-xl font-heading font-semibold mb-3 text-amber-300">Correo diferente detectado</h1>
                <div className="space-y-3 text-sm text-slate-300">
                  <p>Esta invitación fue enviada a <span className="font-mono font-medium text-slate-100">{invitationEmail}</span></p>
                  <p>Actualmente tienes iniciada sesión como <span className="font-mono font-medium text-slate-100">{currentEmail}</span></p>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleSignOutAndSignIn}
                  className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold rounded-xl py-3 shadow-lg shadow-violet-600/20 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Cerrar sesión e ingresar con {invitationEmail}
                </button>

                <button
                  onClick={() => handleAccept(true)}
                  disabled={accepting}
                  className="w-full bg-slate-800 hover:bg-slate-700/80 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed border border-slate-700/60 text-slate-200 font-semibold rounded-xl py-3 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {accepting ? (
                    <>
                      <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                      Aceptando...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Aceptar de todos modos con mi cuenta actual
                    </>
                  )}
                </button>
              </div>

              <p className="text-center text-slate-500 text-sm pt-2 border-t border-slate-800">
                La invitación sigue siendo válida y no ha expirado.
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="animate-fade-in">
              <div className="mx-auto mb-4 w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-heading font-semibold mb-2 text-emerald-400">¡Bienvenido!</h1>
              <p className="text-slate-400">{message}</p>
              <p className="text-slate-500 text-sm mt-4">Redirigiendo al workspace...</p>
            </div>
          )}

          {status === 'error' && (
            <div className="animate-fade-in">
              <div className="mx-auto mb-4 w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center">
                <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="text-2xl font-heading font-semibold mb-2 text-red-400">Invitación no válida</h1>
              <p className="text-slate-400">{message}</p>
              <Link href="/dashboard" className="inline-block mt-6 text-violet-400 hover:text-violet-300 font-medium">
                ← Volver al dashboard
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}