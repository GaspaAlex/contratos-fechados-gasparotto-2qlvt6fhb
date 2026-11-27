/**
 * SERVIÇO — FERIADOS CADASTRADOS (Build C3-B)
 * ========================================================================
 * I/O da coleção privada cc_feriados (regras restritas ao proprietário —
 * migration 0117). Devolve feriados ESTADUAIS/MUNICIPAIS/AVULSOS no formato
 * puro FeriadoCadastrado do motor. Os feriados NACIONAIS são embutidos no
 * motor (ccComissaoDsr.ts) e NÃO são lidos aqui — ausência de registros nesta
 * coleção NÃO significa ausência de feriados nacionais.
 */
import pb from '@/lib/pocketbase/client'
import type { FeriadoCadastrado } from '@/lib/ccComissaoDsr'

export interface FeriadoRecord {
  id: string
  nome: string
  dia: number
  mes: number
  ano: number
  escopo?: string
  uf?: string
  municipio?: string
}

/**
 * Lê todos os feriados cadastrados. Em caso de erro (rede/permisso) devolve
 * [] e o cálculo segue com os nacionais embutidos — nunca quebra a tela.
 */
export async function getFeriadosCC(): Promise<FeriadoCadastrado[]> {
  try {
    const recs = (await pb.collection('cc_feriados').getFullList({
      sort: 'mes,dia',
    })) as unknown as FeriadoRecord[]
    return recs
      .filter((r) => Number.isInteger(r.dia) && Number.isInteger(r.mes))
      .map((r) => ({
        id: r.id,
        nome: r.nome || 'Feriado cadastrado',
        dia: Number(r.dia),
        mes: Number(r.mes),
        ano: Number(r.ano ?? 0),
        escopo: r.escopo || undefined,
      }))
  } catch (e) {
    console.error('Falha ao ler cc_feriados — seguindo só com os nacionais embutidos.', e)
    return []
  }
}
