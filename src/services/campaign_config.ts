import pb from '@/lib/pocketbase/client'

export interface CampaignConfig {
  id?: string
  slug: string
  rotulo: string
  ativo: boolean
  ordem: number
}

export const getCampaignConfigs = () =>
  pb.collection('configuracoes_metas').getFullList<CampaignConfig>({ sort: 'ordem' })

export const updateCampaignConfig = (id: string, data: Partial<CampaignConfig>) =>
  pb.collection('configuracoes_metas').update<CampaignConfig>(id, data)
