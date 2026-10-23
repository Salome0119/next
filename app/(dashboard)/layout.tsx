import { auth } from '@/auth';
import { DashboardNavigation } from '@/components/DashboardNavigation';
import { OnboardingTour } from '@/components/OnboardingTour';
import { ReactNode } from 'react';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  const hasCompletedOnboarding = session?.user?.hasCompletedOnboarding ?? false;
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100">
      <DashboardNavigation session={session} pathname="/dashboard" />
      <OnboardingTour autoStart={!hasCompletedOnboarding} hasCompletedOnboarding={hasCompletedOnboarding} />
      <main className="flex-1 pt-14">{children}</main>
    </div>
  );
}

// Force rebuild trigger
export const dynamic = 'force-dynamic';