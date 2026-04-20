import { Link, Outlet, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  CheckSquare,
  Gavel,
  Users,
  LineChart,
  Moon,
  Sun,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'

const navItems = [
  { name: 'Contratos Fechados', path: '/dashboard', icon: CheckSquare },
  { name: 'Protocolo', path: '/protocolo', icon: FileText },
  { name: 'Perícias', path: '/pericias', icon: Gavel },
  { name: 'Leads Campanha', path: '/leads', icon: LineChart },
]

export default function Layout() {
  const location = useLocation()
  const { theme, setTheme } = useTheme()

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar variant="inset" className="border-r">
          <SidebarHeader className="p-6 pb-2">
            <Link to="/dashboard" className="flex items-center justify-center py-2">
              <div className="flex flex-col text-center">
                <span className="text-[16px] font-bold text-foreground leading-tight">
                  Advocacia
                </span>
                <span className="text-[20px] font-bold text-[#C9922A] leading-tight">
                  Gasparotto
                </span>
              </div>
            </Link>
          </SidebarHeader>
          <SidebarContent className="px-4 py-2">
            <SidebarMenu>
              {navItems.map((item) => {
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
          </SidebarContent>
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
