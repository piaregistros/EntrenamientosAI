function getCookie(name: string): string {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    const popped = parts.pop();
    if (popped) return popped.split(';').shift() || '';
  }
  return '';
}

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const csrfToken = getCookie('entrenamiento_csrf');

  let updatedInit: RequestInit = init ? { ...init } : {};
  const existingHeaders = updatedInit.headers || {};
  const method = updatedInit.method ? updatedInit.method.toUpperCase() : 'GET';

  const headers: Record<string, string> = {
    ...existingHeaders,
  } as Record<string, string>;

  // Inject CSRF token for mutating requests
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    headers['X-CSRF-Token'] = csrfToken;
  }

  updatedInit.headers = headers;
  updatedInit.credentials = 'include';

  const response = await fetch(input, updatedInit);
  if (response.status === 401) {
    window.dispatchEvent(new Event('unauthorized'));
  }
  return response;
}
