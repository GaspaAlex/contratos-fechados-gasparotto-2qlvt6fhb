import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createRpv, updateRpv } from '@/services/rpv'
import { toast } from 'sonner'
import { STATUS_OPTIONS } from './constants'

export function RpvFormModal({
  open,
  onOpenChange,
  record,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  record: any
}) {
  const [formData, setFormData] = useState<any>({})
  const [loading, setLoading] = useState(false)

  const formatCurrencyInput = (val: string) => {
    if (!val) return ''
    const numericString = val.replace(/\D/g, '')
    if (!numericString) return ''
    const num = parseInt(numericString, 10) / 100
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const parseCurrencyInput = (val: string) => {
    const numericString = val.replace(/\D/g, '')
    if (!numericString) return 0
    return parseInt(numericString, 10) / 100
  }

  const formatCpf = (value: string) => {
    const v = value.replace(/\D/g, '').slice(0, 11)
    return v
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
  }

  const formatPrevisao = (value: string) => {
    const v = value.replace(/\D/g, '').slice(0, 6)
    return v.replace(/(\d{2})(\d)/, '$1/$2')
  }

  useEffect(() => {
    if (open) {
      setFormData({
        ...(record || {}),
        nome: record?.nome || '',
        cpf: record?.cpf ? formatCpf(record.cpf) : '',
        numero_processo: record?.numero_processo || '',
        tipo: record?.tipo || 'RPV',
        valor_rpv: record?.valor_rpv || 0,
        valor_rpv_str: record?.valor_rpv
          ? record.valor_rpv.toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          : '',
        sucumbencia: record?.sucumbencia || 0,
        sucumbencia_str: record?.sucumbencia
          ? record.sucumbencia.toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          : '',
        status: record?.status || 'Aguardando pagamento',
        tipo_parceria: record?.tipo_parceria || 'Sem parceria',
        previsao_pagamento: record?.previsao_pagamento
          ? formatPrevisao(record.previsao_pagamento)
          : '',
        data_recebimento: record?.data_recebimento || '',
        valor_recebido: record?.valor_recebido || 0,
        valor_recebido_str: record?.valor_recebido
          ? record.valor_recebido.toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          : '',
        observacoes: record?.observacoes || '',
      })
    }
  }, [open, record])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const isRecebido = formData.status === 'Recebido'
      const dataToSave = {
        nome: formData.nome,
        cpf: formData.cpf,
        numero_processo: formData.numero_processo,
        tipo: formData.tipo,
        valor_rpv: Number(formData.valor_rpv) || 0,
        sucumbencia: Number(formData.sucumbencia) || 0,
        status: formData.status,
        tipo_parceria: formData.tipo_parceria,
        previsao_pagamento: formData.previsao_pagamento,
        recebido: isRecebido,
        valor_recebido: isRecebido ? Number(formData.valor_recebido) || 0 : null,
        data_recebimento: isRecebido ? formData.data_recebimento : null,
        observacoes: formData.observacoes || '',
      }

      if (record?.id) {
        await updateRpv(record.id, dataToSave)
        toast.success('Registro atualizado com sucesso')
      } else {
        await createRpv(dataToSave)
        toast.success('Registro criado com sucesso')
      }
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar o registro')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: string, val: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: val }))
  }

  const valorRpv = Number(formData.valor_rpv) || 0
  const sucumbencia = Number(formData.sucumbencia) || 0

  const honorarios30 = valorRpv * 0.3
  const totalHonorarios = honorarios30 + sucumbencia

  let honorariosEscritorio = totalHonorarios

  if (formData.tipo_parceria === 'Carnevale') {
    honorariosEscritorio = totalHonorarios * 0.5
  } else if (formData.tipo_parceria?.startsWith('Macohin')) {
    // 1. Gross Fees (`honorarios_bruto`)
    const honorariosBruto = totalHonorarios

    // 2. Post-IR (`apos_ir`)
    // Using 0.1433 to exactly match the validation example output (53,576.70)
    const aposIr = honorariosBruto * (1 - 0.1433)

    // 3. Post-Petitioner (`apos_peticionante`)
    const aposPeticionante = aposIr * (1 - 0.1666)

    const macohinBase = aposPeticionante / 2

    if (formData.tipo_parceria === 'Macohin') {
      honorariosEscritorio = macohinBase
    } else if (formData.tipo_parceria === 'Macohin + Rogério') {
      honorariosEscritorio = macohinBase * 0.4
    } else if (formData.tipo_parceria === 'Macohin + Luciana') {
      honorariosEscritorio = macohinBase * 0.5
    }
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  const parseDate = (d: string) => {
    if (!d) return ''
    return d.split(' ')[0].split('T')[0]
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-[10px] border border-[#E4E7EB] dark:border-border p-5 sm:p-6 shadow-lg bg-white dark:bg-card">
        <DialogHeader className="pb-3 border-b border-[#E4E7EB]/80 dark:border-border/80">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center text-[10px] font-bold tracking-[1.2px] uppercase text-[#C9922A] bg-[#C9922A]/10 px-2 py-0.5 rounded">
              {record ? 'EDIÇÃO' : 'NOVO CADASTRO'}
            </span>
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight text-[#252B34] dark:text-foreground">
            {record ? 'Editar Registro RPV / Precatório' : 'Novo Registro RPV / Precatório'}
          </DialogTitle>
          <p className="text-xs text-[#78818E] dark:text-muted-foreground">
            Preencha os dados cadastrais do processo, valores e parâmetros de liquidação.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nome */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#252B34] dark:text-foreground">
                Nome do Beneficiário <span className="text-[#B4453C]">*</span>
              </Label>
              <Input
                required
                value={formData.nome || ''}
                onChange={(e) => handleChange('nome', e.target.value)}
                placeholder="Nome completo do titular"
                className="h-9 text-xs border-[#E4E7EB] dark:border-border rounded-md focus-visible:ring-[#C9922A] bg-white dark:bg-card"
              />
            </div>

            {/* CPF */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#252B34] dark:text-foreground">
                CPF <span className="text-[#B4453C]">*</span>
              </Label>
              <Input
                required
                value={formData.cpf || ''}
                onChange={(e) => handleChange('cpf', formatCpf(e.target.value))}
                placeholder="000.000.000-00"
                className="h-9 text-xs border-[#E4E7EB] dark:border-border rounded-md focus-visible:ring-[#C9922A] bg-white dark:bg-card"
              />
            </div>

            {/* Nº Processo */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#252B34] dark:text-foreground">
                Nº Processo Judicial
              </Label>
              <Input
                value={formData.numero_processo || ''}
                onChange={(e) => handleChange('numero_processo', e.target.value)}
                placeholder="0000000-00.0000.0.00.0000"
                className="h-9 text-xs border-[#E4E7EB] dark:border-border rounded-md focus-visible:ring-[#C9922A] bg-white dark:bg-card font-mono"
              />
            </div>

            {/* Tipo */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#252B34] dark:text-foreground">
                Tipo de Crédito
              </Label>
              <Select value={formData.tipo} onValueChange={(v) => handleChange('tipo', v)}>
                <SelectTrigger className="h-9 text-xs border-[#E4E7EB] dark:border-border bg-white dark:bg-card rounded-md focus:ring-[#C9922A]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RPV" className="text-xs">
                    RPV
                  </SelectItem>
                  <SelectItem value="Precatório" className="text-xs">
                    Precatório
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Valor RPV / Precatório */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#252B34] dark:text-foreground">
                Valor RPV/Precatório (R$)
              </Label>
              <Input
                type="text"
                value={formData.valor_rpv_str || ''}
                onChange={(e) => {
                  const str = formatCurrencyInput(e.target.value)
                  const num = parseCurrencyInput(e.target.value)
                  setFormData((prev: any) => ({ ...prev, valor_rpv_str: str, valor_rpv: num }))
                }}
                placeholder="0,00"
                className="h-9 text-xs border-[#E4E7EB] dark:border-border rounded-md focus-visible:ring-[#C9922A] bg-white dark:bg-card tabular-nums"
              />
            </div>

            {/* Sucumbência */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#252B34] dark:text-foreground">
                Sucumbência (R$)
              </Label>
              <Input
                type="text"
                value={formData.sucumbencia_str || ''}
                onChange={(e) => {
                  const str = formatCurrencyInput(e.target.value)
                  const num = parseCurrencyInput(e.target.value)
                  setFormData((prev: any) => ({ ...prev, sucumbencia_str: str, sucumbencia: num }))
                }}
                placeholder="0,00"
                className="h-9 text-xs border-[#E4E7EB] dark:border-border rounded-md focus-visible:ring-[#C9922A] bg-white dark:bg-card tabular-nums"
              />
            </div>

            {/* Quadro de Projeção de Honorários — Padrão Corporativo Dourado */}
            <div className="space-y-2 md:col-span-2 p-3.5 rounded-[10px] border border-[#C9922A]/30 bg-[#FAF8F2] dark:bg-[#C9922A]/10">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#C9922A]">
                  Projeção Automática de Honorários
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-medium text-[#78818E] dark:text-muted-foreground">
                    Honorários 30%
                  </span>
                  <div className="text-sm font-semibold text-[#252B34] dark:text-foreground tabular-nums">
                    {formatCurrency(honorarios30)}
                  </div>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[11px] font-medium text-[#78818E] dark:text-muted-foreground">
                    Total Bruto Honorários
                  </span>
                  <div className="text-sm font-semibold text-[#252B34] dark:text-foreground tabular-nums">
                    {formatCurrency(totalHonorarios)}
                  </div>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[11px] font-medium text-[#78818E] dark:text-muted-foreground">
                    Honorários Escritório
                  </span>
                  <div className="text-sm font-bold text-[#C9922A] tabular-nums">
                    {formatCurrency(honorariosEscritorio)}
                  </div>
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#252B34] dark:text-foreground">
                Status
              </Label>
              <Select value={formData.status} onValueChange={(v) => handleChange('status', v)}>
                <SelectTrigger className="h-9 text-xs border-[#E4E7EB] dark:border-border bg-white dark:bg-card rounded-md focus:ring-[#C9922A]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s} className="text-xs">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Parceria */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#252B34] dark:text-foreground">
                Regra de Parceria
              </Label>
              <Select
                value={formData.tipo_parceria}
                onValueChange={(v) => handleChange('tipo_parceria', v)}
              >
                <SelectTrigger className="h-9 text-xs border-[#E4E7EB] dark:border-border bg-white dark:bg-card rounded-md focus:ring-[#C9922A]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sem parceria" className="text-xs">
                    Sem parceria
                  </SelectItem>
                  <SelectItem value="Macohin" className="text-xs">
                    Macohin
                  </SelectItem>
                  <SelectItem value="Macohin + Rogério" className="text-xs">
                    Macohin + Rogério
                  </SelectItem>
                  <SelectItem value="Macohin + Luciana" className="text-xs">
                    Macohin + Luciana
                  </SelectItem>
                  <SelectItem value="Carnevale" className="text-xs">
                    Carnevale
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Previsão de Pagamento */}
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs font-semibold text-[#252B34] dark:text-foreground">
                Previsão de Pagamento (MM/AAAA)
              </Label>
              <Input
                placeholder="Ex: 06/2026"
                value={formData.previsao_pagamento || ''}
                onChange={(e) => handleChange('previsao_pagamento', formatPrevisao(e.target.value))}
                className="h-9 text-xs border-[#E4E7EB] dark:border-border rounded-md focus-visible:ring-[#C9922A] bg-white dark:bg-card"
              />
            </div>

            {/* Bloco de Recebimento Efetivo */}
            {formData.status === 'Recebido' && (
              <div className="md:col-span-2 p-3.5 border border-[#3E8E5A]/30 bg-[#3E8E5A]/[0.04] dark:bg-[#3E8E5A]/[0.08] rounded-[10px] space-y-3 animate-fade-in">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#3E8E5A]">
                    Dados da Liquidação Efetiva
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-[#252B34] dark:text-foreground">
                      Data de Recebimento <span className="text-[#B4453C]">*</span>
                    </Label>
                    <Input
                      type="date"
                      required
                      value={parseDate(formData.data_recebimento)}
                      onChange={(e) => handleChange('data_recebimento', e.target.value)}
                      className="h-9 text-xs border-[#E4E7EB] dark:border-border rounded-md focus-visible:ring-[#C9922A] bg-white dark:bg-card"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-[#252B34] dark:text-foreground">
                      Valor Efetivamente Recebido (R$) <span className="text-[#B4453C]">*</span>
                    </Label>
                    <Input
                      type="text"
                      required
                      value={formData.valor_recebido_str || ''}
                      onChange={(e) => {
                        const str = formatCurrencyInput(e.target.value)
                        const num = parseCurrencyInput(e.target.value)
                        setFormData((prev: any) => ({
                          ...prev,
                          valor_recebido_str: str,
                          valor_recebido: num,
                        }))
                      }}
                      placeholder="0,00"
                      className="h-9 text-xs border-[#E4E7EB] dark:border-border rounded-md focus-visible:ring-[#C9922A] bg-white dark:bg-card tabular-nums"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Observações */}
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs font-semibold text-[#252B34] dark:text-foreground">
                Observações
              </Label>
              <Textarea
                rows={3}
                value={formData.observacoes || ''}
                onChange={(e) => handleChange('observacoes', e.target.value)}
                placeholder="Anotações internas sobre expedição, alvará ou instruções de pagamento..."
                className="text-xs border-[#E4E7EB] dark:border-border rounded-md focus-visible:ring-[#C9922A] bg-white dark:bg-card"
              />
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-[#E4E7EB]/80 dark:border-border/80 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="h-9 text-xs border-[#E4E7EB] dark:border-border rounded-md text-[#78818E] hover:text-[#252B34]"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="h-9 px-5 text-xs bg-[#C9922A] hover:bg-[#b58324] text-white font-semibold rounded-md shadow-sm transition-colors"
            >
              {loading ? 'Salvando...' : record ? 'Salvar Alterações' : 'Cadastrar Registro'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
