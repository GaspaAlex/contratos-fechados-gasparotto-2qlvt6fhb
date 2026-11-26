import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import pb from '@/lib/pocketbase/client'
import { removeAccents } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createProtocolo, updateProtocolo, deleteProtocolo } from '@/services/protocolo'
import { TIPOS_CONTINUIDADE } from '@/components/protocolo/continuidade'
import { GitBranch } from 'lucide-react'

import {
  getTiposAcao,
  createTipoAcao,
  updateTipoAcao,
  deleteTipoAcao,
  getResponsaveis,
  createResponsavel,
  updateResponsavel,
  deleteResponsavel,
} from '@/services/contratos'
import { DynamicSelect } from '@/components/dashboard/DynamicSelect'
import { toast } from 'sonner'
import { usePrivacyMode } from '@/lib/privacyMode'

const baseSchema = z.object({
  nome: z.string().min(1, 'Obrigatório'),
  fone: z.string().optional(),
  tipo_acao: z.string().optional(),
  responsavel: z.string().optional(),
  status: z.string().min(1, 'Obrigatório'),
  dcontrato: z.string().optional(),
  dcalculo: z.string().optional(),
  dprotocolo: z.string().optional(),
  nautos: z.string().optional(),
  valor: z.coerce.number().optional(),
  decisao: z.string().default('Aguardando'),
  origem: z.string().optional(),
  parceiro: z.string().optional(),
  representante: z.boolean().default(false).optional(),
  representante_nome: z.string().optional(),
  representante_cpf: z.string().optional(),
  representante_vinculo: z.string().optional(),
  representante_telefone: z.string().optional(),
  observacoes: z.string().optional(),
  revisar_em: z.string().optional(),
  tipo_continuidade: z.string().optional(),
  justificativa_reabertura: z.string().optional(),
})

const schema = baseSchema.refine(
  (data) => {
    if (data.representante && (!data.representante_nome || data.representante_nome.trim() === '')) {
      return false
    }
    return true
  },
  {
    message: 'Obrigatório',
    path: ['representante_nome'],
  },
)

const applyCpfMask = (value: string) => {
  let v = value.replace(/\D/g, '')
  if (v.length > 11) v = v.substring(0, 11)
  if (v.length > 9) return v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  if (v.length > 6) return v.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3')
  if (v.length > 3) return v.replace(/(\d{3})(\d{1,3})/, '$1.$2')
  return v
}

const applyPhoneMask = (value: string) => {
  let v = value.replace(/\D/g, '')
  if (v.length > 11) v = v.slice(0, 11)
  let formatted = v
  if (v.length > 10) formatted = v.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3')
  else if (v.length > 5) formatted = v.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3')
  else if (v.length > 2) formatted = v.replace(/^(\d{2})(\d{0,5})/, '($1) $2')
  else if (v.length > 0) formatted = v.replace(/^(\d{0,2})/, '($1')
  return formatted
}

const formatCurrencyForInput = (num?: number) => {
  if (num === undefined || num === null) return ''
  let v = num.toFixed(2)
  v = v.replace('.', ',')
  v = v.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.')
  return v
}

export function ProtocoloDialog({
  open,
  onOpenChange,
  item,
  preselectId,
  prefill,
  tipos,
  responsaveis,
  onSaved,
  // Fluxo "Novo protocolo do mesmo caso" (v0.0.1124): a página passa o modo e
  // o protocolo original — o formulário herda o cadastro e a relation
  // `contratos`, e grava caso_origem/protocolo_anterior/tipo/justificativa.
  modoMesmoCaso,
  mesmoCasoOriginal,
}: any) {
  const { enabled: privacyOn } = usePrivacyMode()
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null)
  const [tiposAcao, setTiposAcao] = useState<any[]>(tipos || [])
  const [responsaveisList, setResponsaveisList] = useState<any[]>(responsaveis || [])
  // Registro vindo da ação "Abrir em Protocolo" (existente ou a criar).
  const [preselectedItem, setPreselectedItem] = useState<any>(null)
  // Relation `contratos` gravada junto com o registro: vazia no cadastro
  // manual, com o contrato de origem quando vem da ação "Abrir em Protocolo".
  const [contratoVinculado, setContratoVinculado] = useState<string[]>([])

  const loadTiposAcao = async () => {
    try {
      const res = await getTiposAcao()
      setTiposAcao(res.map((x: any) => ({ id: x.id, nome: x.nome, is_default: x.is_default })))
    } catch (e) {
      console.error(e)
    }
  }

  const loadResponsaveis = async () => {
    try {
      const res = await getResponsaveis()
      setResponsaveisList(res.map((x: any) => ({ id: x.id, nome: x.nome })))
    } catch (e) {
      console.error(e)
    }
  }

  // Resolves o registro existente indicado pela ação "Abrir em Protocolo"
  // (reabertura para edição) contra a lista já carregada — e reage se ele
  // chegar depois (realtime/loadData ainda em curso).
  useEffect(() => {
    if (!preselectId) {
      setPreselectedItem(null)
      return
    }
    if (item?.id === preselectId) {
      setPreselectedItem(item)
      return
    }
    if (open) {
      pb.collection('protocolo')
        .getOne(preselectId)
        .then((r) => setPreselectedItem(r))
        .catch((e) => {
          console.error(e)
          setPreselectedItem(null)
        })
    }
  }, [preselectId, item?.id, open])

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      nome: '',
      fone: '',
      tipo_acao: '',
      responsavel: '',
      status: 'Protocolado',
      dcontrato: '',
      dcalculo: '',
      dprotocolo: '',
      nautos: '',
      valor: undefined as unknown as number,
      decisao: 'Aguardando',
      origem: '',
      parceiro: '',
      representante: false,
      representante_nome: '',
      representante_cpf: '',
      representante_vinculo: '',
      representante_telefone: '',
      observacoes: '',
      revisar_em: '',
      tipo_continuidade: '',
      justificativa_reabertura: '',
    },
  })

  // Fluxo "Novo protocolo do mesmo caso" (v0.0.1124): herda do protocolo
  // original SOMENTE os dados cadastrais pertinentes e o vínculo com o
  // contrato (relation `contratos`). NÃO copia: nautos (nº do processo),
  // decisão, valor, observações, datas (dcontrato/dcalculo/dprotocolo/
  // revisar_em) nem representante. Status inicia "Prov. Inicial".
  useEffect(() => {
    if (!open || !modoMesmoCaso || !mesmoCasoOriginal || prefill) return
    setDuplicateWarning(null)
    loadTiposAcao()
    loadResponsaveis()
    form.reset({
      nome: mesmoCasoOriginal.nome || '',
      fone: mesmoCasoOriginal.fone || '',
      tipo_acao: mesmoCasoOriginal.tipo_acao || '',
      responsavel: mesmoCasoOriginal.responsavel || '',
      // Status inicial do novo protocolo do mesmo caso.
      status: 'Prov. Inicial',
      // Data do Contrato herdada do original (mesmo contrato); demais datas vazias.
      dcontrato: mesmoCasoOriginal.dcontrato
        ? String(mesmoCasoOriginal.dcontrato).substring(0, 10)
        : '',
      dcalculo: '',
      dprotocolo: '',
      revisar_em: '',
      nautos: '',
      valor: undefined as unknown as number,
      decisao: 'Aguardando',
      origem: mesmoCasoOriginal.origem || '',
      parceiro: mesmoCasoOriginal.parceiro || '',
      representante: false,
      representante_nome: '',
      representante_cpf: '',
      representante_vinculo: '',
      representante_telefone: '',
      observacoes: '',
      tipo_continuidade: '',
      justificativa_reabertura: '',
    })
    // Vínculo com o contrato original herdado (relation `contratos`).
    setContratoVinculado(
      Array.isArray(mesmoCasoOriginal.contratos) ? mesmoCasoOriginal.contratos : [],
    )
  }, [open, modoMesmoCaso, mesmoCasoOriginal, prefill, form])

  // Prefill da ação "Abrir em Protocolo" (contrato sem protocolo vinculado):
  // resolve o tipo de ação por nome (beneficio do contrato, mesma equivalência
  // do hook de vínculo) e nasce com a relation `contratos=[contratoId]`.
  // Nada é gravado aqui — só quando o usuário confirma o formulário.
  useEffect(() => {
    if (!open || !prefill) return
    let cancelled = false
    ;(async () => {
      // O effect de preenchimento padrão não roda com prefill — carrega aqui
      // as listas dos selects (tipos/responsáveis) do dialog.
      loadTiposAcao()
      loadResponsaveis()
      let tipoId = ''
      try {
        const tiposRes = await getTiposAcao()
        const match = tiposRes.find(
          (t: any) =>
            removeAccents((t.nome || '').toLowerCase()) ===
            removeAccents((prefill.tipo_acao_nome || '').toLowerCase()),
        )
        if (!cancelled && match) tipoId = match.id
      } catch (e) {
        console.error(e)
      }
      if (cancelled) return
      // Datas já chegam em YMD (AAAA-MM-DD), prontas para os inputs type=date;
      // ausentes chegam em branco. Responsável nasce em branco (escolha no
      // agendamento) e origem vem mapeada do contrato (ou em branco p/ manual).
      form.reset({
        nome: prefill.nome || '',
        fone: prefill.fone || '',
        tipo_acao: tipoId,
        responsavel: '',
        status: prefill.status || 'Prov. Inicial',
        dcontrato: String(prefill.dcontrato || '')
          .split('T')[0]
          .split(' ')[0],
        dcalculo: String(prefill.dcalculo || '')
          .split('T')[0]
          .split(' ')[0],
        dprotocolo: String(prefill.dprotocolo || '')
          .split('T')[0]
          .split(' ')[0],
        nautos: '',
        valor: undefined as unknown as number,
        decisao: 'Aguardando',
        origem: prefill.origem || '',
        parceiro: '',
        representante: false,
        representante_nome: '',
        representante_cpf: '',
        representante_vinculo: '',
        representante_telefone: '',
        observacoes: '',
        revisar_em: '',
      })
      setContratoVinculado([prefill.contratoId])
    })()
    return () => {
      cancelled = true
    }
  }, [open, prefill, form])

  // Preenche o formulário quando o dialog abre. Este effect NÃO roda quando há
  // prefill da ação "Abrir em Protocolo" — nesse caso quem preenche é o effect
  // de prefill acima (contratos=[contratoId] no save, nautos/valor/dcontrato em
  // branco); preencher aqui também zeraria o prefill (ordem de effects).
  // Também NÃO roda no modo "Novo protocolo do mesmo caso" — quem preenche é o
  // effect de continuidade acima; resetar aqui apagaria os dados herdados do
  // protocolo original (corrige v0.0.1125).
  useEffect(() => {
    if (open && !privacyOn && !prefill && !modoMesmoCaso) {
      setDuplicateWarning(null)
      loadTiposAcao()
      loadResponsaveis()
      const registro = item || preselectedItem
      if (registro) {
        // Editando registro existente (tabela ou reabertura via "Abrir em
        // Protocolo" — preselectId). Preserva a relation `contratos` atual.
        const { prazo: _prazo, ...restItem } = registro
        form.reset({
          ...restItem,
          valor: registro.valor === 0 ? undefined : registro.valor,
          dcontrato: registro.dcontrato ? registro.dcontrato.substring(0, 10) : '',
          dcalculo: registro.dcalculo ? registro.dcalculo.substring(0, 10) : '',
          dprotocolo: registro.dprotocolo ? registro.dprotocolo.substring(0, 10) : '',
          revisar_em: registro.revisar_em ? registro.revisar_em.substring(0, 10) : '',
          origem: registro.origem || '',
          parceiro: registro.parceiro || '',
          representante: registro.representante || false,
          representante_nome: registro.representante_nome || '',
          representante_cpf: registro.representante_cpf || '',
          representante_vinculo: registro.representante_vinculo || '',
          representante_telefone: registro.representante_telefone || '',
          observacoes: registro.observacoes || '',
        })
        setContratoVinculado(Array.isArray(registro.contratos) ? registro.contratos : [])
      } else {
        // Sem item e sem prefill: cadastro manual — relation `contratos` vazia
        // (o hook de anti-duplicidade não afeta cadastros manuais).
        form.reset({
          nome: '',
          fone: '',
          tipo_acao: '',
          responsavel: '',
          status: 'Protocolado',
          dcontrato: '',
          dcalculo: '',
          dprotocolo: '',
          revisar_em: '',
          nautos: '',
          valor: undefined as unknown as number,
          decisao: 'Aguardando',
          origem: '',
          parceiro: '',
          representante: false,
          representante_nome: '',
          representante_cpf: '',
          representante_vinculo: '',
          representante_telefone: '',
          observacoes: '',
        })
        setContratoVinculado([])
      }
    }
  }, [open, item, preselectedItem, form, modoMesmoCaso, mesmoCasoOriginal])

  const handleAddTipoAcao = async (nome: string) => {
    try {
      const newRecord = await createTipoAcao({ nome })
      await loadTiposAcao()
      form.setValue('tipo_acao', newRecord.id)
    } catch (e) {
      toast.error('Erro ao adicionar')
    }
  }

  const handleEditTipoAcao = async (id: string, oldName: string, newName: string) => {
    try {
      await updateTipoAcao(id, { nome: newName })
      await loadTiposAcao()
    } catch (e) {
      toast.error('Erro ao editar')
    }
  }

  const handleDelTipoAcao = async (id: string, nome: string) => {
    try {
      if (!window.confirm(`Excluir o tipo de ação '${nome}'? Esta ação não pode ser desfeita.`))
        return
      await deleteTipoAcao(id)

      const linkedProtocolos = await pb.collection('protocolo').getFullList({
        filter: pb.filter('tipo_acao = {:id}', { id }),
      })
      for (const p of linkedProtocolos) {
        await pb.collection('protocolo').update(p.id, { tipo_acao: '' })
      }

      await loadTiposAcao()
      if (form.getValues('tipo_acao') === id) {
        form.setValue('tipo_acao', '')
      }
    } catch (e) {
      toast.error('Erro ao deletar')
    }
  }

  const handleAddResp = async (nome: string) => {
    try {
      const newRecord = await createResponsavel({ nome })
      await loadResponsaveis()
      form.setValue('responsavel', newRecord.id)
    } catch (e) {
      toast.error('Erro ao adicionar')
    }
  }

  const handleEditResp = async (id: string, oldName: string, newName: string) => {
    try {
      await updateResponsavel(id, { nome: newName })

      const linked = await pb.collection('contratos_fechados').getFullList({
        filter: pb.filter('responsavel = {:oldName}', { oldName }),
      })
      for (const c of linked) {
        await pb.collection('contratos_fechados').update(c.id, { responsavel: newName })
      }

      await loadResponsaveis()
    } catch (e) {
      toast.error('Erro ao editar')
    }
  }

  const handleDelResp = async (id: string, nome: string) => {
    try {
      if (
        !window.confirm(`Deseja excluir o responsável '${nome}'? Esta ação não pode ser desfeita.`)
      )
        return

      await deleteResponsavel(id)

      const linkedProtocolos = await pb.collection('protocolo').getFullList({
        filter: pb.filter('responsavel = {:id}', { id }),
      })
      for (const p of linkedProtocolos) {
        await pb.collection('protocolo').update(p.id, { responsavel: '' })
      }

      const linkedContratos = await pb.collection('contratos_fechados').getFullList({
        filter: pb.filter('responsavel = {:nome}', { nome }),
      })
      for (const c of linkedContratos) {
        await pb.collection('contratos_fechados').update(c.id, { responsavel: '' })
      }

      await loadResponsaveis()
      if (form.getValues('responsavel') === id) {
        form.setValue('responsavel', '')
      }
    } catch (e) {
      toast.error('Erro ao deletar')
    }
  }

  const handleSave = async (values: any, forceSave = false) => {
    if (forceSave !== true) {
      if (privacyOn) {
        toast.error('Desative o Modo de Privacidade para editar registros.')
        return
      }
      // Fluxo "Novo protocolo do mesmo caso": justificativa OBRIGATÓRIA
      // (espelha a validação do hook servidor PROTOCOLO_MESMO_CASO_JUSTIFICATIVA).
      if (modoMesmoCaso) {
        const just = String(values.justificativa_reabertura || '').trim()
        if (!just) {
          toast.error('Informe a justificativa para o novo protocolo do mesmo caso.')
          return
        }
        if (just.length > 2000) {
          toast.error('A justificativa deve ter no máximo 2000 caracteres.')
          return
        }
        const tipo = String(values.tipo_continuidade || '').trim()
        if (!tipo) {
          toast.error('Informe o tipo de continuidade do novo protocolo.')
          return
        }
      }
      // No modo continuidade o aviso de nome duplicado é pulado (o hook
      // servidor permite via exceção de caso_origem) — mas o fluxo segue
      // normalmente até o createProtocolo (corrige v0.0.1125).
      if (!modoMesmoCaso) {
        try {
          const normalizedInput = removeAccents(values['nome'].toLowerCase().trim())
          const existing = await pb.collection('protocolo').getFullList({ fields: 'id,nome' })

          const duplicate = existing.find((c: any) => {
            if (item && c['id'] === item['id']) return false
            const normalizedExisting = removeAccents(c['nome'].toLowerCase().trim())
            return normalizedExisting === normalizedInput
          })

          if (duplicate) {
            setDuplicateWarning(duplicate['nome'])
            return
          }
        } catch (err) {
          console.error(err)
        }
      }
    }

    try {
      const payload = { ...values }
      // Relation `contratos`: vazia no cadastro manual; com o contrato de
      // origem quando o registro vem da ação "Abrir em Protocolo" (prefill).
      payload.contratos = contratoVinculado
      if (payload.dcontrato)
        payload.dcontrato = new Date(payload.dcontrato + 'T12:00:00Z').toISOString()
      else payload.dcontrato = null
      if (payload.dcalculo)
        payload.dcalculo = new Date(payload.dcalculo + 'T12:00:00Z').toISOString()
      else payload.dcalculo = null
      if (payload.dprotocolo)
        payload.dprotocolo = new Date(payload.dprotocolo + 'T12:00:00Z').toISOString()
      else payload.dprotocolo = null
      if (payload.revisar_em)
        payload.revisar_em = new Date(payload.revisar_em + 'T12:00:00Z').toISOString()
      else payload.revisar_em = null

      if (!payload.representante) {
        payload.representante_nome = ''
        payload.representante_cpf = ''
        payload.representante_vinculo = ''
        payload.representante_telefone = ''
      }

      // Fluxo "Novo protocolo do mesmo caso" (v0.0.1124): grava o vínculo de
      // continuidade — caso_origem (raiz da cadeia), protocolo_anterior
      // (registro imediatamente anterior) e a classificação/justificativa.
      // No cadastro convencional os campos vão vazios (nunca herdam sujeira).
      if (modoMesmoCaso && mesmoCasoOriginal) {
        payload.caso_origem = mesmoCasoOriginal.id
        payload.protocolo_anterior = mesmoCasoOriginal.id
        payload.tipo_continuidade = String(values.tipo_continuidade || '')
        payload.justificativa_reabertura = String(values.justificativa_reabertura || '')
      } else {
        payload.caso_origem = null
        payload.protocolo_anterior = null
        payload.tipo_continuidade = ''
        payload.justificativa_reabertura = ''
      }

      const registroAtual = item || preselectedItem
      if (registroAtual) await updateProtocolo(registroAtual.id, payload)
      else await createProtocolo(payload)

      toast.success(registroAtual ? 'Protocolo atualizado' : 'Protocolo criado')
      onOpenChange(false)
      onSaved()
    } catch (e: any) {
      // Recusa do hook servidor de anti-duplicidade (PROTOCOLO_DUPLICADO):
      // outro usuário já salvou um protocolo para este contrato. Reconsulta
      // e abre o registro já existente para edição.
      const msg = e?.response?.message || e?.message || ''
      if (String(msg).includes('PROTOCOLO_DUPLICADO')) {
        const contratoId = contratoVinculado[0]
        toast.info(
          'Outro usuário já salvou um protocolo para este contrato — abrindo o registro existente.',
        )
        try {
          const res = await pb.collection('protocolo').getFullList({
            filter: pb.filter('contratos = {:id}', { id: contratoId }),
            sort: '-created',
          })
          if (res.length > 0) {
            const reg = res[0]
            form.reset({
              ...reg,
              valor: reg.valor === 0 ? undefined : reg.valor,
              dcontrato: reg.dcontrato ? reg.dcontrato.substring(0, 10) : '',
              dcalculo: reg.dcalculo ? reg.dcalculo.substring(0, 10) : '',
              dprotocolo: reg.dprotocolo ? reg.dprotocolo.substring(0, 10) : '',
              revisar_em: reg.revisar_em ? reg.revisar_em.substring(0, 10) : '',
              origem: reg.origem || '',
              parceiro: reg.parceiro || '',
              representante: reg.representante || false,
              representante_nome: reg.representante_nome || '',
              representante_cpf: reg.representante_cpf || '',
              representante_vinculo: reg.representante_vinculo || '',
              representante_telefone: reg.representante_telefone || '',
              observacoes: reg.observacoes || '',
            })
            setPreselectedItem(reg)
            setContratoVinculado(Array.isArray(reg.contratos) ? reg.contratos : [])
          }
        } catch (err) {
          console.error(err)
        }
        return
      }
      toast.error('Erro ao salvar')
    }
  }

  const onSubmit = (values: any) => handleSave(values, false)

  const registroAtual = item || preselectedItem
  const registroAtualLabel = registroAtual ? `Editar: ${registroAtual.nome}` : 'novo'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl overflow-y-auto max-h-[90vh] rounded-[10px] border border-[#E4E7EB] dark:border-border p-6">
        <DialogHeader className="border-b border-[#E4E7EB] dark:border-border pb-3">
          <div className="flex items-center gap-2">
            {modoMesmoCaso && mesmoCasoOriginal ? (
              <span className="inline-flex items-center text-[10px] font-bold tracking-[1.2px] uppercase text-[#4A7FA5] bg-[#4A7FA5]/10 px-2 py-0.5 rounded">
                NOVO PROTOCOLO DO MESMO CASO
              </span>
            ) : (
              <span className="inline-flex items-center text-[10px] font-bold tracking-[1.2px] uppercase text-[#C9922A] bg-[#C9922A]/10 px-2 py-0.5 rounded">
                {registroAtual ? 'EDIÇÃO' : 'NOVO REGISTRO'}
              </span>
            )}
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight text-[#252B34] dark:text-foreground">
            {registroAtual
              ? `Editar: ${registroAtual.nome}`
              : modoMesmoCaso && mesmoCasoOriginal
                ? `Novo protocolo do mesmo caso: ${mesmoCasoOriginal.nome}`
                : prefill
                  ? 'Adicionar ao Protocolo (vínculo com contrato)'
                  : 'Adicionar ao Protocolo'}
          </DialogTitle>
          <DialogDescription className="text-xs text-[#78818E] dark:text-muted-foreground">
            {modoMesmoCaso && mesmoCasoOriginal
              ? `Continuação do protocolo${mesmoCasoOriginal.nautos ? ` nº ${mesmoCasoOriginal.nautos}` : ''} — cadastro herdado; informe o processo, a continuidade e as novas datas.`
              : 'Preencha e confirme os dados processuais do protocolo.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {modoMesmoCaso && mesmoCasoOriginal && (
              <div className="rounded-lg border border-[#4A7FA5]/25 bg-[#4A7FA5]/5 p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-[#4A7FA5]" />
                  <h4 className="text-sm font-semibold text-[#4A7FA5] dark:text-sky-400">
                    Continuação do mesmo caso
                  </h4>
                </div>
                <p className="text-xs text-[#78818E] dark:text-muted-foreground">
                  Vínculo com o protocolo original
                  {mesmoCasoOriginal.nautos ? ` (nº ${mesmoCasoOriginal.nautos})` : ''} — o cadastro
                  e o contrato foram herdados. Nº do processo, decisão, valor e datas iniciam em
                  branco.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="tipo_continuidade"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Tipo de continuidade <span className="text-[#B4453C]">*</span>
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o tipo de continuidade..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {TIPOS_CONTINUIDADE.map((t) => (
                              <SelectItem key={t} value={t}>
                                {t}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="justificativa_reabertura"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Justificativa <span className="text-[#B4453C]">*</span>
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            rows={2}
                            placeholder="Explique por que este caso precisa de um novo protocolo..."
                            className="focus-visible:ring-[#C9922A]"
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem className="lg:col-span-2">
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="(00) 00000-0000"
                        onChange={(e) => field.onChange(applyPhoneMask(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tipo_acao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Ação</FormLabel>
                    <DynamicSelect
                      value={field.value || ''}
                      onChange={field.onChange}
                      items={tiposAcao}
                      onAdd={handleAddTipoAcao}
                      onEdit={handleEditTipoAcao}
                      onDelete={handleDelTipoAcao}
                      placeholder="Selecione..."
                      valueKey="id"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="responsavel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Responsável</FormLabel>
                    <DynamicSelect
                      value={field.value || ''}
                      onChange={field.onChange}
                      items={responsaveisList}
                      onAdd={handleAddResp}
                      onEdit={handleEditResp}
                      onDelete={handleDelResp}
                      placeholder="Selecione..."
                      valueKey="id"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Calculado">Calculado</SelectItem>
                        <SelectItem value="Protocolado Judicial">Protocolado Judicial</SelectItem>
                        <SelectItem value="Protocolado Administrativo">
                          Protocolado Administrativo
                        </SelectItem>
                        <SelectItem value="Requerimento Adm.">Requerimento Adm.</SelectItem>
                        <SelectItem value="Prov. Inicial">Prov. Inicial</SelectItem>
                        <SelectItem value="R. Docs">Faltando Documentos</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="origem"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Origem</FormLabel>
                    <Select
                      onValueChange={(val) => field.onChange(val || '')}
                      value={field.value || ''}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a origem..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Campanha Meta">Campanha Meta</SelectItem>
                        <SelectItem value="Campanha Google">Campanha Google</SelectItem>
                        <SelectItem value="Canal YouTube">Canal YouTube</SelectItem>
                        <SelectItem value="Macohin">Macohin</SelectItem>
                        <SelectItem value="Particular">Particular</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="parceiro"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parceiro</FormLabel>
                    <Select
                      onValueChange={(val) => field.onChange(val === 'none' ? '' : val)}
                      value={field.value || 'none'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        <SelectItem value="Previdenciarista">Previdenciarista</SelectItem>
                        <SelectItem value="Carnevale">Carnevale</SelectItem>
                        <SelectItem value="Macohin">Macohin</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dcontrato"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data do Contrato</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dcalculo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data do Cálculo</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dprotocolo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data do Protocolo</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nautos"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nº do Processo</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="0000000-00.0000.0.00.0000" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="valor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor da Causa</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="0,00"
                        value={
                          field.value !== undefined && field.value !== null
                            ? formatCurrencyForInput(Number(field.value))
                            : ''
                        }
                        onChange={(e) => {
                          const v = e.target.value.replace(/\D/g, '')
                          if (v === '') {
                            field.onChange(undefined)
                          } else {
                            const numericValue = parseInt(v, 10) / 100
                            field.onChange(numericValue)
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="decisao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Decisão</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Aguardando">— Aguardando —</SelectItem>
                        <SelectItem value="Procedente">Procedente</SelectItem>
                        <SelectItem value="Improcedente">Improcedente</SelectItem>
                        <SelectItem value="Extinto sem resolução do mérito">
                          Extinto sem resolução do mérito
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="revisar_em"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Revisar em</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="col-span-1 sm:col-span-2 lg:col-span-3 space-y-2">
                <FormField
                  control={form.control}
                  name="observacoes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={3}
                          placeholder="Observações sobre o processo ou documentos pendentes..."
                          className="focus-visible:ring-[#C9922A]"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="col-span-1 sm:col-span-2 lg:col-span-3 space-y-4 mt-2">
                <FormField
                  control={form.control}
                  name="representante"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="data-[state=checked]:bg-[#C9922A] data-[state=checked]:border-[#C9922A]"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Representante Legal</FormLabel>
                        <DialogDescription>
                          Marque se este caso envolve um tutor, curador ou representante legal.
                        </DialogDescription>
                      </div>
                    </FormItem>
                  )}
                />

                {form.watch('representante') && (
                  <div className="animate-in fade-in slide-in-from-top-4 duration-300 rounded-lg border border-[#C9922A]/20 bg-[#C9922A]/5 p-4 space-y-4">
                    <h4 className="font-medium text-[#C9922A] text-sm">Dados do Representante</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="representante_nome"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome do Representante</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="representante_cpf"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CPF do Representante</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="000.000.000-00"
                                onChange={(e) => field.onChange(applyCpfMask(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="representante_vinculo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Parentesco/Vínculo</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Pai/Mãe">Pai/Mãe</SelectItem>
                                <SelectItem value="Tutor(a)">Tutor(a)</SelectItem>
                                <SelectItem value="Curador(a)">Curador(a)</SelectItem>
                                <SelectItem value="Cônjuge">Cônjuge</SelectItem>
                                <SelectItem value="Outro">Outro</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="representante_telefone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Telefone do Representante</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="(00) 00000-0000"
                                onChange={(e) => field.onChange(applyPhoneMask(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {duplicateWarning && (
              <div className="rounded-[8px] bg-[#C77E1E]/10 border border-[#C77E1E]/30 p-4 mt-4 text-xs text-[#252B34] dark:text-foreground">
                <p className="mb-3">
                  Atenção: já existe um protocolo cadastrado para{' '}
                  <strong className="text-[#C77E1E]">{duplicateWarning}</strong>. Deseja continuar
                  mesmo assim?
                </p>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 text-xs border-[#E4E7EB] dark:border-border text-[#78818E]"
                    onClick={() => setDuplicateWarning(null)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    className="h-8 text-xs bg-[#C77E1E] hover:bg-[#C77E1E]/90 text-white font-semibold"
                    onClick={() => {
                      setDuplicateWarning(null)
                      handleSave(form.getValues(), true)
                    }}
                  >
                    Salvar mesmo assim
                  </Button>
                </div>
              </div>
            )}

            {!duplicateWarning && (
              <DialogFooter className="pt-4 border-t border-[#E4E7EB] dark:border-border">
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 text-xs border-[#E4E7EB] dark:border-border text-[#78818E]"
                  onClick={() => onOpenChange(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="h-9 text-xs bg-[#C9922A] hover:bg-[#b58324] text-white font-semibold shadow-xs"
                >
                  {item || preselectedItem
                    ? 'Salvar alterações'
                    : modoMesmoCaso && mesmoCasoOriginal
                      ? 'Salvar continuação'
                      : prefill
                        ? 'Confirmar e salvar protocolo'
                        : 'Salvar Protocolo'}
                </Button>
              </DialogFooter>
            )}
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export function ProtocoloDeleteDialog({ open, onOpenChange, item, onDeleted }: any) {
  const onConfirm = async () => {
    if (!item) return
    try {
      await deleteProtocolo(item.id)
      toast.success('Excluído com sucesso')
      onOpenChange(false)
      onDeleted()
    } catch (e) {
      toast.error('Erro ao excluir')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[10px] border border-[#E4E7EB] dark:border-border p-6 max-w-md">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center text-[10px] font-bold tracking-[1.2px] uppercase text-[#B4453C] bg-[#B4453C]/10 px-2 py-0.5 rounded">
              CONFIRMAÇÃO
            </span>
          </div>
          <DialogTitle className="text-lg font-bold text-[#252B34] dark:text-foreground">
            Excluir Protocolo
          </DialogTitle>
          <DialogDescription className="text-xs text-[#78818E] dark:text-muted-foreground">
            Tem certeza que deseja excluir permanentemente o protocolo de{' '}
            <strong className="text-[#252B34] dark:text-foreground font-semibold">
              {item?.nome}
            </strong>
            ? Esta ação é irreversível.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="pt-4 border-t border-[#E4E7EB] dark:border-border gap-2">
          <Button
            variant="outline"
            className="h-9 text-xs border-[#E4E7EB] dark:border-border text-[#78818E]"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            className="h-9 text-xs bg-[#B4453C] hover:bg-[#9e3b33] text-white font-semibold shadow-xs"
            onClick={onConfirm}
          >
            Excluir permanentemente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
