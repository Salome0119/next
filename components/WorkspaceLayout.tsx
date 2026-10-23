'use client';

import { ReactNode } from 'react';

interface WorkspaceLayoutProps {
  children: ReactNode;
  workspaceId: number;
  workspaceName: string;
}

export function WorkspaceLayout({ children, workspaceId, workspaceName }: WorkspaceLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 flex flex-col">
      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6 w-full">{children}</div>
      </main>
    </div>
  );
}