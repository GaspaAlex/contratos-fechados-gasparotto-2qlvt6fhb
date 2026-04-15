import { Link, Outlet, useLocation } from 'react-router-dom'
import { LayoutDashboard, FileText, CheckSquare, Gavel, Users } from 'lucide-react'
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
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Protocolo', path: '/protocolo', icon: FileText },
  { name: 'Contratos Fechados', path: '/', icon: CheckSquare },
  { name: 'Perícias', path: '/pericias', icon: Gavel },
  { name: 'Leads Campanha', path: '/leads', icon: Users },
]

export default function Layout() {
  const location = useLocation()

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar variant="inset" className="border-r">
          <SidebarHeader className="p-6">
            <Link to="/" className="flex items-center gap-2">
              <h1 className="font-serif text-2xl font-bold tracking-widest text-primary">
                GASPAROTTO
              </h1>
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
                        'w-full py-5 text-base font-medium transition-colors',
                        isActive
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm'
                          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
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
          <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-card px-6 lg:hidden">
            <SidebarTrigger className="-ml-2" />
            <h1 className="font-serif text-xl font-bold tracking-widest text-primary">
              GASPAROTTO
            </h1>
          </header>
          <main className="flex-1 overflow-y-auto p-4 sm:p-8">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
