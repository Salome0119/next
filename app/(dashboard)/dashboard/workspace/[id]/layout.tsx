import { getWorkspaceMembers } from '@/app/actions/workspace-actions';
import { getTareas } from '@/app/actions';
import { WorkspaceHeader } from '@/components/WorkspaceHeader';
import { WorkspaceDashboardClient } from '@/components/WorkspaceDashboardClient';
import { notFound } from 'next/navigation';
import { ReactNode } from 'react';

interface WorkspaceLayoutProps {
  children: ReactNode;
  params: Promise<{ id: string }>;
}

export default async function WorkspaceLayout({ children, params }: WorkspaceLayoutProps) {
  const { id } = await params;
  const workspaceId = Number(id);

  if (isNaN(workspaceId)) {
    notFound();
  }

  let tasksData;
  let membersData;

  try {
    const [tasksResult, membersResult] = await Promise.all([
      getTareas(1, 50, workspaceId),
      getWorkspaceMembers(workspaceId),
    ]);

    tasksData = tasksResult;
    membersData = membersResult;
  } catch (error) {
    console.error('Error loading workspace data:', error);
    notFound();
  }

  if (!tasksData || !membersData) {
    notFound();
  }

  const workspaceName = `Workspace ${workspaceId}`;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 transition-colors duration-200 flex flex-col">
      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6 w-full">
          <WorkspaceHeader workspaceId={workspaceId} workspaceName={workspaceName} />
          {children}
        </div>
      </main>
    </div>
  );
}