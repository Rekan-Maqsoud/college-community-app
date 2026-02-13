import { handleNetworkError } from '../app/utils/networkErrorHandler';

describe('networkErrorHandler', () => {
  it('returns unknown error fallback when error is null', () => {
    const result = handleNetworkError(null);
    expect(result).toEqual({
      isNetworkError: false,
      messageKey: 'errors.unknownError',
      fallbackMessage: 'Unknown error occurred',
    });
  });

  it('detects network errors by message and code', () => {
    expect(handleNetworkError(new Error('Network request failed')).isNetworkError).toBe(true);
    expect(handleNetworkError({ code: 'NETWORK_ERROR', message: 'x' }).isNetworkError).toBe(true);
    expect(handleNetworkError({ type: 'network', message: 'x' }).isNetworkError).toBe(true);
  });

  it('maps auth and not-found codes', () => {
    const auth = handleNetworkError({ code: 401, message: 'Unauthorized' });
    const forbidden = handleNetworkError({ code: 403, message: 'Forbidden' });
    const notFound = handleNetworkError({ code: 404, message: 'Not Found' });

    expect(auth.messageKey).toBe('errors.authError');
    expect(forbidden.messageKey).toBe('errors.authError');
    expect(notFound.messageKey).toBe('errors.notFound');
  });

  it('returns generic error for unknown errors', () => {
    const result = handleNetworkError(new Error('Something happened'));
    expect(result).toEqual({
      isNetworkError: false,
      messageKey: 'errors.genericError',
      fallbackMessage: 'Something happened',
    });
  });
});
