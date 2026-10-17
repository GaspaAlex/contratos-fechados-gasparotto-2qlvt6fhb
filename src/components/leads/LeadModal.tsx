import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Plus, Trash2 } from 'lucide-react'
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
import pb from '@/lib/pocketbase/client'

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
          'h-7 text-xs text-center px-1 border-[#E4E7EB] dark:border-border bg-white dark:bg-card focus-visible:ring-[#C9922A] min-w-[36px] w-full rounded',
          readOnly &&
            'bg-[#F5F6F8] dark:bg-muted/40 cursor-not-allowed border-[#E4E7EB] dark:border-border text-[#252B34] dark:text-foreground font-semibold',
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
          <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground">
            {label}
          </FormLabel>
          <FormControl>
            <Input
              type="number"
              {...field}
              value={field.value ?? ''}
              onChange={(e) => {
                const val = e.target.value
                field.onChange(val === '' ? '' : Number(val))
              }}
              className={`h-8 text-sm border-[#E4E7EB] dark:border-border bg-white dark:bg-card focus-visible:ring-[#C9922A] rounded-md ${cl}`}
            />
          </FormControl>
        </FormItem>
      )
    }}
  />
)

const CalcBox = ({ label, val }: any) => (
  <div>
    <div className="text-[10px] font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground mb-1">
      {label}
    </div>
    <div className="h-8 rounded-md bg-[#F5F6F8] dark:bg-muted/30 flex items-center px-3 text-sm font-bold text-[#252B34] dark:text-foreground cursor-not-allowed border border-[#E4E7EB] dark:border-border tabular-nums">
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

  const [newSlotLabel, setNewSlotLabel] = useState('')
  const [isAddingSlot, setIsAddingSlot] = useState(false)

  const activeConfigs = (campaignConfigs || [])
    .filter((c: any) => c?.ativo)
    .sort((a: any, b: any) => (a?.ordem || 0) - (b?.ordem || 0))
  const inactiveConfigs = (campaignConfigs || [])
    .filter((c: any) => c && !c.ativo)
    .sort((a: any, b: any) => (a?.ordem || 0) - (b?.ordem || 0))

  const handleDeactivate = async (c: any) => {
    try {
      if (!c?.id) return
      await updateCampaignConfig(c.id, { ativo: false })
      onSuccess?.()
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
        onSuccess?.()
      } catch (e) {
        console.error(e)
      }
    }
  }

  const meta_c1 = Number(form.watch('meta_c1')) || 0
  const meta_c2 = Number(form.watch('meta_c2')) || 0
  const meta_c3 = Number(form.watch('meta_c3')) || 0
  const meta_c4 = Number(form.watch('meta_c4')) || 0
  const meta_c5 = Number(form.watch('meta_c5')) || 0
  const hasCampaignLeads = meta_c1 > 0 || meta_c2 > 0 || meta_c3 > 0 || meta_c4 > 0 || meta_c5 > 0

  const currentMetaAds = hasCampaignLeads
    ? meta_c1 + meta_c2 + meta_c3 + meta_c4 + meta_c5
    : Number(vals.meta_ads) || 0

  const em_qualif_sum =
    (Number(form.watch('qualif_c1')) || 0) +
    (Number(form.watch('qualif_c2')) || 0) +
    (Number(form.watch('qualif_c3')) || 0) +
    (Number(form.watch('qualif_c4')) || 0) +
    (Number(form.watch('qualif_c5')) || 0)

  const currentEmQualif = hasCampaignLeads ? em_qualif_sum : vals.em_qualif || 0
  const currentSemQualidade = vals.sem_qualidade || 0
  const currentAposentado = vals.aposentado || 0
  const currentCarne = vals.contribuinte_carne || 0
  const currentOutros = vals.outros || 0
  const currentSemInteresse = vals.sem_interesse || 0
  const currentEngano = vals.engano || 0

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

  useEffect(() => {
    if (open && vals.mes && vals.dia && campaignConfigs) {
      const fetchLeadsRegistro = async () => {
        try {
          const parts = (vals.mes || '').split(' ')
          const selectedMonth = parts[0] || ''
          const selectedYear = parts[1] || String(year || new Date().getFullYear())
          const monthIndex = MONTHS.indexOf(selectedMonth)
          if (monthIndex === -1) return

          const dateStr = `${selectedYear}-${String(monthIndex + 1).padStart(2, '0')}-${String(vals.dia).padStart(2, '0')}`
          const active = (campaignConfigs || []).filter((c: any) => c?.ativo)

          const registrosDoDia = await pb.collection('leads_registro').getFullList({
            filter: `data ~ "${dateStr}"`,
          })

          for (const c of active) {
            if (!c?.slug) continue
            const slot = c.slug.replace('meta_c', '')
            const metaName = `meta_c${slot}`
            const qualifName = `qualif_c${slot}`
            const targetRotulo = (c.rotulo || '').trim().toUpperCase()

            let qualifCount = 0

            const registros = registrosDoDia.filter(
              (r) => (r.campanha || '').trim().toUpperCase() === targetRotulo,
            )

            const metaCount = registros.length

            registros.forEach((lr) => {
              const classif = lr.classificacao || ''
              if (classif === '' || classif === 'Qualificando') {
                qualifCount++
              }
            })

            form.setValue(metaName as any, metaCount, { shouldDirty: true })
            form.setValue(qualifName as any, qualifCount, { shouldDirty: true })
          }
        } catch (err) {
          console.error(err)
        }
      }
      fetchLeadsRegistro()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, vals.mes, vals.dia, campaignConfigs])

  const [contratosCampanha, setContratosCampanha] = useState<any[]>([])

  useEffect(() => {
    if (open && vals.mes) {
      const fetchContratos = async () => {
        try {
          const data = await getContratos()
          const parts = (vals.mes || '').split(' ')
          const selectedMonth = parts[0] || ''
          const selectedYear = parts[1] || String(year || new Date().getFullYear())
          const filtered = (data || []).filter((c) => {
            if (c.origem !== 'Campanha') return false
            if (!c.dcontrato) return false
            const date = new Date(c.dcontrato)
            if (isNaN(date.getTime())) return false
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
  }, [open, vals.mes, year])

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
      onSuccess?.()
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
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto rounded-[10px] border border-[#E4E7EB] dark:border-border p-6 shadow-xl bg-white dark:bg-card">
        <DialogHeader className="pb-3 border-b border-[#E4E7EB] dark:border-border">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold tracking-[1.5px] uppercase text-[#C9922A] bg-[#C9922A]/10 px-2 py-0.5 rounded">
              REGISTRO DIÁRIO DE LEADS
            </span>
          </div>
          <DialogTitle className="text-xl font-bold text-[#252B34] dark:text-foreground">
            {isEdit ? `Editar: Dia ${vals.dia} — ${vals.mes}` : 'Registrar Dia'}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-2">
            <div className="grid grid-cols-2 gap-4 pb-4 border-b border-[#E4E7EB] dark:border-border">
              <FormField
                control={form.control}
                name="mes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground">
                      Mês/Ano
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-9 border-[#E4E7EB] dark:border-border bg-white dark:bg-card focus:ring-[#C9922A] rounded-md text-xs">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {MONTHS.map((m) => (
                          <SelectItem
                            key={`${m} ${year}`}
                            value={`${m} ${year}`}
                            className="text-xs"
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
                    <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground">
                      Dia do Mês
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => {
                          const val = e.target.value
                          field.onChange(val === '' ? '' : Number(val))
                        }}
                        className="h-9 border-[#E4E7EB] dark:border-border bg-white dark:bg-card focus-visible:ring-[#C9922A] rounded-md text-xs"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-6">
              {/* TOP SECTION */}
              <div className="p-4 rounded-[10px] bg-[#F5F6F8] dark:bg-card border border-[#E4E7EB] dark:border-border shadow-xs">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] font-bold tracking-[1.5px] uppercase text-[#4A7FA5]">
                    ENTRADA DE LEADS
                  </span>
                </div>
                <div className="flex items-center gap-6 mb-4">
                  <div className="w-56">
                    <NumInput control={form.control} name="google" label="Google Ads (DER)" />
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-white dark:bg-muted/30 border border-[#E4E7EB] dark:border-border space-y-2">
                  <h5 className="text-[10px] font-bold text-[#252B34] dark:text-foreground uppercase tracking-wider mb-2">
                    Leads por Campanha
                  </h5>
                  <div className="w-full border border-[#E4E7EB] dark:border-border rounded-md shadow-xs overflow-hidden">
                    <table className="w-full text-xs text-left bg-white dark:bg-card table-fixed">
                      <thead className="bg-[#F5F6F8] dark:bg-muted/40 text-[10px] font-bold text-[#78818E] dark:text-muted-foreground uppercase whitespace-nowrap">
                        <tr>
                          <th className="px-2 py-2 font-bold w-[45%] text-left">CAMPANHA</th>
                          <th className="px-1 py-2 font-bold text-center w-[25%]">LEADS</th>
                          <th className="px-1 py-2 font-bold text-center w-[25%]">EM QUALIF.</th>
                          <th className="px-2 py-2 w-[5%]"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E4E7EB] dark:divide-border">
                        {activeConfigs.map((c: any) => {
                          const slot = (c?.slug || '').replace('meta_c', '')
                          const metaName = `meta_c${slot}`
                          const qualifName = `qualif_c${slot}`
                          const rotuloUpper = (c?.rotulo || '').toUpperCase()

                          return (
                            <tr
                              key={c.id}
                              className="hover:bg-[#F5F6F8]/60 dark:hover:bg-muted/30 transition-colors"
                            >
                              <td
                                className="px-2 py-1.5 align-middle font-bold uppercase whitespace-nowrap text-[10px] text-[#252B34] dark:text-foreground truncate text-left"
                                title={c.rotulo}
                              >
                                {rotuloUpper} {rotuloUpper === 'DER' ? '(GOOGLE)' : ''}
                              </td>
                              <td className="px-1 py-1.5 align-middle">
                                <TableCellInput control={form.control} name={metaName} readOnly />
                              </td>
                              <td className="px-1 py-1.5 align-middle">
                                <TableCellInput control={form.control} name={qualifName} readOnly />
                              </td>
                              <td className="px-2 py-1.5 align-middle text-right">
                                <button
                                  type="button"
                                  onClick={() => handleDeactivate(c)}
                                  className="text-[#78818E] hover:text-[#B4453C] transition-colors p-1"
                                  title="Desativar campanha"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot className="bg-[#FAF8F2] dark:bg-[#C9922A]/10 border-t-2 border-[#C9922A]/30 dark:border-[#C9922A]/50">
                        <tr>
                          <td colSpan={3} className="px-3 py-2 text-right align-middle">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#C9922A] mr-2">
                              Total Leads (Google + Meta)
                            </span>
                            <span className="text-sm font-bold text-[#252B34] dark:text-foreground tabular-nums">
                              {calc.total_leads}
                            </span>
                          </td>
                          <td className="px-2 py-2"></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {inactiveConfigs.length > 0 && (
                    <div className="flex items-center gap-2 mt-3 pt-1">
                      {!isAddingSlot ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-[10px] px-2.5 border-[#E4E7EB] dark:border-border hover:bg-[#FAF8F2] dark:hover:bg-muted/40 text-[#78818E] hover:text-[#C9922A] rounded transition-colors"
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
                            className="h-7 text-[11px] w-40 border-[#E4E7EB] dark:border-border bg-white dark:bg-card focus-visible:ring-[#C9922A]"
                          />
                          <Button
                            type="button"
                            size="sm"
                            className="h-7 text-[10px] px-3 bg-[#C9922A] hover:bg-[#b58324] text-white rounded font-medium"
                            onClick={handleAddSlot}
                          >
                            Salvar
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-[10px] px-2 text-[#78818E] hover:text-[#252B34] rounded"
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
              </div>

              {/* MIDDLE SECTION */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-[10px] bg-white dark:bg-card border border-[#E4E7EB] dark:border-border shadow-xs flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] font-bold tracking-[1.5px] uppercase text-[#3E8E5A]">
                      QUALIFICAÇÃO
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <CalcBox label="Total Qualificados" val={calc.qualificados} />
                  </div>
                </div>

                <div className="p-4 rounded-[10px] bg-white dark:bg-card border border-[#E4E7EB] dark:border-border shadow-xs">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] font-bold tracking-[1.5px] uppercase text-[#2B9A8C]">
                      FECHAMENTOS (BANCO DE DADOS)
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <CalcBox label="Direto" val={diretoCampanhaCount} />
                    <CalcBox label="FUP" val={fupCampanhaCount} />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {activeConfigs.map((c: any) => {
                      const targetRotulo = (c.rotulo || '').trim().toUpperCase()
                      const count = contratosCampanha.filter((contrato) => {
                        const campOrigem = (contrato.campanha_origem || 'Aux. Acidente')
                          .trim()
                          .toUpperCase()
                        const beneficio = (contrato.beneficio || '').trim().toUpperCase()
                        return campOrigem === targetRotulo || beneficio === targetRotulo
                      }).length
                      return <CalcBox key={c.id} label={c.rotulo || 'Campanha'} val={count} />
                    })}
                  </div>
                </div>
              </div>

              {/* BOTTOM SECTION */}
              <div className="p-4 rounded-[10px] bg-white dark:bg-card border border-[#E4E7EB] dark:border-border shadow-xs">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] font-bold tracking-[1.5px] uppercase text-[#7C5CBF]">
                    INVESTIMENTO & OBSERVAÇÕES
                  </span>
                </div>
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
                        <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-[#78818E] dark:text-muted-foreground">
                          Observações
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="h-8 text-sm border-[#E4E7EB] dark:border-border bg-white dark:bg-card focus-visible:ring-[#C9922A] rounded-md"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            {/* BARRA DE INDICADORES RESULTANTES */}
            <div className="bg-[#FAF8F2] dark:bg-[#C9922A]/10 p-3.5 rounded-[10px] border border-[#E8DFCE] dark:border-[#C9922A]/20 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center shadow-xs">
              <div>
                <div className="text-[10px] font-bold text-[#78818E] dark:text-muted-foreground uppercase tracking-wider">
                  Conv. Geral %
                </div>
                <div className="text-base font-bold text-[#252B34] dark:text-foreground tabular-nums mt-0.5">
                  {fmtPct(calc.conv_geral)}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-[#78818E] dark:text-muted-foreground uppercase tracking-wider">
                  Conv. Qualif. %
                </div>
                <div className="text-base font-bold text-[#252B34] dark:text-foreground tabular-nums mt-0.5">
                  {fmtPct(calc.conv_qualif)}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-[#78818E] dark:text-muted-foreground uppercase tracking-wider">
                  Desqualificação
                </div>
                <div className="text-base font-bold text-[#B4453C] dark:text-red-400 tabular-nums mt-0.5">
                  {fmtPct(calc.desqual_pct)}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-[#78818E] dark:text-muted-foreground uppercase tracking-wider">
                  CAC
                </div>
                <div className="text-base font-bold text-[#C9922A] dark:text-[#D9A94A] tabular-nums mt-0.5">
                  {fmtMon(calc.cac)}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#E4E7EB] dark:border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 px-4 text-xs border-[#E4E7EB] dark:border-border hover:bg-[#FAF8F2] dark:hover:bg-muted/40 text-[#78818E] rounded-md transition-colors"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="h-9 px-4 text-xs font-semibold bg-[#C9922A] hover:bg-[#b58324] text-white rounded-md shadow-sm transition-colors"
              >
                Salvar Registro
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
