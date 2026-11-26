/**
 * IMPRESSÃO / PDF — RELATÓRIO DE COMISSÕES (Build H)
 * ===================================================
 * Mecanismo idêntico ao de printReport (src/lib/print-report.ts), já validado
 * nas abas Protocolo, Contratos Fechados, RPV e Perícias: nova janela com
 * document.write + window.print() automático, A4 retrato, mesmas cores,
 * tipografia e cabeçalho institucional.
 *
 * EXCLUSIVAMENTE PRESENTACIONAL: recebe a ApuracaoCardComissoes JÁ calculada
 * pelo card (apuracaoCard.ts) e imprime os MESMOS valores — nenhuma comissão é
 * recalculada aqui. Impresso somente o essencial: resumo financeiro, valores
 * por colaborador, casos elegíveis (cliente + Data do Cálculo) e casos
 * suspensos (cliente + Data do Cálculo + "Faltando Documentos").
 */
import { formatCurrency } from '@/lib/formatters'
import { formatDateBR } from '@/services/leadsAuxAcidente'
import type { ApuracaoCardComissoes } from '@/lib/apuracaoCard'

/** Rótulo textual da situação da meta (idêntico ao rosto do detalhamento). */
function situacaoMetaTexto(card: ApuracaoCardComissoes): string {
  const situacao = card.meta?.situacaoMeta ?? 'nao definida'
  if (situacao === 'atingida') return 'Meta atingida'
  if (situacao === 'nao atingida') return 'Meta não atingida'
  return 'Meta não definida'
}

function esc(valor: unknown): string {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function dataCalculo(dcalculo?: string | null): string {
  if (!dcalculo) return '—'
  return formatDateBR(dcalculo)
}

/** Linha comum das tabelas de casos. */
function linhaCaso(nome: string, dcalculo: string | null, situacao?: string): string {
  const situacaoCell = situacao
    ? `<td style="text-align: left; color: #C77E1E; font-weight: 600;">${esc(situacao)}</td>`
    : ''
  return `<tr><td style="text-align: left;">${esc(nome)}</td><td style="text-align: center;">${esc(dataCalculo(dcalculo))}</td>${situacaoCell}</tr>`
}

function tabelaCasos(titulo: string, linhas: string[], colunas: number): string {
  const corpo =
    linhas.length === 0
      ? `<tr><td colspan="${colunas}" style="text-align: center; padding: 16px; color: #666; font-style: italic;">Nenhum caso.</td></tr>`
      : linhas.join('\n')
  const thSituacao = colunas === 3 ? '<th style="text-align: left;">Situação</th>' : ''
  return `
  <div class="section-title">${esc(titulo)}</div>
  <table>
    <thead>
      <tr>
        <th style="text-align: left;">Cliente</th>
        <th style="text-align: center; width: 130px;">Data do Cálculo</th>
        ${thSituacao}
      </tr>
    </thead>
    <tbody>
      ${corpo}
    </tbody>
  </table>`
}

/**
 * Abre a janela de impressão do navegador (impressora ou "Salvar como PDF")
 * com o RELATÓRIO DE COMISSÕES da competência JÁ apurada pelo card.
 */
export function imprimirRelatorioComissoes(card: ApuracaoCardComissoes): void {
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    alert('Não foi possível abrir a janela de impressão. Verifique se os pop-ups estão bloqueados.')
    return
  }

  const apuracao = card.apuracao
  const modoDinamico = card.modo === 'dinamico'

  // Resumo financeiro — MESMOS valores do card (nenhum recálculo).
  const metaTexto =
    card.meta?.metaConfigurada != null ? `${card.meta.metaConfigurada} contratos` : 'Não definida'
  const resumo = [
    ['Casos elegíveis', String(apuracao.quantidadeElegivel)],
    ['Casos suspensos', String(apuracao.casosSuspensos.length)],
    ['Meta de contratos', metaTexto],
    ['Contratos ativos fechados', String(card.meta?.contratosAtivos ?? 0)],
    ['Situação da meta', situacaoMetaTexto(card)],
    ['Total da competência', formatCurrency(card.totalCompetencia)],
  ]
    .map(
      ([rotulo, valor]) =>
        `<tr><td style="text-align: left; width: 55%;">${esc(rotulo)}</td><td style="text-align: right; font-weight: 600;">${esc(valor)}</td></tr>`,
    )
    .join('\n')

  // Valor individual por colaborador — dinâmico (modo dinâmico) ou fallback.
  const linhasColaboradores: string[] = modoDinamico
    ? card.linhas.map((linha) => {
        const potencial =
          !linha.integraTotal && linha.valorPotencial > 0
            ? ` <span style="color: #78716c; font-weight: 400; font-size: 9.5px;">(potencial ${esc(formatCurrency(linha.valorPotencial))})</span>`
            : ''
        return `<tr><td style="text-align: left;">${esc(linha.nome)}</td><td style="text-align: right;">${esc(formatCurrency(linha.valorConfirmado))}${potencial}</td></tr>`
      })
    : apuracao.colaboradores.map(
        (colab) =>
          `<tr><td style="text-align: left;">${esc(colab.nome)}</td><td style="text-align: right;">${esc(formatCurrency(colab.valorBasico))}</td></tr>`,
      )

  const casosElegiveis = apuracao.casosElegiveis.map((c) => linhaCaso(c.nome, c.dcalculo))
  const casosSuspensos = apuracao.casosSuspensos.map((c) =>
    linhaCaso(c.nome, c.dcalculo, 'Faltando Documentos'),
  )

  const dateNow = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Relatório de Comissões — ${esc(apuracao.competencia)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 1.2cm 1cm 1.2cm 1cm;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      margin: 0;
      padding: 16px;
      color: #1f2937;
      background-color: #ffffff;
      font-size: 11px;
      line-height: 1.4;
    }

    .header-container {
      border-bottom: 2px solid #C9922A;
      padding-bottom: 12px;
      margin-bottom: 14px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }

    .brand-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #78716c;
      margin: 0 0 2px 0;
    }

    .main-title {
      font-size: 20px;
      font-weight: 800;
      color: #C9922A;
      margin: 0;
      letter-spacing: -0.01em;
      text-transform: uppercase;
    }

    .header-right {
      text-align: right;
      font-size: 10px;
      color: #6b7280;
    }

    .filters-box {
      background-color: #FAF8F2;
      border: 1px solid #E8DFCE;
      border-radius: 6px;
      padding: 7px 12px;
      margin-bottom: 14px;
      font-size: 11px;
      color: #4b5563;
    }

    .filters-box strong {
      color: #1f2937;
    }

    .section-title {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #374151;
      margin: 16px 0 6px 0;
      padding-bottom: 3px;
      border-bottom: 1px solid #E5E1D8;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10.5px;
      margin-top: 2px;
    }

    th {
      background-color: #F6F3EB !important;
      color: #374151;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 9.5px;
      letter-spacing: 0.03em;
      border: 1px solid #E5E1D8;
      padding: 6px 8px;
    }

    td {
      border: 1px solid #E5E7EB;
      padding: 5px 8px;
      vertical-align: middle;
    }

    tr:nth-child(even) td {
      background-color: #FAFAFA !important;
    }

    thead { display: table-header-group; }
    tr { page-break-inside: avoid; }

    .footer {
      margin-top: 18px;
      padding-top: 10px;
      border-top: 1px solid #E5E7EB;
      font-size: 9.5px;
      color: #6B7280;
    }

    @media print {
      body {
        margin: 0;
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="header-container">
    <div class="header-left">
      <div class="brand-title">ADVOCACIA GASPAROTTO</div>
      <h1 class="main-title">RELATÓRIO DE COMISSÕES</h1>
    </div>
    <div class="header-right">
      <div>Emissão: ${esc(dateNow)}</div>
    </div>
  </div>

  <div class="filters-box">
    <strong>Competência:</strong> ${esc(apuracao.competencia)}
  </div>

  <div class="section-title">Resumo financeiro</div>
  <table>
    <tbody>
      ${resumo}
    </tbody>
  </table>

  <div class="section-title">Comissões por colaborador</div>
  <table>
    <thead>
      <tr>
        <th style="text-align: left;">Colaborador</th>
        <th style="text-align: right; width: 160px;">Valor</th>
      </tr>
    </thead>
    <tbody>
      ${
        linhasColaboradores.length === 0
          ? '<tr><td colspan="2" style="text-align: center; padding: 16px; color: #666; font-style: italic;">Nenhum colaborador comissionado nesta competência.</td></tr>'
          : linhasColaboradores.join('\n')
      }
      <tr>
        <td style="text-align: left; font-weight: 700; background-color: #F6F3EB !important;">TOTAL DA COMPETÊNCIA</td>
        <td style="text-align: right; font-weight: 700; background-color: #F6F3EB !important;">${esc(formatCurrency(card.totalCompetencia))}</td>
      </tr>
    </tbody>
  </table>

  ${tabelaCasos(`Casos elegíveis (${apuracao.casosElegiveis.length})`, casosElegiveis, 2)}

  ${tabelaCasos(`Casos suspensos (${apuracao.casosSuspensos.length})`, casosSuspensos, 3)}

  <div class="footer">
    Relatório de apuração de comissões. Os valores não representam, necessariamente, pagamentos já realizados.
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 250);
    };
  </script>
</body>
</html>`

  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
}
