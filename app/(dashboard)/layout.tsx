import { auth } from '@/auth';
import { DashboardNavigation } from '@/components/DashboardNavigation';
import { ReactNode } from 'react';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <DashboardNavigation session={session} pathname="/dashboard" />
      <main className="flex-1 pt-14">{children}</main>
    </div>
  );
}