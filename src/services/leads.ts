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
  qualif_c1?: number
  qualif_c2?: number
  qualif_c3?: number
  qualif_c4?: number
  qualif_c5?: number
  sem_qualidade_c1?: number
  sem_qualidade_c2?: number
  sem_qualidade_c3?: number
  sem_qualidade_c4?: number
  sem_qualidade_c5?: number
  aposentado_c1?: number
  aposentado_c2?: number
  aposentado_c3?: number
  aposentado_c4?: number
  aposentado_c5?: number
  carne_c1?: number
  carne_c2?: number
  carne_c3?: number
  carne_c4?: number
  carne_c5?: number
  outros_c1?: number
  outros_c2?: number
  outros_c3?: number
  outros_c4?: number
  outros_c5?: number
  sem_interesse_c1?: number
  sem_interesse_c2?: number
  sem_interesse_c3?: number
  sem_interesse_c4?: number
  sem_interesse_c5?: number
  engano_c1?: number
  engano_c2?: number
  engano_c3?: number
  engano_c4?: number
  engano_c5?: number
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
