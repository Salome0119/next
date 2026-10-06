'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { getWorkspaceMembersWithInvitations, inviteMemberToWorkspaceAction } from '@/app/actions/workspace-actions';
import { WorkspaceLayout } from '@/components/WorkspaceLayout';
import { InviteMemberModal } from '@/components/InviteMemberModal';

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
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviting, setInviting] = useState(false);

  const loadMembers = async () => {
    setLoading(true);
    try {
      const data = await getWorkspaceMembersWithInvitations(workspaceId);
      setMembers(data);
    } catch (error) {
      console.error('Error loading team members:', error);
      alert('Error cargando miembros: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, [workspaceId]);

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

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'admin': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'member': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
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
      <WorkspaceLayout workspaceId={workspaceId} workspaceName="Equipo">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent" />
        </div>
      </WorkspaceLayout>
    );
  }

  return (
    <WorkspaceLayout workspaceId={workspaceId} workspaceName="Equipo">
      <div className="space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-blue-400 font-orbitron tracking-wider">Equipo</h1>
            <p className="text-slate-500 text-sm mt-1">Gestiona los miembros del workspace</p>
          </div>
          <button
            onClick={() => setShowInviteModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            + Invitar miembro
          </button>
        </header>

        {members.length === 0 ? (
          <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-10 text-center">
            <div className="mx-auto mb-4 w-20 h-20 rounded-full bg-slate-700/50 flex items-center justify-center">
              <span className="text-4xl">👥</span>
            </div>
            <h2 className="text-lg font-medium text-slate-300 mb-2">No hay miembros en el equipo</h2>
            <p className="text-slate-500 text-sm max-w-sm mx-auto mb-6">
              Invita a tus compañeros para empezar a colaborar
            </p>
            <button
              onClick={() => setShowInviteModal(true)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-colors flex items-center gap-2 mx-auto"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Invitar primer miembro
            </button>
          </div>
        ) : (
          <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 overflow-hidden">
            <ul className="divide-y divide-slate-700/50" role="list">
              {members.map(member => (
                <li key={member.id} className="p-4 hover:bg-slate-800/30 transition-colors flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-medium ${getAvatarColor(member.email)}`}>
                    {getInitials(member.name, member.email)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-slate-100 truncate">
                        {member.name || member.email.split('@')[0]}
                      </p>
                      <span className={`px-2 py-0.5 text-xs rounded-full border ${getRoleColor(member.role)}`}>
                        {getRoleLabel(member.role)}
                      </span>
                      {member.invitation_status === 'pending' && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          Pendiente
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 truncate">{member.email}</p>
                    {member.invitation_status === 'pending' && member.invitation_expires_at && (
                      <p className="text-xs text-slate-500 mt-1">
                        Expira: {new Date(member.invitation_expires_at).toLocaleDateString('es-ES')}
                        {member.invited_by && <span className="ml-2"> • Invitado por: {member.invited_by}</span>}
                      </p>
                    )}
                  </div>
                  {member.invitation_status === 'pending' && (
                    <span className="px-3 py-1.5 text-sm font-medium text-amber-400 bg-amber-500/10 rounded-lg">
                      Invitación pendiente
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <InviteMemberModal
          workspaceId={workspaceId}
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          onSuccess={handleInviteSuccess}
        />
      </div>
    </WorkspaceLayout>
  );
}