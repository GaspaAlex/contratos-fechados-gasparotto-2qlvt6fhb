import { Navigate, Outlet } from 'react-router-dom'

export function ProtectedRoute() {
  const checkAuth = () => {
    try {
      const authDataString = localStorage.getItem('gasparotto_auth')
      if (!authDataString) return false

      if (authDataString === 'true') {
        localStorage.removeItem('gasparotto_auth')
        return false
      }

      const authData = JSON.parse(authDataString)
      if (!authData.isAuthenticated || !authData.createdAt) return false

      const now = Date.now()
      const isExpired = now - authData.createdAt > 24 * 60 * 60 * 1000

      if (isExpired) {
        localStorage.removeItem('gasparotto_auth')
        return false
      }

      return true
    } catch (e) {
      localStorage.removeItem('gasparotto_auth')
      return false
    }
  }

  const isAuthenticated = checkAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
