import pb from '@/lib/pocketbase/client'

export const getRpvs = () => {
  return pb.collection('rpv_precatorio').getFullList({ sort: '-created' })
}

export const createRpv = (data: any) => {
  return pb.collection('rpv_precatorio').create(data)
}

export const updateRpv = (id: string, data: any) => {
  return pb.collection('rpv_precatorio').update(id, data)
}

export const deleteRpv = (id: string) => {
  return pb.collection('rpv_precatorio').delete(id)
}
