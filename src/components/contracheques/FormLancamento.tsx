/**
 * COMPONENTE — FORMULÁRIO DE LANÇAMENTO MANUAL (Build C2-A)
 * ========================================================================
 * Usado tanto para ADICIONAR quanto para EDITAR um lançamento do
 * contracheque mensal — garante que a edição tenha EXATAMENTE UM formulário.
 *
 * • Valor: máscara monetária em CENTAVOS (dígito a dígito, sem vírgula
 *   digitada). Internamente o campo guarda só DÍGITOS; a exibição formata
 *   "37449" → "374,49" (SEM o prefixo "R$ " dentro do campo — mesmo padrão
 *   do "Valor da Causa" do Protocolo). O valor gravado é sempre em centavos
 *   inteiros — nunca reinterpreta um valor já salvo (abrir edição mostra o
 *   valor real formatado, ex.: "37.449,00").
 * • Natureza: as opções existentes + "Natureza personalizada", que abre um
 *   campo de texto livre (ex.: DSR, INSS, Desconto iPhone, Empréstimo
 *   salarial ou qualquer outra rubrica). A distinção vencimento/desconto é
 *   preservada (o tipo é fixado por quem usa o componente).
 *   O select NUNCA exibe uma opção que não esteja no estado: ao adicionar o
 *   estado já nasce com a primeira opção; ao editar nasce com a natureza
 *   gravada. O texto da natureza personalizada vive em estado PRÓPRIO —
 *   alternar para "Natureza personalizada" não apaga o nome já informado.
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
import { digitosDeValor, mascaraParaCentavos, validarLancamento } from '@/lib/ccContracheque'

export const NATUREZA_CUSTOM = 'Natureza personalizada'

export interface FormLancamentoValores {
  natureza_tipo: 'vencimento' | 'desconto'
  natureza: string
  descricao: string
  /** Valor em CENTAVOS inteiros. */
  valorCentavos: number
}

/** Centavos → "1.234,56" (máscara do campo, SEM o símbolo "R$"). */
const centavosParaTexto = (centavos: number): string =>
  (centavos / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

/** Texto digitado → máscara sem símbolo ("37449" → "374,49"). */
const mascaraSemSimbolo = (texto: string): string => {
  const digitos = digitosDeValor(texto)
  if (!digitos) return ''
  return centavosParaTexto(parseInt(digitos, 10))
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
  // Adicionar: nasce com a PRIMEIRA opção da lista (o select nunca exibe algo
  // que não está no estado). Edição: o useEffect abaixo sobrepõe com a gravada.
  const [natureza, setNatureza] = useState(naturezas[0] ?? '')
  // Texto da natureza personalizada — estado SEPARADO do select.
  const [naturezaCustomTexto, setNaturezaCustomTexto] = useState('')
  const [naturezaCustom, setNaturezaCustom] = useState(false)
  const [descricao, setDescricao] = useState('')
  // O estado do campo é o TEXTO mascarado ("374,49"); os dígitos são a fonte
  // da verdade (máscara em centavos — ver ccContracheque.ts).
  const [valorTexto, setValorTexto] = useState('')

  const inputValorRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  // Estado inicial — preenchido UMA vez (edição começa do valor salvo real).
  useEffect(() => {
    if (inicial) {
      const naLista = naturezas.includes(inicial.natureza)
      setNatureza(naLista ? inicial.natureza : '')
      setNaturezaCustom(!naLista)
      setNaturezaCustomTexto(!naLista ? inicial.natureza : '')
      setDescricao(inicial.descricao || '')
      setValorTexto(centavosParaTexto(inicial.valorCentavos))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Foco inicial no controle de valor (acessibilidade do formulário inline).
  useEffect(() => {
    inputValorRef.current?.focus()
  }, [])

  const centavos = mascaraParaCentavos(valorTexto)

  const confirmar = () => {
    const naturezaFinal = naturezaCustom ? naturezaCustomTexto.trim() : natureza
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
            value={naturezaCustom ? NATUREZA_CUSTOM : natureza}
            onValueChange={(v) => {
              if (v === NATUREZA_CUSTOM) {
                // Alternar para "personalizada" PRESERVA o texto já digitado.
                setNaturezaCustom(true)
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
            placeholder="0,00"
            value={valorTexto}
            onChange={(e) => setValorTexto(mascaraSemSimbolo(e.target.value))}
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
              value={naturezaCustomTexto}
              onChange={(e) => setNaturezaCustomTexto(e.target.value)}
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
