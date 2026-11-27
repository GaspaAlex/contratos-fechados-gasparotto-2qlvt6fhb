/**
 * TELA — CONTRACHEQUES (Build C1: fundação)
 * ============================================================
 * Exclusiva da conta escritorio@advocaciagasparotto.com.br. Renderiza APENAS
 * se o veredito de acesso for 'autorizado' (contrachequesAuth) — qualquer
 * outro usuário (incluindo outros gestores) recebe a mensagem de bloqueio,
 * sem nenhum dado na tela.
 *
 * Conteúdo: lista dos PARTICIPANTES do módulo (collection cc_participantes,
 * Build C1-A) com indicação de salário cadastrado (em vigor) ou não,
 * formulário simples de cadastro de vigência (valor + início), histórico de
 * vigências por funcionário e encerramento de vigência. A seleção de quem
 * participa fica no dialog discreto "Gerenciar participantes" (o Cartão de
 * Ponto e a collection funcionarios não são alterados). SEM cálculos de
 * contracheque (virão em builds futuros) e SEM dados fictícios.
 *
 * A autorização de verdade é o BACKEND: as regras de API de cc_salarios
 * recusam qualquer outro usuário (403/404). Aqui a guarda é presentacional.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { BadgeDollarSign, CalendarDays, Loader2, Plus, ShieldAlert, UserCog, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import GerenciarParticipantesDialog from '@/components/contracheques/GerenciarParticipantesDialog'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { verificarAcessoContracheques, type VereditoContracheques } from '@/lib/contrachequesAuth'
import { useAuth } from '@/hooks/use-auth'
import {
  criarSalario,
  dataBR,
  encerrarSalario,
  excluirSalario,
  formatarSalario,
  getSalarios,
  vigenciaEmVigor,
  type FuncionarioCC,
  type SalarioRecord,
} from '@/services/ccSalarios'
import {
  getParticipantes,
  resolverParticipantesAtivos,
  type ParticipanteResolvido,
} from '@/services/ccParticipantes'

const HOJE_YMD = () => {
  const d = new Date()
  return (
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  )
}

export default function Contracheques() {
  const { toast } = useToast()
  const { user } = useAuth()

  const veredito: VereditoContracheques = verificarAcessoContracheques(
    user as {
      id?: string
      email?: string
    } | null,
  )

  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [funcionarios, setFuncionarios] = useState<ParticipanteResolvido[]>([])
  const [salarios, setSalarios] = useState<SalarioRecord[]>([])
  const [dialogParticipantes, setDialogParticipantes] = useState(false)

  // Formulário de cadastro de vigência
  const [dialogFuncionario, setDialogFuncionario] = useState<FuncionarioCC | null>(null)
  const [valor, setValor] = useState('')
  const [inicio, setInicio] = useState('')
  const [fim, setFim] = useState('')
  const [salvando, setSalvando] = useState(false)

  const [encerrando, setEncerrando] = useState<SalarioRecord | null>(null)
  const [dataEncerramento, setDataEncerramento] = useState('')

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro(null)
    try {
      const [parts, sals] = await Promise.all([getParticipantes(), getSalarios()])
      setFuncionarios(resolverParticipantesAtivos(parts))
      setSalarios(sals)
    } catch (e) {
      console.error(e)
      setErro('Não foi possível carregar os dados salariais. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    if (veredito === 'autorizado') void carregar()
  }, [veredito, carregar])

  const salariosPorFuncionario = useMemo(() => {
    const mapa = new Map<string, SalarioRecord[]>()
    for (const s of salarios) {
      const lista = mapa.get(s.funcionario) ?? []
      lista.push(s)
      mapa.set(s.funcionario, lista)
    }
    return mapa
  }, [salarios])

  const iniciarCadastro = (f: FuncionarioCC) => {
    setDialogFuncionario(f)
    setValor('')
    setInicio(HOJE_YMD())
    setFim('')
  }

  const salvarVigencia = async () => {
    if (!dialogFuncionario) return
    const valorNum = Number(valor.replace(/\./g, '').replace(',', '.'))
    if (!valor || isNaN(valorNum) || valorNum <= 0) {
      toast({
        title: 'Valor inválido',
        description: 'Informe o valor do salário (maior que zero).',
        variant: 'destructive',
      })
      return
    }
    if (!inicio) {
      toast({
        title: 'Vigência inicial obrigatória',
        description: 'Informe a data de início da vigência.',
        variant: 'destructive',
      })
      return
    }
    setSalvando(true)
    try {
      await criarSalario({
        funcionario: dialogFuncionario.id,
        valor: valorNum,
        vigencia_inicio: inicio,
        vigencia_fim: fim || undefined,
      })
      toast({
        title: 'Salário cadastrado',
        description: `${dialogFuncionario.nome}: vigência a partir de ${dataBR(inicio)}.`,
      })
      setDialogFuncionario(null)
      await carregar()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Falha ao cadastrar o salário.'
      toast({ title: 'Não foi possível cadastrar', description: msg, variant: 'destructive' })
    } finally {
      setSalvando(false)
    }
  }

  const salvarEncerramento = async () => {
    if (!encerrando) return
    if (!dataEncerramento) {
      toast({
        title: 'Data obrigatória',
        description: 'Informe a data de encerramento da vigência.',
        variant: 'destructive',
      })
      return
    }
    const inicio = String(encerrando.vigencia_inicio).slice(0, 10)
    if (dataEncerramento < inicio) {
      toast({
        title: 'Vigência incompatível',
        description: 'O encerramento não pode ser anterior ao início da vigência.',
        variant: 'destructive',
      })
      return
    }
    setSalvando(true)
    try {
      await encerrarSalario(encerrando.id, dataEncerramento)
      toast({
        title: 'Vigência encerrada',
        description: `Encerrada em ${dataBR(dataEncerramento)}.`,
      })
      setEncerrando(null)
      await carregar()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Falha ao encerrar a vigência.'
      toast({ title: 'Não foi possível encerrar', description: msg, variant: 'destructive' })
    } finally {
      setSalvando(false)
    }
  }

  const excluir = async (s: SalarioRecord) => {
    try {
      await excluirSalario(s.id)
      toast({
        title: 'Vigência excluída',
        description: `Vigência de ${dataBR(s.vigencia_inicio)} removida.`,
      })
      await carregar()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Falha ao excluir a vigência.'
      toast({ title: 'Não foi possível excluir', description: msg, variant: 'destructive' })
    }
  }

  // ----- Estados de bloqueio (sem nenhum dado na tela) -----
  if (veredito === 'desconhecido') {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-[#78818E] dark:text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden />
        Verificando acesso…
      </div>
    )
  }
  if (veredito === 'nao_autorizado') {
    return (
      <div className="space-y-3 py-16 text-center max-w-md mx-auto">
        <ShieldAlert className="h-10 w-10 mx-auto text-[#C9922A]" aria-hidden />
        <h1 className="text-xl font-bold">Acesso restrito</h1>
        <p className="text-sm text-[#78818E] dark:text-muted-foreground">
          Esta área é exclusiva da conta do escritório. Se você precisa de acesso, procure a
          administração.
        </p>
      </div>
    )
  }

  // ----- Autorizado -----
  return (
    <div className="space-y-6 animate-fade-in-up pb-10">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center text-[10px] font-bold tracking-[1.5px] uppercase text-[#C9922A] bg-[#C9922A]/10 px-2 py-0.5 rounded">
              FOLHA
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#252B34] dark:text-foreground">
            Contracheques
          </h1>
          <p className="text-sm text-[#78818E] dark:text-muted-foreground">
            Vigências salariais dos participantes do módulo. Área exclusiva do escritório.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setDialogParticipantes(true)}>
          <UserCog className="h-4 w-4 mr-1.5" aria-hidden />
          Gerenciar participantes
        </Button>
      </div>

      {carregando ? (
        <div className="flex items-center gap-2 py-10 text-sm text-[#78818E] dark:text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Carregando…
        </div>
      ) : erro ? (
        <Card>
          <CardContent className="py-8 text-center space-y-3">
            <p className="text-sm text-destructive">{erro}</p>
            <Button variant="outline" size="sm" onClick={() => void carregar()}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 items-start">
          {funcionarios.map((f) => {
            const lista = salariosPorFuncionario.get(f.funcionarioId) ?? []
            const emVigor = vigenciaEmVigor(salarios, f.funcionarioId)
            return (
              <Card key={f.vinculoId}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-start justify-between gap-2">
                    <span>{f.nome}</span>
                    {emVigor ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                        <BadgeDollarSign className="h-3.5 w-3.5" aria-hidden />
                        {formatarSalario(emVigor.valor)}
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-[#C9922A] whitespace-nowrap">
                        Sem salário cadastrado
                      </span>
                    )}
                  </CardTitle>
                  <p className="text-xs text-[#78818E] dark:text-muted-foreground">
                    {f.ativoNoCartao ? 'Ativo' : 'Inativo'} no Cartão de Ponto
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1.5">
                    {lista.length === 0 ? (
                      <p className="text-xs text-[#78818E] dark:text-muted-foreground">
                        Nenhuma vigência salarial no histórico.
                      </p>
                    ) : (
                      lista.map((s) => (
                        <div
                          key={s.id}
                          className="flex items-center justify-between gap-2 rounded border px-2 py-1.5 text-xs"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <CalendarDays
                              className="h-3.5 w-3.5 shrink-0 text-[#78818E]"
                              aria-hidden
                            />
                            <span className="truncate">
                              {dataBR(s.vigencia_inicio)}
                              {' → '}
                              {s.vigencia_fim ? dataBR(s.vigencia_fim) : 'em vigor'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="font-semibold">{formatarSalario(s.valor)}</span>
                            {!s.vigencia_fim && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={() => {
                                  setEncerrando(s)
                                  setDataEncerramento(HOJE_YMD())
                                }}
                              >
                                Encerrar
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              aria-label={`Excluir vigência de ${dataBR(s.vigencia_inicio)}`}
                              onClick={() => void excluir(s)}
                            >
                              <X className="h-3.5 w-3.5" aria-hidden />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() =>
                      iniciarCadastro({
                        id: f.funcionarioId,
                        nome: f.nome,
                        ativo: f.ativoNoCartao,
                        perfil: f.perfil,
                      })
                    }
                  >
                    <Plus className="h-4 w-4 mr-1" aria-hidden /> Cadastrar salário
                  </Button>
                </CardContent>
              </Card>
            )
          })}
          {funcionarios.length === 0 && (
            <p className="text-sm text-[#78818E] dark:text-muted-foreground md:col-span-2 xl:col-span-3">
              Nenhum participante no módulo. Use “Gerenciar participantes” para incluir quem deve
              aparecer aqui (o Cartão de Ponto não é alterado).
            </p>
          )}
        </div>
      )}

      {/* Dialog: gerenciar participantes (seleção privada do módulo) */}
      <GerenciarParticipantesDialog
        open={dialogParticipantes}
        onOpenChange={setDialogParticipantes}
        onChanged={() => void carregar()}
      />

      {/* Dialog: cadastro de vigência salarial */}
      <Dialog open={!!dialogFuncionario} onOpenChange={(o) => !o && setDialogFuncionario(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Cadastrar salário</DialogTitle>
            <DialogDescription>
              {dialogFuncionario?.nome} — nova vigência salarial. O backend recusa vigências
              sobrepostas ou incompatíveis; salários históricos não são alterados.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cc-valor">Valor do salário (R$)</Label>
              <Input
                id="cc-valor"
                inputMode="decimal"
                placeholder="0,00"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="cc-inicio">Início da vigência</Label>
                <Input
                  id="cc-inicio"
                  type="date"
                  value={inicio}
                  onChange={(e) => setInicio(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cc-fim">Fim (opcional)</Label>
                <Input
                  id="cc-fim"
                  type="date"
                  value={fim}
                  onChange={(e) => setFim(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogFuncionario(null)}
              disabled={salvando}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => void salvarVigencia()}
              disabled={salvando}
              className={cn(salvando && 'opacity-70')}
            >
              {salvando && <Loader2 className="h-4 w-4 mr-1 animate-spin" aria-hidden />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: encerramento de vigência */}
      <Dialog open={!!encerrando} onOpenChange={(o) => !o && setEncerrando(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Encerrar vigência</DialogTitle>
            <DialogDescription>
              Vigência iniciada em {dataBR(encerrando?.vigencia_inicio)} —{' '}
              {formatarSalario(encerrando?.valor)}. O histórico e o valor não são alterados; apenas
              a data de encerramento é gravada.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="cc-encerramento">Data de encerramento</Label>
            <Input
              id="cc-encerramento"
              type="date"
              value={dataEncerramento}
              onChange={(e) => setDataEncerramento(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEncerrando(null)} disabled={salvando}>
              Cancelar
            </Button>
            <Button onClick={() => void salvarEncerramento()} disabled={salvando}>
              {salvando && <Loader2 className="h-4 w-4 mr-1 animate-spin" aria-hidden />} Encerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
