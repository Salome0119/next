'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { getInvitations, revokeInvitation } from '@/app/actions/invitation-actions';
import { getWorkspaceMembers, updateMemberRole, removeMember, deleteWorkspace } from '@/app/actions/workspace-actions';
import { WorkspaceLayout } from '@/components/WorkspaceLayout';
import { InviteMemberModal } from '@/components/InviteMemberModal';

interface Invitation {
  id: number;
  workspace_id: number;
  email: string;
  role: string;
  token: string;
  status: string;
  invited_by: number;
  expires_at: string;
  created_at: string;
  accepted_at: string | null;
  invited_by_name: string | null;
  invited_by_email: string | null;
}

interface WorkspaceMember {
  id: number;
  workspace_id: number;
  user_id: number;
  role: string;
  joined_at: string;
  email: string;
  name: string | null;
}

export default function WorkspaceSettingsPage() {
  const params = useParams();
  const workspaceId = Number(params.id);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [invitationsData, membersData] = await Promise.all([
        getInvitations(workspaceId),
        getWorkspaceMembers(workspaceId),
      ]);
      console.log('Loaded invitations:', invitationsData);
      console.log('Loaded members:', membersData);
      setInvitations(invitationsData);
      setMembers(membersData);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Error cargando datos: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [workspaceId, loadData]);

  const handleRevokeInvitation = async (invitationId: number) => {
    if (!confirm('¿Revocar esta invitación?')) return;
    try {
      await revokeInvitation(invitationId);
      loadData();
    } catch (error) {
      console.error('Error revoking invitation:', error);
    }
  };

  const handleUpdateMemberRole = async (userId: number, newRole: 'admin' | 'member') => {
    try {
      await updateMemberRole(workspaceId, userId, newRole);
      loadData();
    } catch (error) {
      console.error('Error updating role:', error);
    }
  };

  const handleRemoveMember = async (userId: number) => {
    if (!confirm('¿Remover a este miembro del workspace?')) return;
    try {
      await removeMember(workspaceId, userId);
      loadData();
    } catch (error) {
      console.error('Error removing member:', error);
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!confirm('¿Eliminar este workspace permanentemente? Esta acción no se puede deshacer.')) return;
    try {
      await deleteWorkspace(workspaceId);
      window.location.href = '/dashboard';
    } catch (error) {
      console.error('Error deleting workspace:', error);
    }
  };

  const copyInviteLink = (token: string) => {
    const url = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(url);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'accepted': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'revoked': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'expired': return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
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

  if (loading) {
    return (
      <WorkspaceLayout workspaceId={workspaceId} workspaceName="Ajustes">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent" />
        </div>
      </WorkspaceLayout>
    );
  }

  return (
    <WorkspaceLayout workspaceId={workspaceId} workspaceName="Ajustes">
      <div className="space-y-6 max-w-3xl">
        <header>
          <h1 className="text-2xl font-bold text-blue-400 font-orbitron tracking-wider">Ajustes del Workspace</h1>
          <p className="text-slate-500 text-sm mt-1">Gestiona miembros, invitaciones y configuración</p>
        </header>

        {/* Invitaciones */}
        <section className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-100">Invitaciones</h2>
            <button
              onClick={() => setShowInviteModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Invitar miembro
            </button>
          </div>

          {invitations.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <p>No hay invitaciones pendientes</p>
            </div>
          ) : (
            <div className="space-y-3">
              {invitations.map(inv => (
                <div key={inv.id} className="flex items-center justify-between p-3 bg-slate-900/30 rounded-lg border border-slate-700/50">
                  <div className="flex items-center gap-3">
                    <div className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(inv.status)}`}>
                      {inv.status}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-100">{inv.email}</p>
                      <p className="text-xs text-slate-500">
                        Rol: {inv.role} • Expira: {new Date(inv.expires_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {inv.status === 'pending' && (
                      <>
                        <button
                          onClick={() => copyInviteLink(inv.token)}
                          className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
                        >
                          Copiar enlace
                        </button>
                        <button
                          onClick={() => handleRevokeInvitation(inv.id)}
                          className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-500 text-white rounded transition-colors"
                        >
                          Revocar
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <InviteMemberModal
            workspaceId={workspaceId}
            isOpen={showInviteModal}
            onClose={() => setShowInviteModal(false)}
            onSuccess={loadData}
          />
        </section>

        {/* Miembros */}
        <section className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6">
          <h2 className="text-lg font-semibold text-slate-100 mb-4">Miembros</h2>
          {members.length === 0 ? (
            <p className="text-slate-500 text-center py-4">No hay miembros</p>
          ) : (
            <div className="space-y-3">
              {members.map(member => (
                <div key={member.user_id} className="flex items-center justify-between p-3 bg-slate-900/30 rounded-lg border border-slate-700/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <span className="text-sm">{member.name?.charAt(0).toUpperCase() || member.email.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-100">{member.name || member.email.split('@')[0]}</p>
                      <p className="text-xs text-slate-500">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs rounded-full border ${getRoleColor(member.role)}`}>
                      {member.role}
                    </span>
                    {member.role !== 'owner' && (
                      <select
                        value={member.role}
                        onChange={e => handleUpdateMemberRole(member.user_id, e.target.value as 'admin' | 'member')}
                        className="px-2 py-1 bg-slate-900/50 border border-slate-600 rounded text-white text-xs focus:outline-none focus:border-blue-500"
                      >
                        <option value="member">Miembro</option>
                        <option value="admin">Admin</option>
                      </select>
                    )}
                    {member.role !== 'owner' && (
                      <button
                        onClick={() => handleRemoveMember(member.user_id)}
                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                        title="Remover miembro"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Zona de peligro */}
        <section className="bg-slate-800/50 rounded-2xl border border-red-500/30 p-6">
          <h2 className="text-lg font-semibold text-red-400 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Zona de peligro
          </h2>
          <p className="text-slate-500 text-sm mb-4">Eliminar el workspace eliminará todas las tareas, miembros e invitaciones permanentemente.</p>
          <button
            onClick={handleDeleteWorkspace}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
          >
            Eliminar workspace
          </button>
        </section>
      </div>
    </WorkspaceLayout>
  );
}