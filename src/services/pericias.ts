import pb from '@/lib/pocketbase/client'

export interface Pericia {
  id: string
  nome: string
  nautos: string
  data: string
  horario: string
  endereco: string
  perito: string
  status: 'Agendado' | 'Pendente' | 'Cancelado'
  compareceu: 'Sim' | 'Não' | 'Não realizada'
  laudo: 'Favorável' | 'Desfavorável' | 'Aguardando'
  created: string
  updated: string
}

export const getPericias = () => pb.collection('pericias').getFullList<Pericia>({ sort: 'data' })

export const createPericia = (data: Partial<Pericia>) =>
  pb.collection('pericias').create<Pericia>(data)

export const updatePericia = (id: string, data: Partial<Pericia>) =>
  pb.collection('pericias').update<Pericia>(id, data)

export const deletePericia = (id: string) => pb.collection('pericias').delete(id)
