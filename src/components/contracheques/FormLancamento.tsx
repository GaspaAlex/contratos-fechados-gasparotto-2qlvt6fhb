/**
 * COMPONENTE — FORMULÁRIO DE LANÇAMENTO MANUAL (Build C2-A)
 * ========================================================================
 * Usado tanto para ADICIONAR quanto para EDITAR um lançamento do
 * contracheque mensal — garante que a edição tenha EXATAMENTE UM formulário.
 *
 * • Valor: máscara monetária em CENTAVOS (dígito a dígito, sem vírgula
 *   digitada). Internamente o campo guarda só DÍGITOS; a exibição formata
 *   "37449" → "R$ 374,49". O valor gravado é sempre em centavos inteiros —
 *   nunca reinterpreta um valor já salvo (abrir edição mostra o valor real
 *   formatado, ex.: "R$ 37.449,00").
 * • Natureza: as opções existentes + "Natureza personalizada", que abre um
 *   campo de texto livre (ex.: DSR, INSS, Desconto iPhone, Empréstimo
 *   salarial ou qualquer outra rubrica). A distinção vencimento/desconto é
 *   preservada (o tipo é fixado por quem usa o componente).
 */
import { useEffect, useRef, useState } from 'react'
import { Plus, Save, X } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  centavosParaMascara,
  mascaraCentavos,
  mascaraParaCentavos,
  validarLancamento,
} from '@/lib/ccContracheque'

export const NATUREZA_CUSTOM = 'Natureza personalizada'

export interface FormLancamentoValores {
  natureza_tipo: 'vencimento' | 'desconto'
  natureza: string
  descricao: string
  /** Valor em CENTAVOS inteiros. */
  valorCentavos: number
}

interface Props {
  tipo: 'vencimento' | 'desconto'
  naturezas: string[]
  /** Valores iniciais (edição). Omitir = formulário de adição. */
  inicial?: FormLancamentoValores
  /** Rótulo curto para o tipo ('vencimento' | 'desconto'), ex. "Desconto". */
  rotuloTipo: string
  onConfirmar: (valores: FormLancamentoValores) => void
  onCancelar: () => void
}

export default function FormLancamento({
  tipo,
  naturezas,
  inicial,
  rotuloTipo,
  onConfirmar,
  onCancelar,
}: Props) {
  const [natureza, setNatureza] = useState('')
  const [naturezaCustom, setNaturezaCustom] = useState(false)
  const [descricao, setDescricao] = useState('')
  // O estado do campo é o TEXTO mascarado ("R$ 374,49"); os dígitos são a
  // fonte da verdade (máscara em centavos — ver ccContracheque.ts).
  const [valorTexto, setValorTexto] = useState('')

  const inputValorRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  // Estado inicial — preenchido UMA vez (edição começa do valor salvo real).
  useEffect(() => {
    if (inicial) {
      setNatureza(inicial.natureza)
      setNaturezaCustom(!!inicial.natureza && !naturezas.includes(inicial.natureza))
      setDescricao(inicial.descricao || '')
      setValorTexto(centavosParaMascara(inicial.valorCentavos))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Foco inicial no controle de valor (acessibilidade do formulário inline).
  useEffect(() => {
    inputValorRef.current?.focus()
  }, [])

  const centavos = mascaraParaCentavos(valorTexto)

  const confirmar = () => {
    const naturezaFinal = naturezaCustom ? natureza.trim() : natureza
    if (!naturezaFinal) {
      toast({
        title: 'Lançamento inválido',
        description: 'Informe a natureza do lançamento.',
        variant: 'destructive',
      })
      return
    }
    if (centavos === null || centavos <= 0) {
      toast({
        title: 'Lançamento inválido',
        description: 'Informe o valor do lançamento (maior que zero).',
        variant: 'destructive',
      })
      return
    }
    onConfirmar({
      natureza_tipo: tipo,
      natureza: naturezaFinal,
      descricao: descricao.trim(),
      valorCentavos: centavos,
    })
  }

  return (
    <form
      className="rounded-lg border p-3 space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        confirmar()
      }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-[170px_1fr_150px_auto] gap-2 items-end">
        <div className="space-y-1">
          <Label htmlFor="cc-form-tipo" className="text-xs">
            Tipo
          </Label>
          <Select value={tipo} disabled>
            <SelectTrigger id="cc-form-tipo">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="vencimento">Vencimento</SelectItem>
              <SelectItem value="desconto">Desconto</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="cc-form-natureza" className="text-xs">
            Natureza
          </Label>
          <Select
            value={naturezaCustom ? NATUREZA_CUSTOM : natureza || naturezas[0]}
            onValueChange={(v) => {
              if (v === NATUREZA_CUSTOM) {
                setNaturezaCustom(true)
                setNatureza('')
              } else {
                setNaturezaCustom(false)
                setNatureza(v)
              }
            }}
          >
            <SelectTrigger id="cc-form-natureza">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {naturezas.map((n) => (
                <SelectItem key={n} value={n}>
                  {n}
                </SelectItem>
              ))}
              <SelectItem value={NATUREZA_CUSTOM}>{NATUREZA_CUSTOM}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="cc-form-valor" className="text-xs">
            Valor
          </Label>
          <Input
            id="cc-form-valor"
            ref={inputValorRef}
            inputMode="numeric"
            placeholder="R$ 0,00"
            value={valorTexto}
            onChange={(e) => setValorTexto(mascaraCentavos(e.target.value))}
          />
        </div>
        <div className="flex gap-1">
          <Button type="submit" size="sm" className="h-9" aria-label="Confirmar lançamento">
            {inicial ? (
              <Save className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <Plus className="h-3.5 w-3.5" aria-hidden />
            )}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-9"
            onClick={onCancelar}
            aria-label="Cancelar"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </Button>
        </div>
      </div>
      {naturezaCustom && (
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_150px] gap-2">
          <div className="space-y-1">
            <Label htmlFor="cc-form-natureza-custom" className="text-xs">
              Nome da natureza personalizada ({rotuloTipo.toLowerCase()})
            </Label>
            <Input
              id="cc-form-natureza-custom"
              value={natureza}
              onChange={(e) => setNatureza(e.target.value)}
              maxLength={120}
              placeholder="Ex.: DSR, INSS, Desconto iPhone, Empréstimo salarial…"
            />
          </div>
        </div>
      )}
      <div className="space-y-1">
        <Label htmlFor="cc-form-desc" className="text-xs">
          Descrição (opcional)
        </Label>
        <Input
          id="cc-form-desc"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          maxLength={120}
          placeholder="Detalhe, se quiser"
        />
      </div>
    </form>
  )
}
