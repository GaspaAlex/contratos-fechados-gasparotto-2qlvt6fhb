/**
 * DIÁLOGO "CADASTRAR EQUIPE PADRÃO" (Build F2-A)
 * ==============================================
 * Confirmação EXPRESSA listando os 4 colaboradores padrão. O planejamento é
 * puro (src/lib/equipePadrao.ts, idempotente): consulta o que já existe,
 * NUNCA sobrescreve configuração divergente e reporta o que falta. A gravação
 * só ocorre após o clique em "Cadastrar". O botão é desabilitado durante o
 * salvamento (impede cliques repetidos) e falhas parciais são retomáveis.
 */
import { useMemo } from 'react'
import { AlertTriangle, CheckCircle2, Loader2, Users } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type {
  ColaboradorComissionadoRecord,
  RegraComissaoRecord,
} from '@/services/comissoesColaboradores'
import {
  EQUIPE_PADRAO,
  VIGENCIA_INICIO_PADRAO,
  planejarEquipePadrao,
  type PlanoEquipePadrao,
} from '@/lib/equipePadrao'
import { rotuloCompetencia } from './gestaoLabels'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  colaboradores: ColaboradorComissionadoRecord[]
  regras: RegraComissaoRecord[]
  salvando: boolean
  onConfirmar: (plano: PlanoEquipePadrao) => void
}

export function GestaoEquipePadraoDialog({
  open,
  onOpenChange,
  colaboradores,
  regras,
  salvando,
  onConfirmar,
}: Props) {
  const plano: PlanoEquipePadrao = useMemo(
    () => planejarEquipePadrao({ colaboradores, regras, vigenciaInicio: VIGENCIA_INICIO_PADRAO }),
    [colaboradores, regras],
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" aria-describedby="equipe-padrao-desc">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-4 w-4 text-[#C9922A]" aria-hidden />
            Cadastrar equipe padrão
          </DialogTitle>
          <DialogDescription id="equipe-padrao-desc">
            Confirmação expressa: a gravação só ocorre ao clicar em “Cadastrar”. Nada é gravado
            automaticamente. A operação é idempotente — nunca duplica colaborador nem regra.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <ul className="space-y-1.5">
            {EQUIPE_PADRAO.map((def) => (
              <li
                key={def.nome}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[#E4E7EB] dark:border-border px-3 py-2 text-sm"
              >
                <span className="font-medium text-[#252B34] dark:text-foreground">{def.nome}</span>
                <span className="text-xs text-[#78818E] dark:text-muted-foreground">
                  R$ {def.valor.toFixed(2).replace('.', ',')} por caso ·{' '}
                  {def.modalidade === 'fixa' ? 'fixa' : 'condicionada à meta'} · início{' '}
                  {rotuloCompetencia(VIGENCIA_INICIO_PADRAO, true)} ({VIGENCIA_INICIO_PADRAO})
                </span>
              </li>
            ))}
          </ul>

          {plano.conflitos.length > 0 && (
            <div
              role="alert"
              className="rounded-md border border-[#C77E1E] bg-[#C77E1E]/10 px-3 py-2.5"
            >
              <p className="flex items-center gap-1.5 text-xs font-semibold text-[#C77E1E]">
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> Conflito — nada será
                sobrescrito
              </p>
              <ul className="mt-1 space-y-0.5 text-[11px] text-[#78818E] dark:text-muted-foreground">
                {plano.conflitos.map((c) => (
                  <li key={c.nome}>
                    {c.nome}: já existe regra em {rotuloCompetencia(c.regra.vigencia_inicio)} com R${' '}
                    {Number(c.regra.valor).toFixed(2).replace('.', ',')} ({c.regra.modalidade}).
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-md bg-[#F5F6F8] dark:bg-muted/40 px-3 py-2">
            <p className="text-xs text-[#78818E] dark:text-muted-foreground">
              <span className="font-semibold text-[#252B34] dark:text-foreground">Plano:</span>{' '}
              {plano.resumo}
            </p>
            {plano.faltando.length > 0 && (
              <p className="mt-1 text-[11px] text-[#78818E] dark:text-muted-foreground">
                Retomável: executar de novo após corrigir falhas não duplica nada.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={salvando}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={() => onConfirmar(plano)} disabled={salvando}>
            {salvando && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden />}
            {salvando ? 'Cadastrando…' : 'Cadastrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
