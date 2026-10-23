'use client';

import { useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/Toast';

export function useGlobalToast() {
  const { showToast } = useToast();

  const showSuccess = useCallback((title: string, message?: string, duration?: number) => {
    showToast({ type: 'success', title, message, duration });
  }, [showToast]);

  const showError = useCallback((title: string, message?: string, duration?: number) => {
    showToast({ type: 'error', title, message, duration });
  }, [showToast]);

  const showWarning = useCallback((title: string, message?: string, duration?: number) => {
    showToast({ type: 'warning', title, message, duration });
  }, [showToast]);

  const showInfo = useCallback((title: string, message?: string, duration?: number) => {
    showToast({ type: 'info', title, message, duration });
  }, [showToast]);

  return { showSuccess, showError, showWarning, showInfo, showToast };
}

export function useActionError() {
  const { showError } = useGlobalToast();

  const handleActionResult = useCallback(<T,>(result: { success: boolean; error?: string; errors?: Array<{ field: string; message: string }> }) => {
    if (!result.success) {
      if (result.errors && result.errors.length > 0) {
        result.errors.forEach((err) => {
          showError(`Error en ${err.field}`, err.message);
        });
      } else {
        showError('Error', result.error || 'Ha ocurrido un error inesperado');
      }
      return false;
    }
    return true;
  }, [showError]);

  const handleActionSuccess = useCallback(<T,>(result: { success: boolean; data?: T; error?: string }, successMessage?: string) => {
    if (result.success) {
      if (successMessage) {
        const { showSuccess } = useGlobalToast();
        showSuccess('Éxito', successMessage);
      }
      return true;
    }
    return handleActionResult(result);
  }, [showError, handleActionResult]);

  return { handleActionResult, handleActionSuccess };
}

export function useFormValidation() {
  const { showError } = useGlobalToast();

  const showFieldErrors = useCallback((errors: Array<{ field: string; message: string }>) => {
    errors.forEach((err) => {
      showError(`Error en ${err.field}`, err.message);
    });
  }, [showError]);

  return { showFieldErrors };
}