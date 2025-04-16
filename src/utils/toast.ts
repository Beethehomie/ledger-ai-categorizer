
import { toast as sonnerToast } from "sonner";

type ToastType = "success" | "error" | "info" | "warning";

// Define our own ToastOptions type since sonner's is not exported
interface ToastOptions {
  id?: string | number;
  duration?: number;
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

/**
 * Toast utility for showing notifications
 * Wrapper around sonner toast with predefined types
 */
export const toast: Toast = {
  success: (message: string, options?: ToastOptions) => sonnerToast.success(message, options),
  error: (message: string, options?: ToastOptions) => sonnerToast.error(message, options),
  info: (message: string, options?: ToastOptions) => sonnerToast.info(message, options),
  warning: (message: string, options?: ToastOptions) => sonnerToast.warning(message, options),
};
