'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ReactNode, useState, useEffect } from 'react';

interface Tab {
  id: string;
  label: string;
  icon: ReactNode;
  href: string;
}

interface SettingsTabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function SettingsTabs({ tabs, activeTab, onTabChange }: SettingsTabsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <nav className="card rounded-2xl p-2 sticky top-20 h-fit border border-border bg-card" aria-label="Configuración">
      <ul className="space-y-1" role="tablist">
        {tabs.map((tab) => {
          const isActive = mounted ? activeTab === tab.id : false;
          const href = `${pathname}?tab=${tab.id}`;
          
          return (
            <li key={tab.id} role="presentation">
              <Link
                href={href}
                onClick={(e) => {
                  e.preventDefault();
                  onTabChange(tab.id);
                  window.history.pushState({}, '', href);
                }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-lg'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
                role="tab"
                aria-selected={isActive}
                aria-controls={`panel-${tab.id}`}
                id={`tab-${tab.id}`}
                suppressHydrationWarning
              >
                <span className="flex-shrink-0" aria-hidden="true">{tab.icon}</span>
                <span className="font-medium">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}