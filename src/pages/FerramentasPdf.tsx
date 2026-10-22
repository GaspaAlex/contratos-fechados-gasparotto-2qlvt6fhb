import {
  type LucideIcon,
  Files,
  Scissors,
  LayoutGrid,
  RotateCw,
  FileImage,
  ShieldCheck,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

/**
 * ============================================================================
 * CENTRAL DE FERRAMENTAS PDF — BLOCO 2 (JUNTAR PDF FUNCIONAL)
 * Advocacia Gasparotto
 * ============================================================================
 *
 * - Ferramenta "Juntar PDF": ativa e funcional na rota /ferramentas-pdf/juntar
 * - Demais ferramentas mantidas estruturalmente marcadas "Em desenvolvimento"
 * ============================================================================
 */

interface PdfToolCard {
  id: string
  title: string
  description: string
  icon: LucideIcon
  status: 'active' | 'development'
  statusLabel?: string
  href?: string
}

const PDF_TOOLS: PdfToolCard[] = [
  {
    id: 'juntar-pdf',
    title: 'Juntar PDF',
    description: 'Una vários documentos PDF em um único arquivo.',
    icon: Files,
    status: 'active',
    href: '/ferramentas-pdf/juntar',
  },
  {
    id: 'dividir-pdf',
    title: 'Dividir PDF',
    description: 'Separe páginas ou intervalos de um documento.',
    icon: Scissors,
    status: 'active',
    href: '/ferramentas-pdf/dividir',
  },
  {
    id: 'organizar-pdf',
    title: 'Organizar PDF',
    description: 'Reordene, exclua ou extraia páginas.',
    icon: LayoutGrid,
    status: 'active',
    href: '/ferramentas-pdf/organizar',
  },
  {
    id: 'rotacionar-pdf',
    title: 'Rotacionar PDF',
    description: 'Gire páginas específicas ou o documento inteiro.',
    icon: RotateCw,
    status: 'active',
    href: '/ferramentas-pdf/rotacionar',
  },
  {
    id: 'imagens-para-pdf',
    title: 'Imagens para PDF',
    description: 'Converta imagens JPG e PNG em um único documento PDF.',
    icon: FileImage,
    status: 'active',
    href: '/ferramentas-pdf/imagens-para-pdf',
  },
]

export default function FerramentasPdf() {
  return (
    <div className="space-y-6 animate-fade-in-up pb-10">
      {/* 1. CABEÇALHO CORPORATIVO PADRONIZADO (GRAFITE PREMIUM 2.1) */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center text-[10px] font-bold tracking-[1.5px] uppercase text-[#C9922A] bg-[#C9922A]/10 px-2 py-0.5 rounded">
            FERRAMENTAS
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#252B34] dark:text-foreground">
          Editor de PDFs
        </h1>
        <p className="text-sm text-[#78818E] dark:text-muted-foreground">
          Organize e prepare documentos PDF com praticidade e segurança.
        </p>
      </div>

      {/* 2. GRADE DE CARDS DAS FERRAMENTAS — Grafite Premium 2.1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {PDF_TOOLS.map((tool) => {
          const Icon = tool.icon
          const isActive = tool.status === 'active'

          const cardContent = (
            <Card
              className={`relative flex flex-col justify-between border border-[#E4E7EB] dark:border-border bg-white dark:bg-card rounded-[10px] transition-all duration-200 h-full shadow-sm ${
                isActive
                  ? 'hover:border-[#C9922A]/50 hover:shadow-md cursor-pointer group'
                  : 'opacity-90 hover:border-[#E4E7EB] dark:hover:border-border'
              }`}
            >
              <CardHeader className="p-5 sm:p-6 pb-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="h-10 w-10 rounded-lg bg-[#FAF8F2] dark:bg-muted/40 border border-[#E4E7EB] dark:border-border/80 flex items-center justify-center text-[#C9922A] transition-colors group-hover:bg-[#C9922A] group-hover:text-white group-hover:border-[#C9922A]">
                    <Icon className="w-5 h-5" />
                  </div>
                  {tool.statusLabel && (
                    <Badge
                      variant="outline"
                      className="border-[#E4E7EB] dark:border-border bg-[#F5F7FA] dark:bg-muted/50 text-[#78818E] dark:text-muted-foreground text-[11px] font-medium tracking-tight px-2.5 py-0.5 rounded-full"
                    >
                      {tool.statusLabel}
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-base sm:text-lg font-bold text-[#252B34] dark:text-foreground group-hover:text-[#C9922A] transition-colors tracking-tight">
                  {tool.title}
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm text-[#78818E] dark:text-muted-foreground mt-1.5 leading-relaxed">
                  {tool.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="px-5 sm:px-6 pb-5 pt-0">
                <div className="pt-3 border-t border-[#E4E7EB]/80 dark:border-border/60">
                  <span className="text-xs text-[#78818E] dark:text-muted-foreground font-normal">
                    {isActive ? (
                      <span className="text-[#C9922A] font-semibold inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                        Acessar ferramenta →
                      </span>
                    ) : (
                      'Módulo estrutural preparado para ativação futura.'
                    )}
                  </span>
                </div>
              </CardContent>
            </Card>
          )

          if (isActive && tool.href) {
            return (
              <Link key={tool.id} to={tool.href} className="block no-underline">
                {cardContent}
              </Link>
            )
          }

          return <div key={tool.id}>{cardContent}</div>
        })}
      </div>

      {/* 3. CARD CORPORATIVO DE PRIVACIDADE E SEGURANÇA LOCAL */}
      <div className="rounded-[10px] border border-[#E4E7EB] dark:border-border bg-white dark:bg-card p-4 sm:p-5 flex items-center gap-3.5 text-[#78818E] dark:text-muted-foreground shadow-xs">
        <div className="h-9 w-9 rounded-md bg-[#FAF8F2] dark:bg-muted/40 border border-[#E4E7EB] dark:border-border flex items-center justify-center text-[#C9922A] shrink-0">
          <ShieldCheck className="w-5 h-5 text-[#C9922A]" />
        </div>
        <p className="text-xs sm:text-sm leading-relaxed">
          <strong className="text-[#252B34] dark:text-foreground font-semibold">
            Processamento 100% Local:
          </strong>{' '}
          Ferramentas planejadas para processar documentos diretamente no navegador, sem
          armazenamento no servidor ou transmissão de dados sensíveis.
        </p>
      </div>
    </div>
  )
}
