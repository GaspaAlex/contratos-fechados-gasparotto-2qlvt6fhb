import pb from '@/lib/pocketbase/client'

export interface LeadDiario {
  id?: string
  mes: string
  dia: number
  meta: number
  google: number
  meta_ads: number
  particular: number
  em_qualif: number
  sem_qualidade: number
  aposentado: number
  contribuinte_carne: number
  outros: number
  fechado_direto: number
  fechado_fup: number
  fup_ativo: number
  investimento: number
  observacoes: string
  created?: string
  updated?: string
}

export const getLeadsByYear = (year: string) =>
  pb.collection('leads_diarios').getFullList<LeadDiario>({
    filter: `mes ~ "${year}"`,
    sort: 'dia',
  })

export const createLeadDiario = (data: Partial<LeadDiario>) =>
  pb.collection('leads_diarios').create<LeadDiario>(data)

export const updateLeadDiario = (id: string, data: Partial<LeadDiario>) =>
  pb.collection('leads_diarios').update<LeadDiario>(id, data)

export const deleteLeadDiario = (id: string) => pb.collection('leads_diarios').delete(id)
