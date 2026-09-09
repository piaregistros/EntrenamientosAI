export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const csrfToken = sessionStorage.getItem('csrf_token') || '';
  
  // Retrieve the session ID from the saved user in localStorage to bypass cookie blocking in iframes
  const savedUser = localStorage.getItem('entrenamiento_user');
  let userId = '';
  if (savedUser) {
    try {
      userId = JSON.parse(savedUser).id;
    } catch (e) {
      // Ignore
    }
  }

  let updatedInit: RequestInit = init ? { ...init } : {};
  const existingHeaders = updatedInit.headers || {};
  const method = updatedInit.method ? updatedInit.method.toUpperCase() : 'GET';

  const headers: Record<string, string> = {
    ...existingHeaders,
  } as Record<string, string>;

  // Inject Bearer token if user exists
  if (userId) {
    headers['Authorization'] = `Bearer ${userId}`;
  }

  // Inject CSRF token for mutating requests
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    headers['X-CSRF-Token'] = csrfToken;
  }

  updatedInit.headers = headers;

  const response = await fetch(input, updatedInit);
  if (response.status === 401) {
    window.dispatchEvent(new Event('unauthorized'));
  }
  return response;
}
