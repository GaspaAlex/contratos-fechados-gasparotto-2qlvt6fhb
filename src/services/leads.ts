import pb from '@/lib/pocketbase/client'

export interface LeadDiario {
  id?: string
  mes: string
  dia: number
  google: number
  meta_ads: number
  meta_c1?: number
  meta_c2?: number
  meta_c3?: number
  meta_c4?: number
  meta_c5?: number
  particular: number
  em_qualif: number
  sem_qualidade: number
  aposentado: number
  contribuinte_carne: number
  outros: number
  sem_interesse: number
  engano: number
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
    filter: `created >= "${year}-01-01 00:00:00" && created <= "${year}-12-31 23:59:59"`,
    sort: 'dia',
  })

export const createLeadDiario = (data: Partial<LeadDiario>) =>
  pb.collection('leads_diarios').create<LeadDiario>(data)

export const updateLeadDiario = (id: string, data: Partial<LeadDiario>) =>
  pb.collection('leads_diarios').update<LeadDiario>(id, data)

export const deleteLeadDiario = (id: string) => pb.collection('leads_diarios').delete(id)
