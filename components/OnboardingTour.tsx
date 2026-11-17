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
  const { t, language, isReady } = useTranslation();
  const isEn = language === 'en';

  const tx = (key: string, fallback: string): string => {
    const value = t(key);
    return value === key ? fallback : value;
  };

  const runTour = () => {
    const driverObj = driver({
      showProgress: true,
      progressText: tx('onboarding.navigation.progress', isEn ? '{{current}} of {{total}}' : '{{current}} de {{total}}'),
      animate: true,
      allowClose: true,
      overlayColor: '#020617',
      overlayOpacity: 0.72,
      nextBtnText: tx('onboarding.navigation.next', isEn ? 'Next' : 'Siguiente'),
      prevBtnText: tx('onboarding.navigation.previous', isEn ? 'Back' : 'Anterior'),
      doneBtnText: tx('onboarding.navigation.finish', isEn ? 'Finish' : 'Finalizar'),
      closeBtnLabel: tx('onboarding.navigation.close', isEn ? 'Close guide' : 'Cerrar guía'),
      popoverClass: 'planai-tour-popover',
      steps: [
        {
          popover: {
            title: tx('onboarding.welcome', isEn ? 'Welcome to PlanAI!' : '¡Bienvenida a PlanAI!'),
            description: tx(
              'onboarding.welcomeDesc',
              isEn
                ? 'This is your smart space to organize tasks, collaborate in teams, and boost your productivity with AI.'
                : 'Este es tu espacio inteligente para organizar tareas, colaborar en equipos y potenciar tu productividad con IA.'
            ),
          },
        },
        {
          element: '#tour-quick-task',
          popover: {
            title: tx('onboarding.quickTask.title', isEn ? 'Task Creation & Management' : 'Creación y Gestión de Tareas'),
            description: tx(
              'onboarding.quickTask.desc',
              isEn
                ? 'Add quick tasks, assign priority, tags and due dates intuitively.'
                : 'Añade tareas rápidas, asígnales prioridad, etiquetas y fechas de entrega de forma intuitiva.'
            ),
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '#tour-ai-generator',
          popover: {
            title: tx('onboarding.aiGenerator.title', isEn ? 'AI Generator' : 'Generador de IA'),
            description: tx(
              'onboarding.aiGenerator.desc',
              isEn
                ? 'Use our built-in AI to extract tasks from documents, generate summaries or draft content automatically.'
                : 'Usa nuestra inteligencia artificial integrada para extraer tareas de documentos, generar resúmenes o redactar contenido automáticamente.'
            ),
            side: 'bottom',
            align: 'center',
          },
        },
        {
          element: '#tour-workspace-select',
          popover: {
            title: tx('onboarding.workspace.title', isEn ? 'Workspaces' : 'Espacios de Trabajo (Workspaces)'),
            description: tx(
              'onboarding.workspace.desc',
              isEn
                ? 'Switch between your workspaces or invite collaborators to work as a team.'
                : 'Cambia entre tus diferentes workspaces o invita a colaboradores para trabajar en equipo.'
            ),
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, hasCompletedOnboarding, isReady, language]);

  return null;
}
