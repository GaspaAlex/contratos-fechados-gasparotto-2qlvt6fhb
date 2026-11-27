/**
 * HOOK — CALENDÁRIO DA COMPETÊNCIA PARA A SEÇÃO COMISSÕES/DSR (Build C3-B)
 * ========================================================================
 * Lê os feriados CADASTRADOS (cc_feriados, via serviço) e calcula o calendário
 * de dias úteis/repouso da competência pelo motor PURO (ccComissaoDsr.ts).
 *
 * Os feriados NACIONAIS já estão embutidos no motor — a ausência de registros
 * em cc_feriados NÃO significa ausência de feriados nacionais. Falha de leitura
 * devolve [] (o serviço já trata) e o cálculo segue com os nacionais.
 *
 * Toda a matemática (critério de sábado útil, dedupe de feriado em fim de
 * semana, etc.) é do motor — aqui não há regra de negócio nova.
 */
import { useEffect, useMemo, useState } from 'react'
import { getFeriadosCC } from '@/services/ccFeriados'
import {
  calcularCalendarioCompetencia,
  type ConfigDiasCompetencia,
} from '@/lib/ccComissaoDsr'

interface EstadoCalendario {
  diasUteis: number
  diasRepouso: number
  /** Fração repouso/úteis para exibição (ex.: "5/26"); '—' quando sem úteis. */
  fracaoDsr: string
  /** Nomes dos feriados cadastrados que caem no mês (para conferência na tela). */
  feriadosCadastradosNoMes: string[]
  carregandoFeriados: boolean
}

/** Calendário estático (só nacionais) enquanto os cadastrados não chegam. */
export function calcularComConfig(
  ano: number,
  mes: number,
  config: ConfigDiasCompetencia,
): { diasUteis: number; diasRepouso: number; fracaoDsr: string } {
  const cal = calcularCalendarioCompetencia(ano, mes, config)
  const fracaoDsr =
    cal.diasUteis > 0 && cal.diasRepouso > 0 ? `${cal.diasRepouso}/${cal.diasUteis}` : '—'
  return { diasUteis: cal.diasUteis, diasRepouso: cal.diasRepouso, fracaoDsr }
}

export function useComissaoDsr(
  funcionarioId: string,
  mes: number,
  ano: number,
): EstadoCalendario {
  const [feriados, setFeriados] = useState<
    Awaited<ReturnType<typeof getFeriadosCC>> | undefined
  >(undefined)

  useEffect(() => {
    let ativo = true
    if (!funcionarioId) {
      setFeriados(undefined)
      return
    }
    getFeriadosCC()
      .then((f) => {
        if (ativo) setFeriados(f)
      })
      .catch(() => {
        if (ativo) setFeriados([])
      })
    return () => {
      ativo = false
    }
  }, [funcionarioId])

  return useMemo<EstadoCalendario>(() => {
    const carregandoFeriados = !!funcionarioId && feriados === undefined
    const config: ConfigDiasCompetencia = {
      sabadoUtil: true,
      feriadosCadastrados: feriados ?? [],
    }
    const cal = calcularCalendarioCompetencia(ano, mes, config)
    const fracaoDsr =
      cal.diasUteis > 0 && cal.diasRepouso > 0 ? `${cal.diasRepouso}/${cal.diasUteis}` : '—'
    const feriadosCadastradosNoMes = cal.detalhe
      .filter((d) => d.feriado === 'Feriado cadastrado')
      .map((d) => d.ymd)
    return {
      diasUteis: cal.diasUteis,
      diasRepouso: cal.diasRepouso,
      fracaoDsr,
      feriadosCadastradosNoMes,
      carregandoFeriados,
    }
  }, [funcionarioId, feriados, mes, ano])
}
