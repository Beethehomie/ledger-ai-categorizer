
/**
 * Logs errors in a standardized format with additional contextual information
 * @param context The context where the error occurred
 * @param error The error object
 * @returns The original error for chaining
 */
export function logError(context: string, error: any) {
  console.error(
    `[ERROR][${context}]`,
    error instanceof Error 
      ? { 
          message: error.message, 
          stack: error.stack,
          name: error.name 
        } 
      : error
  );
  
  // For development - add more detailed logging
  if (process.env.NODE_ENV !== 'production') {
    console.group(`[ERROR DETAILS][${context}]`);
    console.error('Error object:', error);
    
    // Extract any response data if available (for fetch/API errors)
    if (error?.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    
    // Extract Supabase specific error details
    if (error?.code && error?.details) {
      console.error('Supabase error code:', error.code);
      console.error('Supabase error details:', error.details);
      console.error('Supabase error hint:', error.hint);
    }
    
    // Log any additional context-specific data
    console.error('Error time:', new Date().toISOString());
    console.groupEnd();
  }
  
  return error;
}

// Export with a default object as well to support both syntax styles
export default {
  logError
};
