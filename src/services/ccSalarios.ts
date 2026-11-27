/**
 * SERVIÇO — CONTRACHEQUES C1 (vigências salariais)
 * ============================================================
 * Acesso à collection cc_salarios. TODAS as regras de API (list/view/
 * create/update/delete) exigem o usuário autorizado (ID yxubawrt8aser8k /
 * e-mail escritorio@advocaciagasparotto.com.br) — qualquer OUTRO usuário
 * autenticado leva 403/404 do próprio backend, então este serviço falha
 * fechado para quem não é autorizado.
 *
 * NÃO cria, altera ou remove salários por conta própria — só executa o que a
 * tela pede (a validação de vigências é server-side, no hook
 * cc_salarios_vigencias; este arquivo apenas repassa o erro).
 */
import pb from '@/lib/pocketbase/client'

/** Registro de cc_salarios no formato devolvido pelo SDK. */
export interface SalarioRecord {
  id: string
  funcionario: string
  valor: number
  vigencia_inicio: string
  vigencia_fim: string
  created: string
  updated: string
  collectionId?: string
  collectionName?: string
  expand?: {
    funcionario?: { id: string; nome: string; ativo: boolean; perfil?: string }
  }
}

/** Funcionário do Cartão de Ponto (reuso — a collection não é alterada). */
export interface FuncionarioCC {
  id: string
  nome: string
  ativo: boolean
  perfil?: string
  user_id?: string
}

/** Lista todas as vigências salariais, com o funcionário expandido. */
export async function getSalarios(): Promise<SalarioRecord[]> {
  return await pb.collection('cc_salarios').getFullList<SalarioRecord>({
    sort: 'funcionario,vigencia_inicio',
    expand: 'funcionario',
  })
}

/** Cria uma vigência salarial (o hook server-side valida sobreposição). */
export async function criarSalario(input: {
  funcionario: string
  valor: number
  vigencia_inicio: string
  vigencia_fim?: string
}): Promise<SalarioRecord> {
  return await pb.collection('cc_salarios').create<SalarioRecord>({
    funcionario: input.funcionario,
    valor: input.valor,
    vigencia_inicio: input.vigencia_inicio,
    vigencia_fim: input.vigencia_fim || '',
  })
}

/** Encerra (ou adianta o fim de) uma vigência — histórico não é reescrito. */
export async function encerrarSalario(id: string, vigencia_fim: string): Promise<SalarioRecord> {
  return await pb.collection('cc_salarios').update<SalarioRecord>(id, { vigencia_fim })
}

/** Remove uma vigência salarial inteira (nunca é feito automaticamente). */
export async function excluirSalario(id: string): Promise<void> {
  await pb.collection('cc_salarios').delete(id)
}

/**
 * Lista os funcionários do Cartão de Ponto (reuso, sem duplicar cadastro).
 * Consulta direta à collection funcionarios (sem filtro de perfil) porque o
 * serviço do Cartão de Ponto exclui 'admin' — aqui o Dr. Alex também precisa
 * aparecer. A collection NÃO é alterada por este build.
 */
export async function getFuncionariosCC(): Promise<FuncionarioCC[]> {
  const todos = await pb.collection('funcionarios').getFullList({
    sort: 'nome',
  })
  return todos.map((f: Record<string, unknown>) => ({
    id: String(f.id ?? ''),
    nome: String(f.nome ?? ''),
    ativo: Boolean(f.ativo),
    perfil: f.perfil ? String(f.perfil) : undefined,
    user_id: f.user_id ? String(f.user_id) : undefined,
  }))
}

/** Formata o salário como moeda (pt-BR, 2 casas — precisão monetária). */
export function formatarSalario(valor: number | undefined | null): string {
  if (typeof valor !== 'number' || isNaN(valor)) return '—'
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/** Data civil (YYYY-MM-DD) em formato BR — para exibição de vigências. */
export function dataBR(valor: string | undefined | null): string {
  if (!valor) return '—'
  const ymd = String(valor).slice(0, 10)
  const [a, m, d] = ymd.split('-')
  if (!a || !m || !d) return valor
  return `${d}/${m}/${a}`
}

/** Vigência em vigor HOJE para um funcionário (datas inclusivas). */
export function vigenciaEmVigor(
  salarios: SalarioRecord[],
  funcionarioId: string,
  hoje = new Date(),
): SalarioRecord | undefined {
  const ymd =
    hoje.getFullYear() +
    '-' +
    String(hoje.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(hoje.getDate()).padStart(2, '0')
  return salarios.find((s) => {
    if (s.funcionario !== funcionarioId) return false
    const ini = String(s.vigencia_inicio).slice(0, 10)
    const fim = s.vigencia_fim ? String(s.vigencia_fim).slice(0, 10) : ''
    return ini <= ymd && (fim === '' || fim >= ymd)
  })
}
