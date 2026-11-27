
import { writeFileSync } from 'node:fs'
const RESULT_PATH = "/app/pods/contratos-fechados-gasparotto-b07d7/scripts/cenarios-result.json"
import { runCenariosComissoes } from './src__lib__comissoes.cenarios.mjs'
import { runCenariosIndicadores } from './src__lib__protocoloIndicadores.cenarios.mjs'
import { runCenariosColaboradores } from './src__lib__comissoesColaboradores.cenarios.mjs'
import { runCenariosContracheques } from './src__lib__ccSalarios.cenarios.mjs'

const falhas = []
const resultados = []
for (const [suite, run] of [
  ['COMISSOES', runCenariosComissoes],
  ['INDICADORES', runCenariosIndicadores],
  ['COMISSOES_F', runCenariosColaboradores],
  ['CONTRACHEQUES_C1', runCenariosContracheques],
]) {
  for (const r of run()) {
    resultados.push({ suite, ...r })
    const ok = r.ok === null ? 'MANUAL' : r.ok ? 'OK' : 'FALHOU'
    if (r.ok === false) falhas.push(suite + ': ' + r.cenario)
    console.log('[' + ok + '] ' + suite + ' :: ' + r.cenario + ' :: ' + r.detalhe)
  }
}
console.log('RESULTADO_JSON=' + JSON.stringify(resultados))
writeFileSync(RESULT_PATH, JSON.stringify(resultados, null, 2))
if (falhas.length) {
  console.error('CENÁRIOS COM FALHA: ' + falhas.join('; '))
  process.exit(1)
}
console.log('Todos os cenários executáveis passaram.')
