import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ThemeProvider } from './components/ThemeProvider'
import { AuthProvider } from './hooks/use-auth'
import Layout from './components/Layout'
import NotFound from './pages/NotFound'
import Index from './pages/Index'
import Dashboard from './pages/Dashboard'
import Protocolo from './pages/Protocolo'
import Pericias from './pages/Pericias'
import LeadsCampanha from './pages/LeadsCampanha'
import Login from './pages/Login'
import Ponto from './pages/gestao/Ponto'
import BaterPonto from './pages/gestao/BaterPonto'
import Funcionarios from './pages/gestao/Funcionarios'
import { ProtectedRoute } from './components/ProtectedRoute'

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
    <AuthProvider>
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
                <Route path="/gestao/ponto" element={<Ponto />} />
                <Route path="/gestao/ponto/registrar" element={<BaterPonto />} />
                <Route path="/gestao/funcionarios" element={<Funcionarios />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </BrowserRouter>
    </AuthProvider>
  </ThemeProvider>
)

export default App
