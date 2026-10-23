'use client';

import { useEffect } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { updateOnboardingStatus } from '@/app/actions/auth-actions';
import { useTranslation } from '@/context/LanguageContext';

interface OnboardingTourProps {
  autoStart?: boolean;
  hasCompletedOnboarding?: boolean;
}

export function OnboardingTour({ autoStart = true, hasCompletedOnboarding = false }: OnboardingTourProps) {
  const { t, isReady } = useTranslation();

  const runTour = () => {
    const driverObj = driver({
      showProgress: true,
      animate: true,
      allowClose: true,
      nextBtnText: t('common.next'),
      prevBtnText: t('common.previous'),
      doneBtnText: t('common.confirm'),
      steps: [
        {
          popover: {
            title: t('onboarding.welcome'),
            description: t('onboarding.welcomeDesc'),
          },
        },
        {
          element: '#tour-quick-task',
          popover: {
            title: t('onboarding.quickTask.title'),
            description: t('onboarding.quickTask.desc'),
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '#tour-workspace-select',
          popover: {
            title: t('onboarding.workspace.title'),
            description: t('onboarding.workspace.desc'),
            side: 'bottom',
            align: 'center',
          },
        },
        {
          element: '#tour-ai-generator',
          popover: {
            title: t('onboarding.aiGenerator.title'),
            description: t('onboarding.aiGenerator.desc'),
            side: 'bottom',
            align: 'center',
          },
        },
      ],
      onDestroyed: async () => {
        localStorage.setItem('planai_onboarding_completed', 'true');
        await updateOnboardingStatus(true);
        if (window.location.search.includes('new_user=true')) {
          window.history.replaceState({}, '', window.location.pathname);
        }
      },
    });

    driverObj.drive();
  };

  useEffect(() => {
    if (!autoStart) return;
    if (hasCompletedOnboarding) return;
    if (!isReady) return;

    const isNewUserUrl = window.location.search.includes('new_user=true');
    const isCompleted = localStorage.getItem('planai_onboarding_completed') === 'true';

    if (isNewUserUrl || !isCompleted) {
      const timer = setTimeout(() => {
        runTour();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [autoStart, hasCompletedOnboarding, isReady]);

  return null;
}