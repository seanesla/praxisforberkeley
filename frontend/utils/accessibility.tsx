import React, { KeyboardEvent, MouseEvent } from 'react';

/**
 * Makes a non-interactive element keyboard accessible
 */
export function makeInteractive<T extends HTMLElement = HTMLElement>(
  onClick: () => void,
  options?: {
    role?: string;
    ariaLabel?: string;
    ariaPressed?: boolean;
    ariaExpanded?: boolean;
    ariaControls?: string;
    ariaDescribedBy?: string;
  }
) {
  return {
    role: options?.role || 'button',
    tabIndex: 0,
    'aria-label': options?.ariaLabel,
    'aria-pressed': options?.ariaPressed,
    'aria-expanded': options?.ariaExpanded,
    'aria-controls': options?.ariaControls,
    'aria-describedby': options?.ariaDescribedBy,
    onClick,
    onKeyDown: (e: KeyboardEvent<T>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick();
      }
    },
  };
}

/**
 * Handles both click and keyboard events for interactive elements
 */
export function handleInteraction<T extends HTMLElement = HTMLElement>(
  handler: () => void
) {
  return {
    onClick: handler,
    onKeyDown: (e: KeyboardEvent<T>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handler();
      }
    },
  };
}

/**
 * Traps focus within a modal or dialog
 */
export function useFocusTrap(containerRef: React.RefObject<HTMLElement>) {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Tab' || !containerRef.current) return;

    const focusableElements = containerRef.current.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    if (e.shiftKey && document.activeElement === firstElement) {
      e.preventDefault();
      lastElement.focus();
    } else if (!e.shiftKey && document.activeElement === lastElement) {
      e.preventDefault();
      firstElement.focus();
    }
  };

  return { onKeyDown: handleKeyDown };
}

/**
 * Announces text to screen readers
 */
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
) {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.className = 'sr-only';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Skip to main content link
 */
export function SkipToMainContent() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-white text-black px-4 py-2 rounded-md z-50"
    >
      Skip to main content
    </a>
  );
}

/**
 * Visually hidden but accessible to screen readers
 */
export function VisuallyHidden({ children }: { children: React.ReactNode }) {
  return <span className="sr-only">{children}</span>;
}

/**
 * Loading state with proper ARIA attributes
 */
export function AccessibleLoadingState({ label = 'Loading' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" aria-label={label}>
      <span className="sr-only">{label}</span>
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
    </div>
  );
}

/**
 * Error message with proper ARIA attributes
 */
export function AccessibleError({ 
  error, 
  id 
}: { 
  error: string | null; 
  id: string;
}) {
  if (!error) return null;
  
  return (
    <div 
      id={id}
      role="alert"
      aria-live="assertive"
      className="text-red-500 text-sm mt-1"
    >
      {error}
    </div>
  );
}

/**
 * Form field with proper labels and error handling
 */
export interface AccessibleFieldProps {
  label: string;
  id: string;
  error?: string | null;
  required?: boolean;
  description?: string;
}

export function getFieldProps({
  label,
  id,
  error,
  required,
  description,
}: AccessibleFieldProps) {
  const errorId = `${id}-error`;
  const descriptionId = `${id}-description`;
  
  return {
    labelProps: {
      htmlFor: id,
      className: 'block text-sm font-medium mb-1',
    },
    inputProps: {
      id,
      'aria-required': required,
      'aria-invalid': !!error,
      'aria-describedby': [
        error && errorId,
        description && descriptionId,
      ].filter(Boolean).join(' ') || undefined,
    },
    errorProps: {
      id: errorId,
    },
    descriptionProps: {
      id: descriptionId,
      className: 'text-sm text-gray-500 mt-1',
    },
  };
}