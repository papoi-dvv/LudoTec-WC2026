export function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
}

export async function fetchApi<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    credentials: 'include',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const retryText = payload?.retryAfterSeconds ? ` Intenta nuevamente en ${payload.retryAfterSeconds}s.` : ''
    throw new Error(`${payload?.error || 'API request failed'}${retryText}`)
  }

  return payload as T
}
