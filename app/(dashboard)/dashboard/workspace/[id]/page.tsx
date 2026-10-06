import { getWorkspaceMembers } from '@/app/actions/workspace-actions';
import { getTareas } from '@/app/actions';
import { WorkspaceDashboardClient } from '@/components/WorkspaceDashboardClient';
import { notFound } from 'next/navigation';

interface WorkspacePageProps {
  params: Promise<{ id: string }>;
}

export default async function WorkspacePage({ params }: WorkspacePageProps) {
  const { id } = await params;
  const workspaceId = Number(id);

  if (isNaN(workspaceId)) {
    notFound();
  }

  try {
    const [tasksData, membersData] = await Promise.all([
      getTareas(1, 50, workspaceId),
      getWorkspaceMembers(workspaceId),
    ]);

    if (!tasksData || !membersData) {
      notFound();
    }

    return (
      <WorkspaceDashboardClient
        workspaceId={workspaceId}
        initialTasks={tasksData.tareas}
        initialMembers={membersData}
      />
    );
  } catch (error) {
    console.error('Error loading workspace data:', error);
    notFound();
  }
}