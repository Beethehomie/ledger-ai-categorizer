
import { toast as sonnerToast } from "sonner";

type ToastType = "success" | "error" | "info" | "warning";

// Define our own ToastOptions type since sonner's is not exported
interface ToastOptions {
  id?: string | number;
  duration?: number; // Default duration will be 8000ms (8 seconds)
  icon?: React.ReactNode;
  promise?: Promise<any>;
  description?: React.ReactNode;
  position?: 'top-center' | 'top-right' | 'top-left' | 'bottom-center' | 'bottom-right' | 'bottom-left';
  className?: string;
  [key: string]: any;
}

interface ToastFunction {
  (message: string, options?: ToastOptions): void;
}

interface Toast {
  success: ToastFunction;
  error: ToastFunction;
  info: ToastFunction;
  warning: ToastFunction;
}

// Default duration for all toasts - 8 seconds
const DEFAULT_DURATION = 8000;

/**
 * Toast utility for showing notifications
 * Wrapper around sonner toast with predefined types and extended duration
 */
export const toast: Toast = {
  success: (message: string, options?: ToastOptions) => 
    sonnerToast.success(message, { duration: DEFAULT_DURATION, ...options }),
  error: (message: string, options?: ToastOptions) => 
    sonnerToast.error(message, { duration: DEFAULT_DURATION, ...options }),
  info: (message: string, options?: ToastOptions) => 
    sonnerToast.info(message, { duration: DEFAULT_DURATION, ...options }),
  warning: (message: string, options?: ToastOptions) => 
    sonnerToast.warning(message, { duration: DEFAULT_DURATION, ...options }),
};
