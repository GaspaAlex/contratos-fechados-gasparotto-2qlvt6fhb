export const STATUS_COLORS: Record<string, string> = {
  'Aguardando pagamento': 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  'Aguardando expedição': 'bg-amber-100 text-amber-800 hover:bg-amber-100',
  'Aguardando Alvará': 'bg-purple-100 text-purple-800 hover:bg-purple-100',
  'Aguardando cálculo': 'bg-gray-100 text-gray-800 hover:bg-gray-100',
  'Aguardando pagto sucumbência': 'bg-orange-100 text-orange-800 hover:bg-orange-100',
  'Cálculo apresentado': 'bg-sky-100 text-sky-800 hover:bg-sky-100',
  'Cálculo Impugnado': 'bg-red-100 text-red-800 hover:bg-red-100',
  'Precatório aguardando pagamento': 'bg-[#4B0082]/10 text-[#4B0082] hover:bg-[#4B0082]/10',
  'Precatório aguardando expedição': 'bg-fuchsia-100 text-fuchsia-800 hover:bg-fuchsia-100',
  Recebido: 'bg-green-100 text-green-800 hover:bg-green-100',
}

export const STATUS_OPTIONS = Object.keys(STATUS_COLORS)

export const MONTHS = [
  { value: '01', label: 'Janeiro' },
  { value: '02', label: 'Fevereiro' },
  { value: '03', label: 'Março' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Maio' },
  { value: '06', label: 'Junho' },
  { value: '07', label: 'Julho' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
]

export const YEARS = ['2026', '2027']
