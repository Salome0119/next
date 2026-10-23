'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { getInvitations, revokeInvitation } from '@/app/actions/invitation-actions';
import { getWorkspaceMembers, updateMemberRole, removeMember, deleteWorkspace, getUserWorkspaceRole } from '@/app/actions/workspace-actions';
import { InviteMemberModal } from '@/components/InviteMemberModal';
import { Users, Crown, Shield, User, Trash2, Copy, X, AlertTriangle, ExternalLink } from 'lucide-react';

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
  const [userRole, setUserRole] = useState<'owner' | 'admin' | 'member' | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const canManageMembers = userRole === 'owner' || userRole === 'admin';
  const canDeleteWorkspace = userRole === 'owner';

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [invitationsData, membersData, roleData] = await Promise.all([
        getInvitations(workspaceId),
        getWorkspaceMembers(workspaceId),
        getUserWorkspaceRole(workspaceId),
      ]);
      setInvitations(invitationsData);
      setMembers(membersData);
      setUserRole(roleData);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Error cargando datos: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRevokeInvitation = async (invitationId: number) => {
    if (!canManageMembers) return;
    if (!confirm('¿Revocar esta invitación?')) return;
    try {
      await revokeInvitation(invitationId);
      loadData();
    } catch (error) {
      console.error('Error revoking invitation:', error);
    }
  };

  const handleUpdateMemberRole = async (userId: number, newRole: 'admin' | 'member') => {
    if (!canManageMembers) return;
    try {
      await updateMemberRole(workspaceId, userId, newRole);
      loadData();
    } catch (error) {
      console.error('Error updating role:', error);
    }
  };

  const handleRemoveMember = async (userId: number) => {
    if (!canManageMembers) return;
    if (!confirm('¿Remover a este miembro del workspace?')) return;
    try {
      await removeMember(workspaceId, userId);
      loadData();
    } catch (error) {
      console.error('Error removing member:', error);
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!canDeleteWorkspace) return;
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
      case 'pending': return 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30';
      case 'accepted': return 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
      case 'revoked': return 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30';
      case 'expired': return 'bg-slate-500/20 text-slate-600 dark:text-slate-400 border-slate-500/30';
      default: return 'bg-slate-500/20 text-slate-600 dark:text-slate-400 border-slate-500/30';
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

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30';
      case 'admin': return 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30';
      case 'member': return 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
      default: return 'bg-slate-500/20 text-slate-600 dark:text-slate-400 border-slate-500/30';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-violet-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl animate-fade-in">
      <header>
        <h1 className="text-2xl font-heading font-bold text-slate-900 dark:text-white">Ajustes del Workspace</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Gestiona miembros, invitaciones y configuración</p>
        {userRole && (
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-2">Tu rol: <span className="font-medium capitalize">{userRole}</span></p>
        )}
      </header>

      {/* Invitaciones */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-violet-600 dark:text-violet-400" aria-hidden="true" />
            Invitaciones
          </h2>
          {canManageMembers && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium rounded-xl px-4 py-2 shadow-sm shadow-violet-600/20 transition-all duration-200 flex items-center gap-2"
            >
              <Users className="w-4 h-4" aria-hidden="true" />
              Invitar miembro
            </button>
          )}
        </div>

        {invitations.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <p>No hay invitaciones pendientes</p>
          </div>
        ) : (
          <div className="space-y-3">
            {invitations.map(inv => (
              <div key={inv.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className={`px-2.5 py-1 text-xs font-medium rounded-full border ${getStatusColor(inv.status)}`}>
                    {inv.status}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{inv.email}</p>
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
                        className="px-3 py-1.5 text-xs bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-white rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                        Copiar
                      </button>
                      {canManageMembers && (
                        <button
                          onClick={() => handleRevokeInvitation(inv.id)}
                          className="px-3 py-1.5 text-xs bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg transition-colors flex items-center gap-1.5"
                        >
                          <X className="w-3.5 h-3.5" aria-hidden="true" />
                          Revocar
                        </button>
                      )}
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
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-violet-600 dark:text-violet-400" aria-hidden="true" />
          Miembros
        </h2>
        {members.length === 0 ? (
          <p className="text-slate-500 dark:text-slate-400 text-center py-4">No hay miembros</p>
        ) : (
          <div className="space-y-3">
            {members.map(member => (
              <div key={member.user_id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                    <span className="text-sm font-medium text-white">{member.name?.charAt(0).toUpperCase() || member.email.charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{member.name || member.email.split('@')[0]}</p>
                    <p className="text-xs text-slate-500">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full border ${getRoleColor(member.role)}`}>
                    {getRoleIcon(member.role)}
                    {member.role}
                  </span>
                  {canManageMembers && member.role !== 'owner' && (
                    <select
                      value={member.role}
                      onChange={e => handleUpdateMemberRole(member.user_id, e.target.value as 'admin' | 'member')}
                      className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-xs focus:outline-none focus:border-violet-500 transition-colors"
                    >
                      <option value="member" className="bg-white dark:bg-slate-800">Miembro</option>
                      <option value="admin" className="bg-white dark:bg-slate-800">Administrador</option>
                    </select>
                  )}
                  {canManageMembers && member.role !== 'owner' && (
                    <button
                      onClick={() => handleRemoveMember(member.user_id)}
                      className="p-2 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Remover miembro"
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Zona de peligro - Solo para owners */}
      {canDeleteWorkspace && (
        <section className="bg-white dark:bg-slate-900 border border-red-500/30 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" aria-hidden="true" />
            Zona de peligro
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">Eliminar el workspace eliminará todas las tareas, miembros e invitaciones permanentemente.</p>
          <button
            onClick={handleDeleteWorkspace}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-medium rounded-xl transition-colors flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
            Eliminar workspace
          </button>
        </section>
      )}
      
      {!canManageMembers && !canDeleteWorkspace && (
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center">
          <p className="text-slate-500 dark:text-slate-400 text-sm">No tienes permisos para gestionar este workspace. Contacta al propietario o administrador.</p>
        </section>
      )}
    </div>
  );
}