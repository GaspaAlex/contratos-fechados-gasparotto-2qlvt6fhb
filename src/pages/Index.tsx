export default function Index() {
  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral e indicadores principais da advocacia.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card text-card-foreground shadow">
          <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium text-muted-foreground">Bem-vindo</h3>
          </div>
          <div className="p-6 pt-0">
            <div className="text-2xl font-bold text-foreground">Advocacia Gasparotto</div>
            <p className="text-xs text-muted-foreground mt-1">
              Navegue pelo menu lateral para acessar as funcionalidades do sistema.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
