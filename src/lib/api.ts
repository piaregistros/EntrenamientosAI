function getCookie(name: string): string {
  const cookies = document.cookie.split(';');

  for (const cookie of cookies) {
    const separator = cookie.indexOf('=');
    if (separator === -1) continue;

    const cookieName = cookie.slice(0, separator).trim();
    if (cookieName !== name) continue;

    return decodeURIComponent(cookie.slice(separator + 1).trim());
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
