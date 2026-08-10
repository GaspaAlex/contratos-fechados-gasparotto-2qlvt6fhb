import PocketBase from 'pocketbase'

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)
pb.autoCancellation(false)

let refreshPromise: Promise<boolean> | null = null

function isAuthRefreshRequest(url: string): boolean {
  return url.includes('/auth-refresh')
}

function isTokenExpiringSoon(): boolean {
  const token = pb.authStore.token
  if (!token) return false
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    if (!payload.exp) return false
    return payload.exp * 1000 - Date.now() < 60_000
  } catch {
    return false
  }
}

function redirectToLogin(): void {
  if (window.location.pathname !== '/login') {
    window.location.href = '/login'
  }
}

async function attemptRefresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise

  refreshPromise = pb
    .collection('users')
    .authRefresh()
    .then(() => true)
    .catch(() => {
      pb.authStore.clear()
      redirectToLogin()
      return false
    })
    .finally(() => {
      refreshPromise = null
    })

  return refreshPromise
}

const originalSend = pb.send.bind(pb)

pb.send = (async (url: string, options?: any) => {
  if (isAuthRefreshRequest(url)) {
    return originalSend(url, options)
  }

  let hasAttemptedRefresh = false

  if (pb.authStore.token && (!pb.authStore.isValid || isTokenExpiringSoon())) {
    hasAttemptedRefresh = true
    const refreshed = await attemptRefresh()
    if (!refreshed) throw new Error('Session expired')
  }

  try {
    return await originalSend(url, options)
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status
    if (status === 401 && !hasAttemptedRefresh) {
      const refreshed = await attemptRefresh()
      if (refreshed) return originalSend(url, options)
    }
    throw err
  }
}) as typeof pb.send

export default pb
