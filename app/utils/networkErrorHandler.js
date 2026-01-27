// Returns error info with translatable message keys
// Callers should use t(result.messageKey) or fall back to result.fallbackMessage
export const handleNetworkError = (error) => {
  if (!error) {
    return {
      isNetworkError: false,
      messageKey: 'errors.unknownError',
      fallbackMessage: 'Unknown error occurred'
    };
  }

  const errorString = error.toString().toLowerCase();
  const errorMessage = error.message?.toLowerCase() || '';
  
  const isNetworkError = 
    errorString.includes('network') ||
    errorString.includes('fetch') ||
    errorString.includes('timeout') ||
    errorMessage.includes('network') ||
    errorMessage.includes('fetch') ||
    errorMessage.includes('timeout') ||
    error.code === 'NETWORK_ERROR' ||
    error.type === 'network';

  if (isNetworkError) {
    return {
      isNetworkError: true,
      messageKey: 'errors.noInternet',
      fallbackMessage: 'No internet connection. Please check your network and try again.'
    };
  }

  if (error.code === 401 || error.code === 403) {
    return {
      isNetworkError: false,
      messageKey: 'errors.authError',
      fallbackMessage: 'Authentication error. Please sign in again.'
    };
  }

  if (error.code === 404) {
    return {
      isNetworkError: false,
      messageKey: 'errors.notFound',
      fallbackMessage: 'Resource not found.'
    };
  }

  return {
    isNetworkError: false,
    messageKey: 'errors.genericError',
    fallbackMessage: error.message || 'An error occurred. Please try again.'
  };
};
