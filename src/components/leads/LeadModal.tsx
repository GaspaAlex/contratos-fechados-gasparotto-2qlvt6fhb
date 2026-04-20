import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
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
import { useToast } from '@/hooks/use-toast'
import { extractFieldErrors } from '@/lib/pocketbase/errors'

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
  particular: numSchema,
  em_qualif: numSchema,
  sem_qualidade: numSchema,
  aposentado: numSchema,
  contribuinte_carne: numSchema,
  outros: numSchema,
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

export function LeadModal({ open, onOpenChange, data, year, onSuccess }: any) {
  const { toast } = useToast()

  const defaultMonth = `${MONTHS[new Date().getMonth()]} ${year}`

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      mes: defaultMonth,
      dia: 1,
      google: 0,
      meta_ads: 0,
      particular: 0,
      em_qualif: 0,
      sem_qualidade: 0,
      aposentado: 0,
      contribuinte_carne: 0,
      outros: 0,
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
        form.reset({ ...data })
      } else {
        form.reset({
          mes: defaultMonth,
          dia: new Date().getDate(),
          google: 0,
          meta_ads: 0,
          particular: 0,
          em_qualif: 0,
          sem_qualidade: 0,
          aposentado: 0,
          contribuinte_carne: 0,
          outros: 0,
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
  const calc = calculateLeadRow(vals)
  const isEdit = !!data?.id

  const onSubmit = async (values: any) => {
    try {
      if (isEdit) await updateLeadDiario(data.id, values)
      else await createLeadDiario(values)
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
                    <NumInput control={form.control} name="meta_ads" label="Meta Ads" />
                    <NumInput control={form.control} name="particular" label="Particular" />
                    <CalcBox label="Total Leads" val={calc.total_leads} />
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
