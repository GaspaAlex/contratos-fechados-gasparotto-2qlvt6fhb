import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  CheckSquare,
  Gavel,
  Users,
  LineChart,
  Moon,
  Sun,
  Folder,
  Clock,
  LogOut,
  Scale,
  Camera,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { useState, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'

const navSections = [
  {
    label: 'VISÃO GERAL',
    items: [{ name: 'Dashboard', path: '/', icon: LayoutDashboard }],
  },
  {
    label: 'GESTÃO DE CASOS',
    items: [
      { name: 'Protocolo', path: '/protocolo', icon: FileText },
      { name: 'Contratos Fechados', path: '/dashboard', icon: Folder },
      { name: 'Perícias', path: '/pericias', icon: Clock },
    ],
  },
  {
    label: 'CAPTAÇÃO DE LEADS',
    items: [{ name: 'Leads Campanha', path: '/leads', icon: LineChart }],
  },
]

export default function Layout() {
  const location = useLocation()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()

  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const savedLogo = localStorage.getItem('gasparotto_logo')
    if (savedLogo) {
      setLogoUrl(savedLogo)
    }
  }, [])

  const handleLogoClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Imagem muito grande. Use até 2MB.')
      return
    }

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    if (!validTypes.includes(file.type)) {
      toast.error('Formato inválido. Use PNG, JPG ou WEBP.')
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = reader.result as string
      setLogoUrl(base64)
      localStorage.setItem('gasparotto_logo', base64)
      toast.success('Logo atualizado com sucesso!')
    }
    reader.readAsDataURL(file)
  }

  const handleLogout = () => {
    localStorage.removeItem('gasparotto_auth')
    navigate('/login')
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar variant="inset" className="border-r">
          <SidebarHeader className="p-0 border-b border-border">
            <div className="flex flex-row items-center gap-[10px] px-[16px] py-[12px] w-full">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className="relative w-[52px] h-[52px] rounded-[10px] overflow-hidden bg-[#FFFFFF] cursor-pointer group shrink-0"
                    style={{ border: '2px solid rgba(201, 146, 42, 0.35)' }}
                    onClick={handleLogoClick}
                  >
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt="Logo Gasparotto"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Scale className="w-6 h-6" style={{ color: '#C9922A' }} />
                      </div>
                    )}

                    <div
                      className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ backgroundColor: 'rgba(0, 0, 0, 0.45)' }}
                    >
                      <Camera className="w-5 h-5 text-white" />
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept=".png,.jpg,.jpeg,.webp"
                      onChange={handleFileChange}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p className="font-semibold">Clique para alterar logo</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PNG ou JPG quadrado · recomendado 200×200px
                  </p>
                </TooltipContent>
              </Tooltip>

              <div className="flex flex-col text-left">
                <span
                  className="font-bold text-[15px] leading-tight"
                  style={{ color: 'var(--text, hsl(var(--foreground)))' }}
                >
                  Advocacia Gasparotto
                </span>
                <span
                  className="text-[12px] leading-tight"
                  style={{ color: 'var(--text3, hsl(var(--muted-foreground)))' }}
                >
                  Sistema de Gestão
                </span>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent className="px-4 py-2">
            <div className="flex flex-col">
              {navSections.map((section, index) => (
                <div key={section.label} className={cn(index > 0 && 'mt-4')}>
                  <div
                    className="px-2 mb-2 text-[10px] uppercase font-semibold tracking-[1px]"
                    style={{ color: 'var(--text3, hsl(var(--muted-foreground)))' }}
                  >
                    {section.label}
                  </div>
                  <SidebarMenu>
                    {section.items.map((item) => {
                      const isActive = location.pathname === item.path
                      return (
                        <SidebarMenuItem key={item.path}>
                          <SidebarMenuButton
                            asChild
                            isActive={isActive}
                            className={cn(
                              'w-full py-5 text-base transition-colors border-l-4 rounded-none h-12',
                              isActive
                                ? 'bg-[#C9922A]/15 border-[#C9922A] text-[#C9922A] font-bold hover:bg-[#C9922A]/20 hover:text-[#C9922A]'
                                : 'border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground font-medium',
                            )}
                          >
                            <Link to={item.path}>
                              <item.icon className="h-5 w-5" />
                              <span>{item.name}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      )
                    })}
                  </SidebarMenu>
                </div>
              ))}
            </div>
          </SidebarContent>
          <SidebarFooter className="p-4 border-t">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair do sistema
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Sair do sistema</AlertDialogTitle>
                  <AlertDialogDescription>Deseja sair do sistema?</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleLogout}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Sair
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex w-full flex-col overflow-hidden bg-background">
          <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b bg-card px-6">
            <div className="flex items-center gap-2 lg:hidden">
              <SidebarTrigger className="-ml-2" />
              <div className="flex flex-col text-left leading-none">
                <span className="text-[12px] font-bold text-foreground">Advocacia</span>
                <span className="text-[14px] font-bold text-[#C9922A]">Gasparotto</span>
              </div>
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-full border">
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-8 w-8 rounded-full transition-all',
                  theme === 'light'
                    ? 'bg-[#C9922A] text-white shadow-sm hover:bg-[#C9922A] hover:text-white'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                onClick={() => setTheme('light')}
              >
                <Sun className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-8 w-8 rounded-full transition-all',
                  theme === 'dark'
                    ? 'bg-[#C9922A] text-white shadow-sm hover:bg-[#C9922A] hover:text-white'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                onClick={() => setTheme('dark')}
              >
                <Moon className="h-4 w-4" />
              </Button>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-4 sm:p-8 bg-background">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
