// Define o valor inicial de status_funil em novos leads de auxílio-acidente.
// O PocketBase não tem default nativo em campo select; a especificação do
// projeto exige que o valor inicial seja 'qualificando'. Roda antes da
// validação, só quando o campo não foi enviado na requisição — nunca sobrescreve.
onRecordCreateRequest((e) => {
  if (e.record.getString('status_funil') === '') {
    e.record.set('status_funil', 'qualificando')
  }
  e.next()
}, 'leads_aux_acidente')
