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
  particular: numSchema,
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
      meta_c1: 0,
      meta_c2: 0,
      meta_c3: 0,
      meta_c4: 0,
      meta_c5: 0,
      particular: 0,
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
        form.reset({
          ...data,
          meta_c1: data.meta_c1 || 0,
          meta_c2: data.meta_c2 || 0,
          meta_c3: data.meta_c3 || 0,
          meta_c4: data.meta_c4 || 0,
          meta_c5: data.meta_c5 || 0,
        })
      } else {
        form.reset({
          mes: defaultMonth,
          dia: new Date().getDate(),
          google: 0,
          meta_ads: 0,
          meta_c1: 0,
          meta_c2: 0,
          meta_c3: 0,
          meta_c4: 0,
          meta_c5: 0,
          particular: 0,
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

  const meta_c1 = form.watch('meta_c1') || 0
  const meta_c2 = form.watch('meta_c2') || 0
  const meta_c3 = form.watch('meta_c3') || 0
  const meta_c4 = form.watch('meta_c4') || 0
  const meta_c5 = form.watch('meta_c5') || 0
  const hasCampaignLeads = meta_c1 > 0 || meta_c2 > 0 || meta_c3 > 0 || meta_c4 > 0 || meta_c5 > 0

  const currentMetaAds = hasCampaignLeads
    ? meta_c1 + meta_c2 + meta_c3 + meta_c4 + meta_c5
    : vals.meta_ads || 0

  const calc = calculateLeadRow({ ...vals, meta_ads: currentMetaAds })

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
      meta_ads: hasCampaignLeads
        ? values.meta_c1 + values.meta_c2 + values.meta_c3 + values.meta_c4 + values.meta_c5
        : values.meta_ads,
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="p-3 rounded-md bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900 shadow-sm">
                  <h4 className="text-xs font-bold text-blue-700 mb-2">LEADS RECEBIDOS</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <NumInput control={form.control} name="google" label="Google Ads" />
                    <NumInput control={form.control} name="particular" label="Particular" />

                    <div className="col-span-2">
                      <div className="p-2 rounded-md bg-blue-100/50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <div
                            onClick={() => setMetaOpen(!metaOpen)}
                            className="text-[10px] font-bold text-blue-800 dark:text-blue-300 flex items-center gap-1 cursor-pointer uppercase select-none"
                          >
                            META ADS{' '}
                            <ChevronDown
                              className={cn(
                                'w-3 h-3 transition-transform',
                                metaOpen ? 'rotate-180' : '',
                              )}
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
                                hasCampaignLeads &&
                                  'bg-muted cursor-not-allowed text-muted-foreground',
                              )}
                            />
                          </div>
                        </div>
                        {metaOpen && (
                          <div className="space-y-3 pt-1 animate-in fade-in slide-in-from-top-1">
                            <div className="grid grid-cols-2 gap-2">
                              {activeConfigs.map((c: any) => (
                                <div key={c.id} className="relative group">
                                  <NumInput control={form.control} name={c.slug} label={c.rotulo} />
                                  <button
                                    type="button"
                                    onClick={() => handleDeactivate(c)}
                                    className="absolute right-0 top-0 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                            {inactiveConfigs.length > 0 && (
                              <div className="flex items-center gap-2 mt-2">
                                {!isAddingSlot ? (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-6 text-[10px] px-2"
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
                                      className="h-6 text-[10px] w-32"
                                    />
                                    <Button
                                      type="button"
                                      size="sm"
                                      className="h-6 text-[10px] px-2"
                                      onClick={handleAddSlot}
                                    >
                                      Salvar
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 text-[10px] px-2"
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

                    <div className="col-span-2 mt-1">
                      <CalcBox label="Total Leads" val={calc.total_leads} />
                    </div>
                  </div>
                </div>
                <div className="p-3 rounded-md bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900 shadow-sm">
                  <h4 className="text-xs font-bold text-amber-700 mb-2">EM QUALIFICAÇÃO</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <NumInput control={form.control} name="em_qualif" label="Em Qualificação" />
                  </div>
                </div>
                <div className="p-3 rounded-md bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-900 shadow-sm">
                  <h4 className="text-xs font-bold text-red-700 mb-2">DESQUALIFICADOS</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <NumInput control={form.control} name="sem_qualidade" label="Sem Qualidade" />
                    <NumInput control={form.control} name="aposentado" label="Aposentado" />
                    <NumInput
                      control={form.control}
                      name="contribuinte_carne"
                      label="Contrib. Carnê"
                    />
                    <NumInput control={form.control} name="outros" label="Outros" />
                    <NumInput control={form.control} name="sem_interesse" label="Sem Interesse" />
                    <NumInput control={form.control} name="engano" label="Engano" />
                    <CalcBox label="Total Desqualif." val={calc.total_desq} />
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="p-3 rounded-md bg-green-50/50 dark:bg-green-900/10 border border-green-100 dark:border-green-900 shadow-sm">
                  <h4 className="text-xs font-bold text-green-700 mb-2">QUALIFICADOS</h4>
                  <CalcBox label="Total Qualificados" val={calc.qualificados} />
                </div>
                <div className="p-3 rounded-md bg-orange-50/50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900 shadow-sm">
                  <h4 className="text-xs font-bold text-orange-700 mb-2">CONTRATOS FECHADOS</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <NumInput control={form.control} name="fechado_direto" label="Fechado Direto" />
                    <NumInput control={form.control} name="fechado_fup" label="Fechado FUP" />
                    <NumInput control={form.control} name="fup_ativo" label="FUP Ativo" />
                    <CalcBox label="Total Fechados" val={calc.total_fechados} />
                  </div>
                </div>
                <div className="p-3 rounded-md bg-teal-50/50 dark:bg-teal-900/10 border border-teal-100 dark:border-teal-900 shadow-sm">
                  <h4 className="text-xs font-bold text-teal-700 mb-2 uppercase">
                    Fechamentos por Campanha (Banco de Dados)
                  </h4>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <CalcBox label="Direto Campanha" val={diretoCampanhaCount} />
                    <CalcBox label="FUP Campanha" val={fupCampanhaCount} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <CalcBox label="Aux. Acidente" val={auxAcidenteCount} />
                    <CalcBox label="DER" val={derCount} />
                    <CalcBox label="Ben. Análise" val={benAnaliseCount} />
                    <CalcBox label="Total Campanha" val={totalCampanhaCount} />
                  </div>
                </div>
                <div className="p-3 rounded-md bg-purple-50/50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900 shadow-sm">
                  <h4 className="text-xs font-bold text-purple-700 mb-2">INVESTIMENTO & OBS</h4>
                  <div className="grid grid-cols-1 gap-2">
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
