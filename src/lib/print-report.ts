export interface PrintReportColumn<T = any> {
  header: string
  // Key of the item or custom cell renderer returning a string or HTML string
  accessor: keyof T | ((item: T, index: number) => string | number | null | undefined)
  align?: 'left' | 'center' | 'right'
  className?: string
  width?: string
}

export interface PrintReportOptions<T = any> {
  title: string
  subtitle?: string
  filters?: string[] | string
  columns: PrintReportColumn<T>[]
  data: T[]
  orientation?: 'portrait' | 'landscape'
  totalLabel?: string
  customSummaryHtml?: string
}

/**
 * Escapes common HTML special characters
 */
function escapeHtml(str: any): string {
  if (str === null || str === undefined) return ''
  const s = String(str)
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Helper reutilizável para impressão e exportação em PDF de relatórios institucionais
 * Preserva cores de impressão (-webkit-print-color-adjust: exact), aplica identidade visual institucional
 * e abre nova janela com window.print() automático após carregar.
 */
export function printReport<T = any>(options: PrintReportOptions<T>): void {
  const {
    title,
    subtitle = 'Advocacia Gasparotto',
    filters,
    columns,
    data,
    orientation = 'portrait',
    totalLabel,
    customSummaryHtml,
  } = options

  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    alert('Não foi possível abrir a janela de impressão. Verifique se os pop-ups estão bloqueados.')
    return
  }

  // Format filters description
  let filtersText = ''
  if (Array.isArray(filters)) {
    filtersText = filters.filter(Boolean).join(' | ')
  } else if (typeof filters === 'string') {
    filtersText = filters.trim()
  }

  const filtersDisplay = filtersText
    ? `<strong>Filtros aplicados:</strong> ${escapeHtml(filtersText)}`
    : 'Nenhum filtro aplicado'

  const dateNow = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  // Table rows HTML
  const rowsHtml =
    data.length === 0
      ? `<tr><td colspan="${columns.length}" style="text-align: center; padding: 24px; color: #666; font-style: italic;">Nenhum registro encontrado.</td></tr>`
      : data
          .map((item, index) => {
            const cells = columns
              .map((col) => {
                let val: any
                if (typeof col.accessor === 'function') {
                  val = col.accessor(item, index)
                } else {
                  val = item[col.accessor]
                }

                const align = col.align || 'left'
                const cellContent =
                  val === null || val === undefined || val === '' ? '-' : String(val)

                return `<td style="text-align: ${align};">${cellContent}</td>`
              })
              .join('')

            return `<tr>${cells}</tr>`
          })
          .join('\n')

  const totalCount = data.length
  const totalDisplay = totalLabel
    ? `${totalLabel}: ${totalCount}`
    : `Total de registros: ${totalCount}`

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)}</title>
  <style>
    @page {
      size: ${orientation === 'landscape' ? 'A4 landscape' : 'A4 portrait'};
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

    .header-left {
      flex: 1;
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

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10.5px;
      margin-top: 4px;
    }

    th {
      background-color: #F6F3EB !important;
      color: #374151;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 9.5px;
      letter-spacing: 0.03em;
      border: 1px solid #E5E1D8;
      padding: 7px 8px;
    }

    td {
      border: 1px solid #E5E7EB;
      padding: 6px 8px;
      vertical-align: middle;
    }

    tr:nth-child(even) td {
      background-color: #FAFAFA !important;
    }

    /* Badges & Pills styling */
    .badge {
      display: inline-block;
      padding: 2px 7px;
      border-radius: 9999px;
      font-size: 9.5px;
      font-weight: 600;
      line-height: 1.2;
      white-space: nowrap;
      text-transform: none;
    }

    .badge-rpv {
      background-color: #FEF3C7 !important;
      color: #92400E !important;
      border: 1px solid #FCD34D;
    }

    .badge-precatorio {
      background-color: #EDE9FE !important;
      color: #5B21B6 !important;
      border: 1px solid #DDD6FE;
    }

    .badge-recebido {
      background-color: #DCFCE7 !important;
      color: #166534 !important;
      border: 1px solid #BBF7D0;
    }

    .badge-aguardando {
      background-color: #DBEAFE !important;
      color: #1E40AF !important;
      border: 1px solid #BFDBFE;
    }

    .badge-amber {
      background-color: #FEF3C7 !important;
      color: #92400E !important;
      border: 1px solid #FDE68A;
    }

    .badge-purple {
      background-color: #F3E8FF !important;
      color: #6B21A8 !important;
      border: 1px solid #E9D5FF;
    }

    .badge-orange {
      background-color: #FFEDD5 !important;
      color: #9A3412 !important;
      border: 1px solid #FED7AA;
    }

    .badge-red {
      background-color: #FEE2E2 !important;
      color: #991B1B !important;
      border: 1px solid #FECACA;
    }

    .badge-gray {
      background-color: #F3F4F6 !important;
      color: #374151 !important;
      border: 1px solid #E5E7EB;
    }

    .badge-gold {
      background-color: #FDF7EA !important;
      color: #C9922A !important;
      border: 1px solid #F3DFB4;
    }

    .summary-section {
      margin-top: 14px;
    }

    .footer {
      margin-top: 16px;
      padding-top: 10px;
      border-top: 1px solid #E5E7EB;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      font-weight: 700;
      color: #374151;
    }

    .footer-left {
      color: #6B7280;
      font-weight: 400;
      font-size: 10px;
    }

    .footer-right {
      font-size: 11px;
      color: #1F2937;
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
      <div class="brand-title">${escapeHtml(subtitle)}</div>
      <h1 class="main-title">${escapeHtml(title)}</h1>
    </div>
    <div class="header-right">
      <div>Emissão: ${dateNow}</div>
    </div>
  </div>

  <div class="filters-box">
    ${filtersDisplay}
  </div>

  <table>
    <thead>
      <tr>
        ${columns
          .map((col) => {
            const align = col.align || 'left'
            const style = `text-align: ${align};${col.width ? ` width: ${col.width};` : ''}`
            return `<th style="${style}">${escapeHtml(col.header)}</th>`
          })
          .join('\n        ')}
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>

  ${customSummaryHtml ? `<div class="summary-section">${customSummaryHtml}</div>` : ''}

  <div class="footer">
    <div class="footer-left">Relatório gerado pelo Sistema Gasparotto</div>
    <div class="footer-right">${escapeHtml(totalDisplay)}</div>
  </div>

  <script>
    window.onload = function() {
      // Delay slightly to ensure fonts and styles are parsed
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
