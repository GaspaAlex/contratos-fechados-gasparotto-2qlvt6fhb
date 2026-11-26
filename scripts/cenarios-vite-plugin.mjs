/**
 * PLUGIN DE QA — roda os cenários de comissões e indicadores financeiros DE
 * VERDADE no início do build (run_qa), sem tocar no banco e sem fazer parte do
 * app em runtime. A plataforma não roda suíte de testes formal: este plugin é
 * a execução real dos cenários exigidos pelo gestor.
 *
 * - Reusa scripts/run-cenarios.mjs (mesma mecânica: transpila os módulos puros
 *   com o `typescript` do projeto e os importa como ESM no Node).
 * - Falha o build se algum cenário executável falhar (r.ok === false).
 * - Escreve scripts/cenarios-result.json como evidência do que rodou.
 *
 * Os cenários usam dados SIMULADOS em memória — nenhum registro real é lido ou
 * gravado (prévia e produção compartilham o MESMO banco).
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, rmSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

export default function cenariosPlugin() {
  return {
    name: 'run-cenarios-qa',
    buildStart() {
      if (process.env.SKIP_CENARIOS === '1') return
      if (existsSync(resolve(ROOT, 'scripts', 'cenarios-result.json'))) {
        rmSync(resolve(ROOT, 'scripts', 'cenarios-result.json'))
      }
      const res = spawnSync(process.execPath, ['scripts/run-cenarios.mjs'], {
        cwd: ROOT,
        encoding: 'utf8',
        env: process.env,
      })
      const out = (res.stdout || '') + (res.stderr || '')
      console.log(out.trim())
      if (res.status !== 0) {
        throw new Error('Cenários de QA falharam (build interrompido). Veja a saída acima.')
      }
      if (!existsSync(resolve(ROOT, 'scripts', 'cenarios-result.json'))) {
        throw new Error('cenarios-result.json não foi gravado pelo runner.')
      }
    },
  }
}
