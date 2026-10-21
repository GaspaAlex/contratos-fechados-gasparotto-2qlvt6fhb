import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  Users,
  LineChart,
  Moon,
  Sun,
  Folder,
  Clock,
  LogOut,
  Scale,
  ClipboardList,
  KeyRound,
  UserCog,
  Files,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { useRef, useEffect, useState, useMemo, useCallback } from 'react'
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
import { useAuth } from '@/hooks/use-auth'

const SIDEBAR_PREFS_KEY = 'gasparotto_sidebar_expanded_sections'

export default function Layout() {
  const location = useLocation()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isGestor = user?.perfil === 'gestor'
  const mainRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0
    }
    window.scrollTo(0, 0)
  }, [location.pathname])

  const navSections = useMemo(
    () => [
      {
        id: 'visao-geral',
        label: 'VISÃO GERAL',
        items: [{ name: 'Dashboard', path: '/', icon: LayoutDashboard }],
      },
      {
        id: 'gestao-casos',
        label: 'GESTÃO DE CASOS',
        items: [
          { name: 'RPV/Precatório', path: '/rpv', icon: Scale },
          { name: 'Protocolo', path: '/protocolo', icon: FileText },
          { name: 'Contratos Fechados', path: '/dashboard', icon: Folder },
          { name: 'Perícias', path: '/pericias', icon: Clock },
        ].filter((item) => item.path !== '/rpv' || isGestor),
      },
      {
        id: 'captacao-leads',
        label: 'CAPTAÇÃO DE LEADS',
        items: [
          { name: 'Leads Campanha', path: '/leads', icon: LineChart },
          { name: 'Registro de Leads', path: '/leads-registro', icon: ClipboardList },
        ],
      },
      {
        id: 'gestao-pessoas',
        label: 'GESTÃO DE PESSOAS',
        items: [
          { name: 'Cartão de Ponto', path: '/gestao/ponto', icon: Clock },
          { name: 'Funcionários', path: '/gestao/funcionarios', icon: Users },
          { name: 'Responsáveis', path: '/gestao/responsaveis', icon: UserCog },
        ].filter((item) => item.path !== '/gestao/funcionarios' || isGestor),
      },
      {
        id: 'ferramentas',
        label: 'FERRAMENTAS',
        items: [
          { name: 'Acesso Sistemas', path: '/gestao/acessos', icon: KeyRound },
          { name: 'Editor de PDFs', path: '/ferramentas-pdf', icon: Files },
        ],
      },
    ],
    [isGestor],
  )

  const isItemActive = useCallback(
    (itemPath: string) => {
      const current = location.pathname
      if (itemPath === '/') {
        return current === '/'
      }
      return current === itemPath || current.startsWith(`${itemPath}/`)
    },
    [location.pathname],
  )

  const activeSectionId = useMemo(() => {
    const matched = navSections.find((section) =>
      section.items.some((item) => isItemActive(item.path)),
    )
    return matched ? matched.id : null
  }, [navSections, isItemActive])

  const activeBreadcrumb = useMemo(() => {
    for (const section of navSections) {
      const item = section.items.find((it) => isItemActive(it.path))
      if (item) {
        return {
          section: section.label,
          page: item.name,
        }
      }
    }
    return null
  }, [navSections, isItemActive])

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    const current = location.pathname
    const matched = navSections.find((section) =>
      section.items.some((item) =>
        item.path === '/'
          ? current === '/'
          : current === item.path || current.startsWith(`${item.path}/`),
      ),
    )
    const activeId = matched ? matched.id : null

    const initial: Record<string, boolean> = {
      'visao-geral': false,
      'gestao-casos': false,
      'captacao-leads': false,
      'gestao-pessoas': false,
      ferramentas: false,
    }

    // Se houver uma rota ativa correspondente a um grupo, ela tem prioridade no acordeão
    if (activeId) {
      const singleState = { ...initial, [activeId]: true }
      try {
        localStorage.setItem(SIDEBAR_PREFS_KEY, JSON.stringify(singleState))
      } catch {
        // localStorage indisponível
      }
      return singleState
    }

    // Se nenhuma rota estiver em grupo específico, verifica estado salvo normalizando para no máximo 1 grupo
    try {
      const saved = localStorage.getItem(SIDEBAR_PREFS_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as Record<string, boolean>
        if (parsed && typeof parsed === 'object') {
          // Normalização: encontra o primeiro grupo com valor true (ou null se nenhum)
          const openSectionId = Object.keys(initial).find((key) => !!parsed[key])
          const normalized = { ...initial }
          if (openSectionId) {
            normalized[openSectionId] = true
          }
          return normalized
        }
      }
    } catch {
      // Falha ao ler localStorage, usa padrão com todos fechados
    }

    return initial
  })

  useEffect(() => {
    if (activeSectionId) {
      setExpandedSections((prev) => {
        // Se já está aberto com apenas activeSectionId ativo, não re-renderiza
        const isOnlyActiveExpanded =
          prev[activeSectionId] &&
          Object.keys(prev).every((key) => key === activeSectionId || !prev[key])
        if (isOnlyActiveExpanded) return prev

        const updated: Record<string, boolean> = {
          'visao-geral': false,
          'gestao-casos': false,
          'captacao-leads': false,
          'gestao-pessoas': false,
          ferramentas: false,
          [activeSectionId]: true,
        }
        try {
          localStorage.setItem(SIDEBAR_PREFS_KEY, JSON.stringify(updated))
        } catch {
          // localStorage indisponível
        }
        return updated
      })
    }
  }, [activeSectionId])

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const isCurrentlyOpen = !!prev[sectionId]
      const updated: Record<string, boolean> = {
        'visao-geral': false,
        'gestao-casos': false,
        'captacao-leads': false,
        'gestao-pessoas': false,
        ferramentas: false,
      }

      // Se estava fechado, abre exclusivamente este. Se já estava aberto, fecha-o (ficando todos false).
      if (!isCurrentlyOpen) {
        updated[sectionId] = true
      }

      try {
        localStorage.setItem(SIDEBAR_PREFS_KEY, JSON.stringify(updated))
      } catch {
        // localStorage indisponível
      }
      return updated
    })
  }

  const handleLogout = () => {
    localStorage.removeItem('gasparotto_auth')
    navigate('/login')
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background font-sans">
        <Sidebar
          variant="sidebar"
          collapsible="offcanvas"
          className="border-r border-[#222733] bg-[#161920] text-[#B5BAC4] shrink-0"
        >
          {/* Header da Sidebar — Fundo Grafite #161920 — Exclusivamente Tipográfico */}
          <SidebarHeader className="p-0 border-b border-[#232836] bg-[#161920]">
            <div className="flex flex-col items-center justify-center p-3 w-full">
              <Link
                to="/"
                className="group w-full block rounded-lg px-3 py-3 transition-colors bg-[#191D26] hover:bg-[#1D222E] border border-[#272D3D]/60 hover:border-[#D9A94A]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9A94A] text-center select-none"
                title="Advocacia Gasparotto - Início"
              >
                <div className="flex flex-col items-center justify-center text-center">
                  <span className="font-serif text-[15px] sm:text-[15.5px] font-bold tracking-[0.08em] text-[#E8ECF2] group-hover:text-[#F3F5F8] transition-colors leading-tight">
                    ADVOCACIA GASPAROTTO
                  </span>
                  <span
                    className="mt-1.5 text-[10px] sm:text-[10.5px] font-semibold text-[#D9A94A] tracking-[0.24em] uppercase leading-none"
                    style={{ wordSpacing: '0.35em' }}
                  >
                    SISTEMA DE GESTÃO
                  </span>
                </div>
              </Link>
            </div>
          </SidebarHeader>

          {/* Navegação da Sidebar */}
          <SidebarContent className="px-3 py-3 bg-[#161920]">
            <div className="flex flex-col space-y-4">
              {navSections.map((section) => {
                const isExpanded = !!expandedSections[section.id]
                const contentId = `nav-section-${section.id}`

                return (
                  <div key={section.id} className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => toggleSection(section.id)}
                      aria-expanded={isExpanded}
                      aria-controls={contentId}
                      className="group/sec-header flex w-full items-center justify-between px-3 py-1.5 mb-1 rounded text-[10px] uppercase font-semibold tracking-[1.2px] text-[#9299A9] hover:text-[#E3B259] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#D9A94A] cursor-pointer select-none"
                    >
                      <span className="truncate transition-colors duration-150">
                        {section.label}
                      </span>
                      <ChevronDown
                        className={cn(
                          'h-3.5 w-3.5 shrink-0 text-[#9299A9] transition-all duration-200 group-hover/sec-header:text-[#E3B259]',
                          isExpanded && 'rotate-180',
                        )}
                        aria-hidden="true"
                      />
                    </button>

                    {isExpanded && (
                      <div id={contentId}>
                        <SidebarMenu className="gap-1">
                          {section.items.map((item) => {
                            const isActive = isItemActive(item.path)
                            return (
                              <SidebarMenuItem key={item.path}>
                                <SidebarMenuButton
                                  asChild
                                  isActive={isActive}
                                  className={cn(
                                    'group/menu-btn relative w-full h-11 px-3 py-2 text-sm transition-all duration-150 rounded-[9px] overflow-hidden',
                                    isActive
                                      ? 'bg-[#2B2927] text-[#F1C078] font-semibold shadow-sm hover:bg-[#322F2D] hover:text-[#F1C078]'
                                      : 'text-[#B5BAC4] bg-transparent font-medium hover:bg-[#D9A94A]/12 hover:text-[#F3CE85]',
                                  )}
                                >
                                  <Link to={item.path} className="flex items-center gap-3">
                                    {/* Linha vertical dourada de 3px à ESQUERDA no padrão aprovado */}
                                    {isActive && (
                                      <span
                                        className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#D9A94A] rounded-r-sm"
                                        aria-hidden="true"
                                      />
                                    )}
                                    <item.icon
                                      className={cn(
                                        'h-4 w-4 shrink-0 transition-colors duration-150',
                                        isActive
                                          ? 'text-[#D9A94A]'
                                          : 'text-[#8E95A5] group-hover/menu-btn:text-[#E3B259]',
                                      )}
                                    />
                                    <span className="truncate tracking-wide transition-colors duration-150">
                                      {item.name}
                                    </span>
                                  </Link>
                                </SidebarMenuButton>
                              </SidebarMenuItem>
                            )
                          })}
                        </SidebarMenu>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </SidebarContent>

          {/* Footer da Sidebar */}
          <SidebarFooter className="p-3 border-t border-[#232836] bg-[#161920]">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-[#B5BAC4] hover:text-[#FFFFFF] hover:bg-[#202532] rounded-[8px] text-sm font-medium transition-colors"
                >
                  <LogOut className="mr-2.5 h-4 w-4 text-[#8E95A5]" />
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
                    className="bg-[#B4453C] text-white hover:bg-[#9E3B33]"
                  >
                    Sair
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex w-full flex-col overflow-hidden bg-background">
          {/* Header Executivo Limpo com Breadcrumb */}
          <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-[#E4E7EB] dark:border-border bg-white dark:bg-card px-4 sm:px-8">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-[#78818E] hover:text-[#252B34] dark:text-muted-foreground dark:hover:text-foreground" />

              <div className="flex items-center gap-2 lg:hidden">
                <div className="flex flex-col text-left leading-none">
                  <span className="text-[12px] font-bold text-[#252B34] dark:text-foreground">
                    Advocacia
                  </span>
                  <span className="text-[13px] font-bold text-[#C9922A]">Gasparotto</span>
                </div>
              </div>

              {/* Breadcrumb corporativo discreto */}
              {activeBreadcrumb && (
                <nav
                  aria-label="Breadcrumb"
                  className="hidden sm:flex items-center gap-2 text-xs text-[#78818E] dark:text-muted-foreground pl-2 border-l border-[#E4E7EB] dark:border-border"
                >
                  <span className="font-medium tracking-wide uppercase text-[11px] text-[#78818E] dark:text-muted-foreground">
                    {activeBreadcrumb.section}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 opacity-50 text-[#78818E]" />
                  <span className="font-semibold text-[#252B34] dark:text-foreground">
                    {activeBreadcrumb.page}
                  </span>
                </nav>
              )}
            </div>

            <div className="flex-1" />

            {/* Alternador de tema preservado */}
            <div className="flex items-center gap-1 bg-[#F5F6F8] dark:bg-muted/40 p-1 rounded-full border border-[#E4E7EB] dark:border-border">
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-7 w-7 rounded-full transition-all',
                  theme === 'light'
                    ? 'bg-[#C9922A] text-white shadow-xs hover:bg-[#C9922A] hover:text-white'
                    : 'text-[#78818E] hover:text-[#252B34] dark:text-muted-foreground dark:hover:text-foreground',
                )}
                onClick={() => setTheme('light')}
                title="Modo Claro"
              >
                <Sun className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-7 w-7 rounded-full transition-all',
                  theme === 'dark'
                    ? 'bg-[#C9922A] text-white shadow-xs hover:bg-[#C9922A] hover:text-white'
                    : 'text-[#78818E] hover:text-[#252B34] dark:text-muted-foreground dark:hover:text-foreground',
                )}
                onClick={() => setTheme('dark')}
                title="Modo Escuro"
              >
                <Moon className="h-3.5 w-3.5" />
              </Button>
            </div>
          </header>

          <main ref={mainRef} className="flex-1 overflow-y-auto p-4 sm:p-8 bg-background">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
