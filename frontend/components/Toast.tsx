'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

let toastId = 0;
let globalShowToast: ((message: string, type?: ToastType, duration?: number) => void) | null = null;

export function showToast(message: string, type: ToastType = 'info', duration?: number) {
  if (globalShowToast) {
    globalShowToast(message, type, duration);
  } else {
    console.warn('Toast system not initialized');
  }
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToastInternal = (message: string, type: ToastType = 'info', duration: number = 5000) => {
    const id = `toast-${toastId++}`;
    const newToast: Toast = { id, message, type, duration };
    setToasts(prev => [...prev, newToast]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  useEffect(() => {
    globalShowToast = showToastInternal;
    return () => {
      globalShowToast = null;
    };
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast: showToastInternal, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(onRemove, toast.duration);
      return () => clearTimeout(timer);
    }
  }, [toast.duration, onRemove]);

  const getToastStyles = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-green-500/10 border-green-500/20 text-green-200';
      case 'error':
        return 'bg-red-500/10 border-red-500/20 text-red-200';
      case 'warning':
        return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-200';
      case 'info':
      default:
        return 'bg-blue-500/10 border-blue-500/20 text-blue-200';
    }
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'info':
      default:
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border backdrop-blur-sm ${getToastStyles()} transition-all duration-300 animate-slide-in`}
    >
      <div className="flex-shrink-0">{getIcon()}</div>
      <p className="text-sm font-medium">{toast.message}</p>
      <button
        onClick={onRemove}
        className="ml-auto flex-shrink-0 p-1 rounded hover:bg-white/10 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export function ToastContainer() {
  const [mounted, setMounted] = useState(false);
  const context = React.useContext(ToastContext);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !context) return null;

  return createPortal(
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {context.toasts.map(toast => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onRemove={() => context.removeToast(toast.id)}
        />
      ))}
    </div>,
    document.body
  );
}

// Add animation styles to globals.css
const toastStyles = `
@keyframes slide-in {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.animate-slide-in {
  animation: slide-in 0.3s ease-out;
}
`;