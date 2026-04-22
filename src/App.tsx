import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ThemeProvider } from './components/ThemeProvider'
import Layout from './components/Layout'
import NotFound from './pages/NotFound'
import Index from './pages/Index'
import Dashboard from './pages/Dashboard'
import Protocolo from './pages/Protocolo'
import Pericias from './pages/Pericias'
import LeadsCampanha from './pages/LeadsCampanha'
import Login from './pages/Login'
import { ProtectedRoute } from './components/ProtectedRoute'

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
    <BrowserRouter future={{ v7_startTransition: false, v7_relativeSplatPath: false }}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Index />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/protocolo" element={<Protocolo />} />
              <Route path="/pericias" element={<Pericias />} />
              <Route path="/leads" element={<LeadsCampanha />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </BrowserRouter>
  </ThemeProvider>
)

export default App
