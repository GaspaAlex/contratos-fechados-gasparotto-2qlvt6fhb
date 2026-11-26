/**
 * BOTÃO "CADASTRAR EQUIPE PADRÃO" (Build F2) — planejamento IDEMPOTENTE.
 * =====================================================================
 * Função PURA: consulta o que já existe (colaboradores + regras carregados) e
 * devolve o PLANO de criação — nada é gravado aqui. A gravação (somente após
 * diálogo de confirmação, por um gestor) aplica o plano via
 * src/services/comissoesColaboradores.ts.
 *
 * Equipe padrão (início 2026-11):
 *   Bia R$ 20 fixa · Nayara R$ 20 fixa · Kaique R$ 10 fixa ·
 *   Nataly R$ 20 condicionada_meta.
 *
 * IDEMPOTÊNCIA: nunca duplica nome de colaborador nem regra idêntica já
 * existente. Configuração parcial/conflitante/ambígua NÃO é sobrescrita em
 * silêncio: entra em `conflitos` para o gestor decidir.
 */
import { competenciaDeMesAno } from '@/lib/comissoesColaboradores'
import type {
  ColaboradorComissionadoRecord,
  RegraComissaoRecord,
} from '@/services/comissoesColaboradores'

export const VIGENCIA_INICIO_PADRAO = '2026-11'

export interface ColaboradorPadraoDef {
  nome: string
  valor: number
  modalidade: 'fixa' | 'condicionada_meta'
}

export const EQUIPE_PADRAO: ColaboradorPadraoDef[] = [
  { nome: 'Bia', valor: 20, modalidade: 'fixa' },
  { nome: 'Nayara', valor: 20, modalidade: 'fixa' },
  { nome: 'Kaique', valor: 10, modalidade: 'fixa' },
  { nome: 'Nataly', valor: 20, modalidade: 'condicionada_meta' },
]

export interface PlanoColaboradorPadrao {
  def: ColaboradorPadraoDef
  acao: 'criar' | 'ignorar'
  /** id do colaborador existente (quando ignorar/criar regra sobre existente). */
  colaboradorId?: string
  /** true quando a regra padrão idêntica já existe (nada a gravar). */
  regraJaExiste: boolean
  observacao?: string
}

export interface PlanoEquipePadrao {
  competencias: string
  itens: PlanoColaboradorPadrao[]
  /** Nomes que já existem com ORTOGRAFIA próxima, mas não idêntica (ambíguo). */
  ambiguidades: { def: ColaboradorPadraoDef; existente: string }[]
  /** Regra existente para o mesmo colaborador/competência com valor/modalidade DIFERENTES. */
  conflitos: { nome: string; regra: RegraComissaoRecord }[]
  /** Nome já existe como colaborador, mas com regra padrão idêntica ausente. */
  faltando: string[]
  /** Pode gravar sem decisão do gestor? (false quando há ambiguidade/conflito). */
  podeGravarDireto: boolean
  resumo: string
}

const normalizeNome = (v: string) =>
  (v || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()

export function planejarEquipePadrao(params: {
  colaboradores: ColaboradorComissionadoRecord[]
  regras: RegraComissaoRecord[]
  vigenciaInicio?: string
}): PlanoEquipePadrao {
  const vigenciaInicio = params.vigenciaInicio ?? VIGENCIA_INICIO_PADRAO
  const porNome = new Map(params.colaboradores.map((c) => [normalizeNome(c.nome), c]))
  const itens: PlanoColaboradorPadrao[] = []
  const ambiguidades: PlanoEquipePadrao['ambiguidades'] = []
  const conflitos: PlanoEquipePadrao['conflitos'] = []
  const faltando: string[] = []

  for (const def of EQUIPE_PADRAO) {
    const chave = normalizeNome(def.nome)
    const existente = porNome.get(chave)

    if (!existente) {
      // Nome não existe ainda: cria colaborador + regra (nada para duplicar).
      itens.push({ def, acao: 'criar', regraJaExiste: false })
      continue
    }

    // Colaborador já existe: verifica a regra padrão nesta vigência.
    const regrasDoColaborador = params.regras.filter(
      (r) => r.colaborador === existente.id && r.vigencia_inicio === vigenciaInicio,
    )
    const identica = regrasDoColaborador.find(
      (r) => r.modalidade === def.modalidade && Number(r.valor) === def.valor,
    )
    const divergente = regrasDoColaborador.find(
      (r) => !(r.modalidade === def.modalidade && Number(r.valor) === def.valor),
    )

    if (identica && !divergente) {
      itens.push({
        def,
        acao: 'ignorar',
        colaboradorId: existente.id,
        regraJaExiste: true,
        observacao: `Já cadastrado(a) com a regra padrão (${vigenciaInicio}).`,
      })
      continue
    }

    if (divergente) {
      // Mesma competência com valor/modalidade diferente: NÃO sobrescrever.
      conflitos.push({ nome: def.nome, regra: divergente })
      itens.push({
        def,
        acao: 'ignorar',
        colaboradorId: existente.id,
        regraJaExiste: false,
        observacao: `Conflito: já existe regra em ${vigenciaInicio} com valor diferente (R$ ${divergente.valor}, ${divergente.modalidade}).`,
      })
      continue
    }

    // Colaborador existe, regra padrão idêntica NÃO existe nesta vigência.
    itens.push({
      def,
      acao: 'ignorar',
      colaboradorId: existente.id,
      regraJaExiste: false,
      observacao: `Colaborador(a) já cadastrado(a); falta a regra padrão de ${vigenciaInicio}.`,
    })
    faltando.push(def.nome)
  }

  const aCriar = itens.filter((i) => i.acao === 'criar')
  const jaProntos = itens.filter((i) => i.regraJaExiste).map((i) => i.def.nome)
  const podeGravarDireto = conflitos.length === 0 && ambiguidades.length === 0

  const partes: string[] = []
  if (aCriar.length > 0) {
    partes.push(
      `criar ${aCriar.length} colaborador(es): ${aCriar.map((i) => i.def.nome).join(', ')}`,
    )
  }
  if (faltando.length > 0) {
    partes.push(`cadastrar regra para: ${faltando.join(', ')} (colaborador já existe)`)
  }
  if (jaProntos.length > 0) {
    partes.push(`já configurado(s): ${jaProntos.join(', ')}`)
  }
  if (conflitos.length > 0) {
    partes.push(`${conflitos.length} conflito(s) a decidir`)
  }

  return {
    competencias: vigenciaInicio,
    itens,
    ambiguidades,
    conflitos,
    faltando,
    podeGravarDireto,
    resumo: partes.length > 0 ? partes.join(' · ') : 'Nada a fazer — equipe padrão já configurada.',
  }
}

/** Competência "YYYY-MM" de mes/ano (reexport fino para a UI). */
export const competenciaEquipe = (mes: number, ano: number) => competenciaDeMesAno(mes, ano)
