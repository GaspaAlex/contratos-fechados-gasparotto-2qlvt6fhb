import {
  type LucideIcon,
  Files,
  Scissors,
  LayoutGrid,
  RotateCw,
  FileImage,
  ShieldCheck,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

/**
 * ============================================================================
 * CENTRAL DE FERRAMENTAS PDF — BLOCO 1 (ESTRUTURAL E VISUAL)
 * Advocacia Gasparotto
 * ============================================================================
 *
 * REGISTRO DE PLANEJAMENTO PARA FUTURA IMPLEMENTAÇÃO:
 * - A primeira ferramenta funcional a ser implementada será: "Juntar PDF".
 * - A ferramenta "Rotacionar PDF" deverá permitir rotação de páginas
 *   individualmente (ex.: em um documento de 10 páginas, selecionar apenas a
 *   página 8 e aplicar 90° ou 180°, mantendo as demais na orientação original),
 *   bem como seleção de múltiplas páginas ou todas.
 * - Toda manipulação de documentos será executada localmente no navegador via
 *   client-side sem persistência ou tráfego desnecessário de arquivos confidenciais.
 * ============================================================================
 */

interface PdfToolCard {
  id: string
  title: string
  description: string
  icon: LucideIcon
  status: 'development'
  statusLabel: string
}

const PDF_TOOLS: PdfToolCard[] = [
  {
    id: 'juntar-pdf',
    title: 'Juntar PDF',
    description: 'Una vários documentos PDF em um único arquivo.',
    icon: Files,
    status: 'development',
    statusLabel: 'Em desenvolvimento',
  },
  {
    id: 'dividir-pdf',
    title: 'Dividir PDF',
    description: 'Separe páginas ou intervalos de um documento.',
    icon: Scissors,
    status: 'development',
    statusLabel: 'Em desenvolvimento',
  },
  {
    id: 'organizar-pdf',
    title: 'Organizar PDF',
    description: 'Reordene, exclua ou extraia páginas.',
    icon: LayoutGrid,
    status: 'development',
    statusLabel: 'Em desenvolvimento',
  },
  {
    id: 'rotacionar-pdf',
    title: 'Rotacionar PDF',
    description: 'Gire páginas específicas ou o documento inteiro.',
    icon: RotateCw,
    status: 'development',
    statusLabel: 'Em desenvolvimento',
  },
  {
    id: 'imagens-para-pdf',
    title: 'Imagens para PDF',
    description: 'Converta imagens JPG e PNG em documentos PDF.',
    icon: FileImage,
    status: 'development',
    statusLabel: 'Em desenvolvimento',
  },
]

export default function FerramentasPdf() {
  return (
    <div className="space-y-8 animate-fade-in-up pb-10">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#C9922A]/10 border border-[#C9922A]/20 rounded-lg">
            <Files className="w-6 h-6 text-[#C9922A]" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Ferramentas PDF
            </h1>
            <p className="text-sm font-medium text-muted-foreground">
              Organize e prepare seus documentos PDF com praticidade e segurança.
            </p>
          </div>
        </div>
      </div>

      {/* Grade de Cards das Ferramentas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {PDF_TOOLS.map((tool) => {
          const Icon = tool.icon
          return (
            <Card
              key={tool.id}
              className="relative flex flex-col justify-between border-border bg-card/80 backdrop-blur-sm rounded-xl transition-all duration-200 hover:border-[#C9922A]/40 hover:shadow-subtle"
            >
              <CardHeader className="p-6 pb-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="p-2.5 rounded-lg bg-[#C9922A]/10 text-[#C9922A] ring-1 ring-[#C9922A]/20">
                    <Icon className="w-5 h-5" />
                  </div>
                  <Badge
                    variant="outline"
                    className="border-muted bg-muted/40 text-muted-foreground text-[11px] font-medium tracking-tight px-2 py-0.5 rounded-full"
                  >
                    {tool.statusLabel}
                  </Badge>
                </div>
                <CardTitle className="text-lg font-bold text-foreground">{tool.title}</CardTitle>
                <CardDescription className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                  {tool.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="px-6 pb-6 pt-0">
                <div className="pt-3 border-t border-dashed border-border/60">
                  <span className="text-xs text-muted-foreground/80 font-normal">
                    Módulo estrutural preparado para ativação futura.
                  </span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Informação sobre Privacidade e Segurança */}
      <div className="rounded-xl border border-border/80 bg-muted/20 p-4 sm:p-5 flex items-center gap-3.5 text-muted-foreground">
        <ShieldCheck className="w-5 h-5 text-[#C9922A] shrink-0" />
        <p className="text-xs sm:text-sm leading-relaxed">
          Ferramentas planejadas para processar documentos diretamente no navegador, sem
          armazenamento no sistema.
        </p>
      </div>
    </div>
  )
}
