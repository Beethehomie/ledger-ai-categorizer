
import { toast as sonnerToast } from "sonner";

export const toast = {
  success: (message: string) => sonnerToast.success(message),
  error: (message: string) => sonnerToast.error(message),
  info: (message: string, options?: any) => sonnerToast.info(message, options),
  warning: (message: string) => sonnerToast.warning(message),
};
