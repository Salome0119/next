'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { getWorkspaceMembersWithInvitations, inviteMemberToWorkspaceAction, getUserWorkspaceRole } from '@/app/actions/workspace-actions';
import { InviteMemberModal } from '@/components/InviteMemberModal';
import { Users, Crown, Shield, User } from 'lucide-react';

interface WorkspaceMember {
  id: number;
  workspace_id: number;
  user_id: number | null;
  role: string;
  joined_at: string;
  email: string;
  name: string | null;
  invitation_status: 'accepted' | 'pending';
  invitation_id: number | null;
  invitation_expires_at: string | null;
  invited_by: string | null;
}

export default function TeamViewPage() {
  const params = useParams();
  const workspaceId = Number(params.id);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [userRole, setUserRole] = useState<'owner' | 'admin' | 'member' | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviting, setInviting] = useState(false);

  const canManageMembers = userRole === 'owner' || userRole === 'admin';

  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      const [data, roleData] = await Promise.all([
        getWorkspaceMembersWithInvitations(workspaceId),
        getUserWorkspaceRole(workspaceId),
      ]);
      setMembers(data);
      setUserRole(roleData);
    } catch (error) {
      console.error('Error loading team members:', error);
      alert('Error cargando miembros: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const handleInviteSuccess = () => {
    setShowInviteModal(false);
    loadMembers();
  };

  const handleInviteSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const role = formData.get('role') as 'admin' | 'member';

    if (!email.trim() || inviting) return;

    setInviting(true);
    try {
      const result = await inviteMemberToWorkspaceAction({ workspaceId, email: email.trim().toLowerCase(), role });
      if (result.success) {
        handleInviteSuccess();
      } else {
        alert('Error: ' + result.error);
      }
    } catch (error) {
      console.error('Error inviting member:', error);
      alert('Error al enviar la invitación');
    } finally {
      setInviting(false);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner': return 'Propietario';
      case 'admin': return 'Administrador';
      case 'member': return 'Miembro';
      default: return role;
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown className="w-3 h-3" aria-hidden="true" />;
      case 'admin': return <Shield className="w-3 h-3" aria-hidden="true" />;
      case 'member': return <User className="w-3 h-3" aria-hidden="true" />;
      default: return <User className="w-3 h-3" aria-hidden="true" />;
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30';
      case 'admin': return 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30';
      case 'member': return 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
      default: return 'bg-slate-500/20 text-slate-600 dark:text-slate-400 border-slate-500/30';
    }
  };

  const getInitials = (name: string | null, email: string) => {
    if (name && name.trim()) {
      return name.trim().split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email.split('@')[0].toUpperCase().slice(0, 2);
  };

  const getAvatarColor = (email: string) => {
    const colors = [
      'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500',
      'bg-pink-500', 'bg-cyan-500', 'bg-orange-500', 'bg-red-500',
    ];
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
      hash = email.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-violet-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-slate-900 dark:text-white">Equipo</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Gestiona los miembros del workspace</p>
          {userRole && (
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Tu rol: <span className="font-medium capitalize">{userRole}</span></p>
          )}
        </div>
        {canManageMembers && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium rounded-xl px-4 py-2 shadow-sm shadow-violet-600/20 transition-all duration-200 flex items-center gap-2"
          >
            <Users className="w-4 h-4" aria-hidden="true" />
            <span>+ Invitar miembro</span>
          </button>
        )}
      </header>

      {members.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center animate-slide-up">
          <div className="mx-auto mb-4 w-20 h-20 rounded-2xl bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 flex items-center justify-center">
            <Users className="w-10 h-10 text-slate-400 dark:text-slate-500" aria-hidden="true" />
          </div>
          <h2 className="text-lg font-heading font-medium text-slate-900 dark:text-slate-100 mb-2">No hay miembros en el equipo</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mx-auto mb-6">
            Invita a tus compañeros para empezar a colaborar
          </p>
          {canManageMembers && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium rounded-xl px-6 py-3 shadow-md shadow-violet-600/20 transition-all duration-200 flex items-center gap-2 mx-auto"
            >
              <Users className="w-5 h-5" aria-hidden="true" />
              Invitar primer miembro
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden animate-slide-up">
          <ul className="divide-y divide-slate-200/60 dark:divide-slate-800/40" role="list">
            {members.map(member => (
              <li key={member.id} className="p-4 sm:p-6 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-medium ${getAvatarColor(member.email)}`}>
                    {getInitials(member.name, member.email)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-slate-900 dark:text-slate-100 truncate">
                        {member.name || member.email.split('@')[0]}
                      </p>
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full border ${getRoleBadgeClass(member.role)}`}>
                        {getRoleIcon(member.role)}
                        {getRoleLabel(member.role)}
                      </span>
                      {member.invitation_status === 'pending' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
                          Pendiente
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 truncate mt-1">{member.email}</p>
                    {member.invitation_status === 'pending' && member.invitation_expires_at && (
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Expira: {new Date(member.invitation_expires_at).toLocaleDateString('es-ES')}
                        {member.invited_by && <span className="ml-1">· Invitado por: {member.invited_by}</span>}
                      </p>
                    )}
                  </div>
                  {member.invitation_status === 'pending' && (
                    <span className="px-3 py-1.5 text-sm font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded-lg whitespace-nowrap">
                      Invitación pendiente
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!canManageMembers && members.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center animate-slide-up">
          <p className="text-slate-500 dark:text-slate-400 text-sm">No tienes permisos para gestionar miembros. Contacta al propietario o administrador.</p>
        </div>
      )}

      <InviteMemberModal
        workspaceId={workspaceId}
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onSuccess={handleInviteSuccess}
      />
    </div>
  );
}