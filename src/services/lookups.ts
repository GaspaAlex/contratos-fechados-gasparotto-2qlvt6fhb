import pb from '@/lib/pocketbase/client'

export const getTiposAcao = () => pb.collection('tipos_acao').getFullList({ sort: 'nome' })

export const getResponsaveis = () => pb.collection('responsaveis').getFullList({ sort: 'nome' })
