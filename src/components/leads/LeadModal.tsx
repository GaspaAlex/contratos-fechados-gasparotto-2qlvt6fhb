import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { ChevronDown, Plus, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { calculateLeadRow, fmtMon, fmtPct, MONTHS } from '@/lib/leads-calc'
import { createLeadDiario, updateLeadDiario } from '@/services/leads'
import { updateCampaignConfig } from '@/services/campaign_config'
import { getContratos } from '@/services/contratos'
import { useToast } from '@/hooks/use-toast'
import { extractFieldErrors } from '@/lib/pocketbase/errors'
import { cn } from '@/lib/utils'

const numSchema = z.union([z.number(), z.string()]).transform((v) => Number(v) || 0)

const schema = z.object({
  id: z.string().optional(),
  mes: z.string().min(1),
  dia: z
    .union([z.number(), z.string()])
    .transform((v) => Number(v) || 0)
    .pipe(z.number().min(1).max(31)),
  google: numSchema,
  meta_ads: numSchema,
  meta_c1: numSchema.optional(),
  meta_c2: numSchema.optional(),
  meta_c3: numSchema.optional(),
  meta_c4: numSchema.optional(),
  meta_c5: numSchema.optional(),
  qualif_c1: numSchema.optional(),
  qualif_c2: numSchema.optional(),
  qualif_c3: numSchema.optional(),
  qualif_c4: numSchema.optional(),
  qualif_c5: numSchema.optional(),
  sem_qualidade_c1: numSchema.optional(),
  sem_qualidade_c2: numSchema.optional(),
  sem_qualidade_c3: numSchema.optional(),
  sem_qualidade_c4: numSchema.optional(),
  sem_qualidade_c5: numSchema.optional(),
  aposentado_c1: numSchema.optional(),
  aposentado_c2: numSchema.optional(),
  aposentado_c3: numSchema.optional(),
  aposentado_c4: numSchema.optional(),
  aposentado_c5: numSchema.optional(),
  carne_c1: numSchema.optional(),
  carne_c2: numSchema.optional(),
  carne_c3: numSchema.optional(),
  carne_c4: numSchema.optional(),
  carne_c5: numSchema.optional(),
  outros_c1: numSchema.optional(),
  outros_c2: numSchema.optional(),
  outros_c3: numSchema.optional(),
  outros_c4: numSchema.optional(),
  outros_c5: numSchema.optional(),
  sem_interesse_c1: numSchema.optional(),
  sem_interesse_c2: numSchema.optional(),
  sem_interesse_c3: numSchema.optional(),
  sem_interesse_c4: numSchema.optional(),
  sem_interesse_c5: numSchema.optional(),
  engano_c1: numSchema.optional(),
  engano_c2: numSchema.optional(),
  engano_c3: numSchema.optional(),
  engano_c4: numSchema.optional(),
  engano_c5: numSchema.optional(),
  em_qualif: numSchema,
  sem_qualidade: numSchema,
  aposentado: numSchema,
  contribuinte_carne: numSchema,
  outros: numSchema,
  sem_interesse: numSchema,
  engano: numSchema,
  fechado_direto: numSchema,
  fechado_fup: numSchema,
  fup_ativo: numSchema,
  investimento: numSchema,
  observacoes: z.string().optional(),
})

const campaignDefaults = {
  meta_c1: 0,
  meta_c2: 0,
  meta_c3: 0,
  meta_c4: 0,
  meta_c5: 0,
  qualif_c1: 0,
  qualif_c2: 0,
  qualif_c3: 0,
  qualif_c4: 0,
  qualif_c5: 0,
  sem_qualidade_c1: 0,
  sem_qualidade_c2: 0,
  sem_qualidade_c3: 0,
  sem_qualidade_c4: 0,
  sem_qualidade_c5: 0,
  aposentado_c1: 0,
  aposentado_c2: 0,
  aposentado_c3: 0,
  aposentado_c4: 0,
  aposentado_c5: 0,
  carne_c1: 0,
  carne_c2: 0,
  carne_c3: 0,
  carne_c4: 0,
  carne_c5: 0,
  outros_c1: 0,
  outros_c2: 0,
  outros_c3: 0,
  outros_c4: 0,
  outros_c5: 0,
  sem_interesse_c1: 0,
  sem_interesse_c2: 0,
  sem_interesse_c3: 0,
  sem_interesse_c4: 0,
  sem_interesse_c5: 0,
  engano_c1: 0,
  engano_c2: 0,
  engano_c3: 0,
  engano_c4: 0,
  engano_c5: 0,
}

const TableCellInput = ({ control, name, readOnly }: any) => (
  <FormField
    control={control}
    name={name}
    render={({ field }) => (
      <Input
        type="number"
        {...field}
        value={field.value ?? ''}
        onChange={(e) => {
          const val = e.target.value
          field.onChange(val === '' ? '' : Number(val))
        }}
        readOnly={readOnly}
        className={cn(
          'h-7 text-xs text-center px-0.5 border-amber-300 bg-amber-50/80 focus-visible:ring-amber-500 dark:bg-amber-950/20 dark:border-amber-800 min-w-[36px] w-full',
          readOnly && 'bg-muted cursor-not-allowed border-muted text-muted-foreground font-bold',
        )}
      />
    )}
  />
)

const NumInput = ({ control, name, label, cl }: any) => (
  <FormField
    control={control}
    name={name}
    render={({ field }) => {
      return (
        <FormItem>
          <FormLabel className="text-[10px] uppercase text-muted-foreground">{label}</FormLabel>
          <FormControl>
            <Input
              type="number"
              {...field}
              value={field.value ?? ''}
              onChange={(e) => {
                const val = e.target.value
                field.onChange(val === '' ? '' : Number(val))
              }}
              className={`h-8 text-sm border-amber-300 bg-amber-50/80 focus-visible:ring-amber-500 dark:bg-amber-950/20 dark:border-amber-800 ${cl}`}
            />
          </FormControl>
        </FormItem>
      )
    }}
  />
)

const CalcBox = ({ label, val }: any) => (
  <div>
    <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
    <div className="h-8 rounded-md bg-muted flex items-center px-3 text-sm font-bold text-muted-foreground cursor-not-allowed border shadow-inner">
      {val}
    </div>
  </div>
)

export function LeadModal({ open, onOpenChange, data, year, onSuccess, campaignConfigs }: any) {
  const { toast } = useToast()

  const defaultMonth = `${MONTHS[new Date().getMonth()]} ${year}`

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      mes: defaultMonth,
      dia: 1,
      google: 0,
      meta_ads: 0,
      ...campaignDefaults,
      em_qualif: 0,
      sem_qualidade: 0,
      aposentado: 0,
      contribuinte_carne: 0,
      outros: 0,
      sem_interesse: 0,
      engano: 0,
      fechado_direto: 0,
      fechado_fup: 0,
      fup_ativo: 0,
      investimento: 0,
      observacoes: '',
    },
  })

  useEffect(() => {
    if (open) {
      if (data) {
        const enrichedData = { ...campaignDefaults }
        for (const k in campaignDefaults) {
          ;(enrichedData as any)[k] = data[k] || 0
        }
        form.reset({
          ...data,
          ...enrichedData,
        })
      } else {
        form.reset({
          mes: defaultMonth,
          dia: new Date().getDate(),
          google: 0,
          meta_ads: 0,
          ...campaignDefaults,
          em_qualif: 0,
          sem_qualidade: 0,
          aposentado: 0,
          contribuinte_carne: 0,
          outros: 0,
          sem_interesse: 0,
          engano: 0,
          fechado_direto: 0,
          fechado_fup: 0,
          fup_ativo: 0,
          investimento: 0,
          observacoes: '',
        })
      }
    }
  }, [open, data, year, form, defaultMonth])

  const vals = form.watch()
  const isEdit = !!data?.id

  const [metaOpen, setMetaOpen] = useState(false)
  const [newSlotLabel, setNewSlotLabel] = useState('')
  const [isAddingSlot, setIsAddingSlot] = useState(false)

  const activeConfigs = (campaignConfigs || [])
    .filter((c: any) => c.ativo)
    .sort((a: any, b: any) => a.ordem - b.ordem)
  const inactiveConfigs = (campaignConfigs || [])
    .filter((c: any) => !c.ativo)
    .sort((a: any, b: any) => a.ordem - b.ordem)

  const handleDeactivate = async (c: any) => {
    try {
      await updateCampaignConfig(c.id, { ativo: false })
      onSuccess()
    } catch (e) {
      console.error(e)
    }
  }

  const handleAddSlot = async () => {
    const slot = inactiveConfigs[0]
    if (slot && newSlotLabel) {
      try {
        await updateCampaignConfig(slot.id, { ativo: true, rotulo: newSlotLabel })
        setNewSlotLabel('')
        setIsAddingSlot(false)
        onSuccess()
      } catch (e) {
        console.error(e)
      }
    }
  }

  const getSum = (prefix: string) => {
    return (
      (form.watch(`${prefix}_c1` as any) || 0) +
      (form.watch(`${prefix}_c2` as any) || 0) +
      (form.watch(`${prefix}_c3` as any) || 0) +
      (form.watch(`${prefix}_c4` as any) || 0) +
      (form.watch(`${prefix}_c5` as any) || 0)
    )
  }

  const meta_c1 = form.watch('meta_c1') || 0
  const meta_c2 = form.watch('meta_c2') || 0
  const meta_c3 = form.watch('meta_c3') || 0
  const meta_c4 = form.watch('meta_c4') || 0
  const meta_c5 = form.watch('meta_c5') || 0
  const hasCampaignLeads = meta_c1 > 0 || meta_c2 > 0 || meta_c3 > 0 || meta_c4 > 0 || meta_c5 > 0

  const currentMetaAds = hasCampaignLeads
    ? meta_c1 + meta_c2 + meta_c3 + meta_c4 + meta_c5
    : vals.meta_ads || 0

  const em_qualif_sum = getSum('qualif')
  const sem_qualidade_sum = getSum('sem_qualidade')
  const aposentado_sum = getSum('aposentado')
  const carne_sum = getSum('carne')
  const outros_sum = getSum('outros')
  const sem_interesse_sum = getSum('sem_interesse')
  const engano_sum = getSum('engano')

  const currentEmQualif = hasCampaignLeads ? em_qualif_sum : vals.em_qualif || 0
  const currentSemQualidade = hasCampaignLeads ? sem_qualidade_sum : vals.sem_qualidade || 0
  const currentAposentado = hasCampaignLeads ? aposentado_sum : vals.aposentado || 0
  const currentCarne = hasCampaignLeads ? carne_sum : vals.contribuinte_carne || 0
  const currentOutros = hasCampaignLeads ? outros_sum : vals.outros || 0
  const currentSemInteresse = hasCampaignLeads ? sem_interesse_sum : vals.sem_interesse || 0
  const currentEngano = hasCampaignLeads ? engano_sum : vals.engano || 0

  const calc = calculateLeadRow({
    ...vals,
    meta_ads: currentMetaAds,
    em_qualif: currentEmQualif,
    sem_qualidade: currentSemQualidade,
    aposentado: currentAposentado,
    contribuinte_carne: currentCarne,
    outros: currentOutros,
    sem_interesse: currentSemInteresse,
    engano: currentEngano,
  })

  const [contratosCampanha, setContratosCampanha] = useState<any[]>([])

  useEffect(() => {
    if (open && vals.mes) {
      const fetchContratos = async () => {
        try {
          const data = await getContratos()
          const [selectedMonth, selectedYear] = vals.mes.split(' ')
          const filtered = data.filter((c) => {
            if (c.origem !== 'Campanha') return false
            if (!c.dcontrato) return false
            const date = new Date(c.dcontrato)
            const m = MONTHS[date.getUTCMonth()]
            const y = date.getUTCFullYear()
            return m === selectedMonth && String(y) === selectedYear
          })
          setContratosCampanha(filtered)
        } catch (err) {
          console.error(err)
        }
      }
      fetchContratos()
    }
  }, [open, vals.mes])

  const auxAcidenteCount = contratosCampanha.filter((c) => c.beneficio === 'Aux. Acidente').length
  const derCount = contratosCampanha.filter((c) => c.beneficio === 'DER').length
  const benAnaliseCount = contratosCampanha.filter((c) => c.beneficio === 'Ben. Análise').length
  const totalCampanhaCount = auxAcidenteCount + derCount + benAnaliseCount

  const diretoCampanhaCount = contratosCampanha.filter((c) => c.fup === false).length
  const fupCampanhaCount = contratosCampanha.filter((c) => c.fup === true).length

  const onSubmit = async (values: any) => {
    const finalValues = {
      ...values,
      meta_ads: currentMetaAds,
      em_qualif: currentEmQualif,
      sem_qualidade: currentSemQualidade,
      aposentado: currentAposentado,
      contribuinte_carne: currentCarne,
      outros: currentOutros,
      sem_interesse: currentSemInteresse,
      engano: currentEngano,
    }

    try {
      if (isEdit) await updateLeadDiario(data.id, finalValues)
      else await createLeadDiario(finalValues)
      toast({ title: 'Sucesso', description: 'Registro salvo com sucesso.' })
      onSuccess()
      onOpenChange(false)
    } catch (err) {
      const errs = extractFieldErrors(err)
      if (errs.mes)
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Já existe um registro para este dia.',
        })
      else toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível salvar.' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {isEdit ? `Editar: Dia ${vals.dia} — ${vals.mes}` : 'Registrar Dia'}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4 pb-4 border-b">
              <FormField
                control={form.control}
                name="mes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Mês/Ano</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-9 border-amber-300 bg-amber-50 dark:bg-amber-950/20">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {MONTHS.map((m) => (
                          <SelectItem
                            key={`${m} ${year}`}
                            value={`${m} ${year}`}
                          >{`${m} ${year}`}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dia"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Dia do Mês</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => {
                          const val = e.target.value
                          field.onChange(val === '' ? '' : Number(val))
                        }}
                        className="h-9 border-amber-300 bg-amber-50 dark:bg-amber-950/20"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-6">
              {/* TOP SECTION */}
              <div className="p-3 rounded-md bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900 shadow-sm">
                <h4 className="text-xs font-bold text-blue-700 mb-2">LEADS RECEBIDOS</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                  <div>
                    <NumInput control={form.control} name="google" label="Google Ads" />
                  </div>
                  <div>
                    <CalcBox label="Total Leads" val={calc.total_leads} />
                  </div>
                </div>

                <div className="p-2 rounded-md bg-blue-100/50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div
                      onClick={() => setMetaOpen(!metaOpen)}
                      className="text-[10px] font-bold text-blue-800 dark:text-blue-300 flex items-center gap-1 cursor-pointer uppercase select-none"
                    >
                      META ADS{' '}
                      <ChevronDown
                        className={cn('w-3 h-3 transition-transform', metaOpen ? 'rotate-180' : '')}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-blue-800 dark:text-blue-300">
                        TOTAL:
                      </span>
                      <Input
                        type="number"
                        value={currentMetaAds}
                        onChange={(e) => {
                          if (!hasCampaignLeads) {
                            form.setValue('meta_ads', Number(e.target.value) || 0)
                          }
                        }}
                        readOnly={hasCampaignLeads}
                        className={cn(
                          'h-6 w-16 px-2 text-xs text-right font-bold border-blue-300',
                          hasCampaignLeads && 'bg-muted cursor-not-allowed text-muted-foreground',
                        )}
                      />
                    </div>
                  </div>
                  {metaOpen && (
                    <div className="pt-2 animate-in fade-in slide-in-from-top-1">
                      <div className="w-full border rounded-md shadow-sm overflow-hidden">
                        <table className="w-full text-xs text-left bg-[#FAF8F2] dark:bg-amber-950/10 table-fixed">
                          <thead className="bg-muted text-xs text-muted-foreground uppercase whitespace-nowrap">
                            <tr>
                              <th className="px-1 py-1.5 font-semibold w-[12%]">CAMPANHA</th>
                              <th className="px-0.5 py-1.5 font-semibold text-center w-[8%]">
                                LEADS
                              </th>
                              <th className="px-0.5 py-1.5 font-semibold text-center w-[8%]">
                                EM QUALIF.
                              </th>
                              <th className="px-0.5 py-1.5 font-semibold text-center w-[8%]">
                                S.QUAL.
                              </th>
                              <th className="px-0.5 py-1.5 font-semibold text-center w-[8%]">
                                APOSENT.
                              </th>
                              <th className="px-0.5 py-1.5 font-semibold text-center w-[8%]">
                                CARNÊ
                              </th>
                              <th className="px-0.5 py-1.5 font-semibold text-center w-[8%]">
                                OUTROS
                              </th>
                              <th className="px-0.5 py-1.5 font-semibold text-center w-[8%]">
                                S.INTER.
                              </th>
                              <th className="px-0.5 py-1.5 font-semibold text-center w-[8%]">
                                ENGANO
                              </th>
                              <th className="px-0.5 py-1.5 font-semibold text-center w-[8%]">
                                T.DESQ.
                              </th>
                              <th className="px-1 py-1.5 w-[6%]"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-amber-100 dark:divide-amber-900/50">
                            {activeConfigs.map((c: any) => {
                              const slot = c.slug.replace('meta_c', '')
                              const metaName = `meta_c${slot}`
                              const qualifName = `qualif_c${slot}`
                              const semQualidadeName = `sem_qualidade_c${slot}`
                              const aposentadoName = `aposentado_c${slot}`
                              const carneName = `carne_c${slot}`
                              const outrosName = `outros_c${slot}`
                              const semInteresseName = `sem_interesse_c${slot}`
                              const enganoName = `engano_c${slot}`

                              const semQualidade = form.watch(semQualidadeName) || 0
                              const aposentado = form.watch(aposentadoName) || 0
                              const carne = form.watch(carneName) || 0
                              const outros = form.watch(outrosName) || 0
                              const semInteresse = form.watch(semInteresseName) || 0
                              const engano = form.watch(enganoName) || 0

                              const totalDesqualif =
                                semQualidade + aposentado + carne + outros + semInteresse + engano

                              return (
                                <tr key={c.id}>
                                  <td
                                    className="px-1 py-1 align-middle font-medium whitespace-nowrap text-[10px] text-amber-900 dark:text-amber-200 truncate"
                                    title={c.rotulo}
                                  >
                                    {c.rotulo}
                                  </td>
                                  <td className="px-0.5 py-1 align-middle">
                                    <TableCellInput control={form.control} name={metaName} />
                                  </td>
                                  <td className="px-0.5 py-1 align-middle">
                                    <TableCellInput control={form.control} name={qualifName} />
                                  </td>
                                  <td className="px-0.5 py-1 align-middle">
                                    <TableCellInput
                                      control={form.control}
                                      name={semQualidadeName}
                                    />
                                  </td>
                                  <td className="px-0.5 py-1 align-middle">
                                    <TableCellInput control={form.control} name={aposentadoName} />
                                  </td>
                                  <td className="px-0.5 py-1 align-middle">
                                    <TableCellInput control={form.control} name={carneName} />
                                  </td>
                                  <td className="px-0.5 py-1 align-middle">
                                    <TableCellInput control={form.control} name={outrosName} />
                                  </td>
                                  <td className="px-0.5 py-1 align-middle">
                                    <TableCellInput
                                      control={form.control}
                                      name={semInteresseName}
                                    />
                                  </td>
                                  <td className="px-0.5 py-1 align-middle">
                                    <TableCellInput control={form.control} name={enganoName} />
                                  </td>
                                  <td className="px-0.5 py-1 align-middle">
                                    <div className="h-7 rounded-md bg-[#F3F4F6] dark:bg-muted/50 border dark:border-muted flex items-center justify-center font-bold text-xs text-muted-foreground w-full min-w-[36px]">
                                      {totalDesqualif}
                                    </div>
                                  </td>
                                  <td className="px-1 py-1 align-middle text-right">
                                    <button
                                      type="button"
                                      onClick={() => handleDeactivate(c)}
                                      className="text-red-500 hover:text-red-700 transition-colors p-1"
                                      title="Desativar campanha"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>

                      {inactiveConfigs.length > 0 && (
                        <div className="flex items-center gap-2 mt-3">
                          {!isAddingSlot ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 text-[10px] px-2"
                              onClick={() => setIsAddingSlot(true)}
                            >
                              <Plus className="w-3 h-3 mr-1" /> Adicionar Campanha
                            </Button>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Input
                                value={newSlotLabel}
                                onChange={(e) => setNewSlotLabel(e.target.value)}
                                placeholder="Nome da campanha"
                                className="h-7 text-[10px] w-32"
                              />
                              <Button
                                type="button"
                                size="sm"
                                className="h-7 text-[10px] px-2"
                                onClick={handleAddSlot}
                              >
                                Salvar
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 text-[10px] px-2"
                                onClick={() => {
                                  setIsAddingSlot(false)
                                  setNewSlotLabel('')
                                }}
                              >
                                Cancelar
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* MIDDLE SECTION */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-3 rounded-md bg-green-50/50 dark:bg-green-900/10 border border-green-100 dark:border-green-900 shadow-sm flex flex-col justify-center">
                  <h4 className="text-xs font-bold text-green-700 mb-2">QUALIFICADOS</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <CalcBox label="Total Qualificados" val={calc.qualificados} />
                  </div>
                </div>

                <div className="p-3 rounded-md bg-teal-50/50 dark:bg-teal-900/10 border border-teal-100 dark:border-teal-900 shadow-sm">
                  <h4 className="text-xs font-bold text-teal-700 mb-2 uppercase">
                    Fechamentos por Campanha (Banco de Dados)
                  </h4>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <CalcBox label="Direto" val={diretoCampanhaCount} />
                    <CalcBox label="FUP" val={fupCampanhaCount} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <CalcBox label="Aux. Acidente" val={auxAcidenteCount} />
                    <CalcBox label="DER" val={derCount} />
                    <CalcBox label="Ben. Análise" val={benAnaliseCount} />
                    <CalcBox label="Total" val={totalCampanhaCount} />
                  </div>
                </div>
              </div>

              {/* BOTTOM SECTION */}
              <div className="p-3 rounded-md bg-purple-50/50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900 shadow-sm">
                <h4 className="text-xs font-bold text-purple-700 mb-2">INVESTIMENTO & OBS</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <NumInput
                    control={form.control}
                    name="investimento"
                    label="Valor Investido (R$)"
                  />
                  <FormField
                    control={form.control}
                    name="observacoes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] uppercase text-muted-foreground">
                          Observações
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="h-8 text-sm border-purple-300 bg-purple-50/80 focus-visible:ring-purple-500 dark:bg-purple-950/20 dark:border-purple-800"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            <div className="bg-muted/30 p-3 rounded-md border grid grid-cols-4 gap-2 text-center shadow-sm">
              <div>
                <div className="text-[10px] text-muted-foreground uppercase">Conv. Geral %</div>
                <div className="font-bold text-purple-700">{fmtPct(calc.conv_geral)}</div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground uppercase">Conv. Qualif. %</div>
                <div className="font-bold text-purple-700">{fmtPct(calc.conv_qualif)}</div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground uppercase">Desqualificação</div>
                <div className="font-bold text-red-600">{fmtPct(calc.desqual_pct)}</div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground uppercase">CAC</div>
                <div className="font-bold text-blue-700">{fmtMon(calc.cac)}</div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-[#C9922A] hover:bg-[#a67721] text-white">
                Salvar Registro
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
