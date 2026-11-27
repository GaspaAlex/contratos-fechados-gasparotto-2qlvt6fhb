/**
 * RUNNER DOS CENÁRIOS — executa de verdade as funções puras dos cenários de
 * comissões e dos indicadores financeiros e imprime o resultado de cada um,
 * gravando também `scripts/cenarios-result.json` como evidência.
 *
 * Executado no início do build deste projeto (`npm run build` / `build:dev`),
 * pois a plataforma não roda suíte de testes formal. NÃO acessa o banco, NÃO
 * grava registros e NÃO faz parte do app em runtime.
 *
 * Mecânica: os módulos puros usam o alias '@/'. Cada arquivo-fonte é
 * transpilado com o próprio `typescript` do projeto (sem hacks de regex) e as
 * importações '@/x' são reescritas para caminhos relativos '.mjs' dentro de
 * `.qa-cenarios/`, que o Node importa nativamente como ESM.
 */
import { readFileSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const require = createRequire(import.meta.url)
const ts = require('typescript')

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = join(ROOT, '.qa-cenarios')
const RESULT_PATH = join(ROOT, 'scripts', 'cenarios-result.json')

const FILES = [
  'src/lib/utils.ts',
  'src/lib/archivedStatuses.ts',
  'src/lib/formatters.ts',
  'src/services/protocoloValidade.ts',
  'src/lib/comissoes.ts',
  'src/lib/comissaoMeta.ts',
  'src/lib/comissoes.cenarios.ts',
  'src/lib/comissoesColaboradores.ts',
  'src/lib/comissoesColaboradores.cenarios.ts',
  'src/lib/apuracaoCard.ts',
  'src/lib/equipePadrao.ts',
  'src/lib/protocoloIndicadores.ts',
  'src/lib/protocoloIndicadores.cenarios.ts',
  'src/lib/ccSalarios.cenarios.ts',
  'src/lib/ccParticipantes.ts',
  'src/lib/ccParticipantes.cenarios.ts',
  'src/lib/ccContracheque.ts',
  'src/lib/ccContracheque.cenarios.ts',
]

// Stub do cliente PocketBase: comissoes.ts importa 2 helpers puros de
// leadsAuxAcidente.ts, que por sua vez importa o cliente do banco (inaceitável
// fora do navegador). No runner, o import é trocado por um stub com as mesmas
// funções puras (cópias fiéis, sem acesso a banco).
const STUB_LEADS_AUX = `
export function normalizePhoneDigits(value) {
  return (value || '').replace(/\\D/g, '')
}
export function formatDateBR(value) {
  if (!value) return '—'
  const datePart = String(value).split(' ')[0].split('T')[0]
  const [y, m, d] = datePart.split('-')
  if (!y || !m || !d) return value
  return d + '/' + m + '/' + y
}
`
const STUB_FILES = {
  'src/services/leadsAuxAcidente.ts': STUB_LEADS_AUX,
}

const OUT_NAME = (rel) => rel.replace(/[\\/]/g, '__').replace(/\.ts$/, '.mjs')

/** Reescreve especificadores '@/x' e relativos para os módulos materializados. */
function rewriteSpec(spec, fromRel) {
  let targetRel
  if (spec.startsWith('@/')) {
    targetRel = 'src/' + spec.slice(2)
  } else if (spec.startsWith('.')) {
    targetRel = relative(ROOT, resolve(dirname(join(ROOT, fromRel)), spec)).replaceAll('\\', '/')
  } else {
    return null // pacote npm (clsx, tailwind-merge…) — mantém
  }
  targetRel = targetRel.replace(/\.ts$/, '')
  const outName = OUT_NAME(targetRel + '.ts')
  // Rewrites que apontam para um arquivo STUBADO não são descartadas: o stub é
  // materializado no OUT_DIR com o mesmo OUT_NAME (mesma assinatura de export).
  if (!FILES.some((f) => OUT_NAME(f) === outName) && !STUB_FILES[targetRel + '.ts']) return null
  return './' + outName
}

function transpile(rel) {
  const code = STUB_FILES[rel] ?? readFileSync(join(ROOT, rel), 'utf8')
  const out = ts.transpileModule(code, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ESNext,
      inlineSourceMap: false,
    },
  }).outputText
  return out.replace(/from\s+['"]([^'"]+)['"]/g, (full, spec) => {
    const rewritten = rewriteSpec(spec, rel)
    return rewritten ? `from '${rewritten}'` : full
  })
}

mkdirSync(OUT_DIR, { recursive: true })
for (const rel of FILES) {
  writeFileSync(join(OUT_DIR, OUT_NAME(rel)), transpile(rel))
}
for (const rel of Object.keys(STUB_FILES)) {
  writeFileSync(join(OUT_DIR, OUT_NAME(rel)), transpile(rel))
}

const entry = `
import { writeFileSync } from 'node:fs'
const RESULT_PATH = ${JSON.stringify(RESULT_PATH)}
import { runCenariosComissoes } from './${OUT_NAME('src/lib/comissoes.cenarios.ts')}'
import { runCenariosIndicadores } from './${OUT_NAME('src/lib/protocoloIndicadores.cenarios.ts')}'
import { runCenariosColaboradores } from './${OUT_NAME('src/lib/comissoesColaboradores.cenarios.ts')}'
import { runCenariosContracheques } from './${OUT_NAME('src/lib/ccSalarios.cenarios.ts')}'
import { runCenariosParticipantes } from './${OUT_NAME('src/lib/ccParticipantes.cenarios.ts')}'
import { runCenariosContrachequeMensal } from './${OUT_NAME('src/lib/ccContracheque.cenarios.ts')}'

const falhas = []
const resultados = []
for (const [suite, run] of [
  ['COMISSOES', runCenariosComissoes],
  ['INDICADORES', runCenariosIndicadores],
  ['COMISSOES_F', runCenariosColaboradores],
  ['CONTRACHEQUES_C1', runCenariosContracheques],
  ['CONTRACHEQUES_P', runCenariosParticipantes],
  ['CONTRACHEQUES_C2', runCenariosContrachequeMensal],
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
`
writeFileSync(join(OUT_DIR, '__entry.mjs'), entry)

let resultados = []
try {
  await import(pathToFileURL(join(OUT_DIR, '__entry.mjs')).href)
} finally {
  try {
    resultados = JSON.parse(readFileSync(RESULT_PATH, 'utf8'))
  } catch {
    /* resultado é regravado abaixo */
  }
  writeFileSync(
    RESULT_PATH,
    JSON.stringify({ executadoEm: new Date().toISOString(), resultados }, null, 2),
  )
  rmSync(OUT_DIR, { recursive: true, force: true })
}
