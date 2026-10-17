export const STATUS_COLORS: Record<string, string> = {
  'Aguardando pagamento':
    'bg-[#2B6CB0]/10 text-[#2B6CB0] border-[#2B6CB0]/25 dark:bg-[#2B6CB0]/20 dark:text-sky-300 dark:border-[#2B6CB0]/40',
  'Aguardando expedição':
    'bg-[#C77E1E]/10 text-[#C77E1E] border-[#C77E1E]/25 dark:bg-[#C77E1E]/20 dark:text-amber-300 dark:border-[#C77E1E]/40',
  'Aguardando Alvará':
    'bg-[#7A49A5]/10 text-[#7A49A5] border-[#7A49A5]/25 dark:bg-[#7A49A5]/20 dark:text-purple-300 dark:border-[#7A49A5]/40',
  'Aguardando cálculo':
    'bg-[#78818E]/10 text-[#5F6775] border-[#78818E]/25 dark:bg-[#78818E]/20 dark:text-gray-300 dark:border-[#78818E]/40',
  'Aguardando pagto sucumbência':
    'bg-[#D97706]/10 text-[#B45309] border-[#D97706]/25 dark:bg-[#D97706]/20 dark:text-amber-200 dark:border-[#D97706]/40',
  'Cálculo apresentado':
    'bg-[#4A7FA5]/10 text-[#2C5F85] border-[#4A7FA5]/25 dark:bg-[#4A7FA5]/20 dark:text-sky-200 dark:border-[#4A7FA5]/40',
  'Cálculo Impugnado':
    'bg-[#B4453C]/10 text-[#B4453C] border-[#B4453C]/25 dark:bg-[#B4453C]/20 dark:text-rose-300 dark:border-[#B4453C]/40',
  'Precatório aguardando pagamento':
    'bg-[#58335E]/10 text-[#58335E] border-[#58335E]/25 dark:bg-[#58335E]/25 dark:text-purple-200 dark:border-[#58335E]/40',
  'Precatório aguardando expedição':
    'bg-[#8E44AD]/10 text-[#8E44AD] border-[#8E44AD]/25 dark:bg-[#8E44AD]/20 dark:text-fuchsia-300 dark:border-[#8E44AD]/40',
  Recebido:
    'bg-[#3E8E5A]/10 text-[#2E6B43] border-[#3E8E5A]/25 dark:bg-[#3E8E5A]/20 dark:text-emerald-300 dark:border-[#3E8E5A]/40 font-medium',
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
