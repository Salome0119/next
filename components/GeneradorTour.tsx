'use client';

import { useEffect } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useTranslation } from '@/context/LanguageContext';

interface GeneradorTourProps {
  autoStart?: boolean;
  hasCompletedGeneradorTour?: boolean;
}

export function GeneradorTour({ autoStart = true, hasCompletedGeneradorTour = false }: GeneradorTourProps) {
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
            title: t('generador.tour.welcome'),
            description: t('generador.tour.welcomeDesc'),
          },
        },
        {
          element: '#tour-preset-prompts',
          popover: {
            title: t('generador.tour.presets.title'),
            description: t('generador.tour.presets.desc'),
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '#tour-prompt-input',
          popover: {
            title: t('generador.tour.prompt.title'),
            description: t('generador.tour.prompt.desc'),
            side: 'right',
            align: 'start',
          },
        },
        {
          element: '#tour-file-upload',
          popover: {
            title: t('generador.tour.file.title'),
            description: t('generador.tour.file.desc'),
            side: 'right',
            align: 'start',
          },
        },
        {
          element: '#tour-generate-btn',
          popover: {
            title: t('generador.tour.generate.title'),
            description: t('generador.tour.generate.desc'),
            side: 'top',
            align: 'center',
          },
        },
        {
          element: '#tour-workspace-select',
          popover: {
            title: t('generador.tour.workspace.title'),
            description: t('generador.tour.workspace.desc'),
            side: 'top',
            align: 'center',
          },
        },
        {
          element: '#tour-result-actions',
          popover: {
            title: t('generador.tour.result.title'),
            description: t('generador.tour.result.desc'),
            side: 'top',
            align: 'center',
          },
        },
        {
          element: '#tour-smart-paste',
          popover: {
            title: t('generador.tour.smartPaste.title'),
            description: t('generador.tour.smartPaste.desc'),
            side: 'top',
            align: 'center',
          },
        },
        {
          element: '#tour-history-btn',
          popover: {
            title: t('generador.tour.history.title'),
            description: t('generador.tour.history.desc'),
            side: 'left',
            align: 'center',
          },
        },
      ],
      onDestroyed: () => {
        localStorage.setItem('planai_generador_tour_completed', 'true');
        if (window.location.search.includes('new_user=true')) {
          window.history.replaceState({}, '', window.location.pathname);
        }
      },
    });

    driverObj.drive();
  };

  useEffect(() => {
    if (!autoStart) return;
    if (hasCompletedGeneradorTour) return;
    if (!isReady) return;

    const isNewUserUrl = window.location.search.includes('new_user=true');
    const isCompleted = localStorage.getItem('planai_generador_tour_completed') === 'true';

    if (isNewUserUrl || !isCompleted) {
      const timer = setTimeout(() => {
        runTour();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoStart, hasCompletedGeneradorTour, isReady]);

  return null;
}