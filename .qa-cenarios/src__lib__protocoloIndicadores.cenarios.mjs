/**
 * CENÁRIOS EM MEMÓRIA — indicadores financeiros da aba Protocolo.
 * Mesmo padrão de src/lib/comissoes.cenarios.ts: dados fictícios, nenhuma
 * gravação no banco (prévia e produção compartilham o MESMO banco). Executado
 * de verdade no prebuild (scripts/run-cenarios.mjs via scripts/fetch-opencv.mjs).
 */
import { calcularIndicadoresFinanceiros } from './src__lib__protocoloIndicadores.mjs';
const ativo = (id, extra = {}) => ({
    id,
    status: 'Protocolado Judicial',
    valor: 0,
    ...extra,
});
export function runCenariosIndicadores() {
    const resultados = [];
    const registrar = (cenario, ok, detalhe) => resultados.push({ cenario, ok, detalhe });
    // A) Um caso com apenas um protocolo ativo → uma oportunidade financeira.
    {
        const r = calcularIndicadoresFinanceiros([ativo('p1', { valor: 100000 })]);
        registrar('A', r.acoesNaProjecao === 1 && r.projHonorarios === 30000 && r.ticketMedio === 30000, `1 caso, 1 oportunidade, honorários 30.000 (30%), ticket 30.000 — obtido: ${r.acoesNaProjecao} ação(ões), R$ ${r.projHonorarios}`);
    }
    // B) Requerimento administrativo seguido de ação judicial ativa → UMA
    //    oportunidade, usando a judicial vigente (não mais duas).
    {
        const req = ativo('p1', {
            status: 'Requerimento Adm.',
            valor: 80000,
            caso_continuacoes: ['p2'],
        });
        const jud = ativo('p2', { valor: 100000, caso_origem: 'p1', protocolo_anterior: 'p1' });
        const r = calcularIndicadoresFinanceiros([req, jud]);
        registrar('B', r.acoesNaProjecao === 1 && r.projHonorarios === 30000, `cadeia req→judicial: 1 oportunidade pela judicial vigente (R$ 30.000, não 54.000) — obtido: ${r.acoesNaProjecao} ação(ões), R$ ${r.projHonorarios}`);
    }
    // C) Judicial seguida de novo ajuizamento → uma oportunidade, a mais recente
    //    pela ordem da cadeia (NÃO pela maior data).
    {
        const a1 = ativo('p1', {
            valor: 90000,
            dprotocolo: '2025-06-10',
            caso_continuacoes: ['p2'],
        });
        const a2 = ativo('p2', {
            valor: 120000,
            dprotocolo: '2025-05-01', // data anterior à da raiz — vigente é pela ordem da cadeia
            caso_origem: 'p1',
            protocolo_anterior: 'p1',
        });
        const r = calcularIndicadoresFinanceiros([a1, a2]);
        registrar('C', r.acoesNaProjecao === 1 && r.projHonorarios === 36000, `vigente = p2 (último da cadeia, mesmo com dprotocolo anterior): 1 ação, R$ 36.000 — obtido: ${r.acoesNaProjecao} ação(ões), R$ ${r.projHonorarios}`);
    }
    // D) Movimentação anterior Improcedente e continuação ativa → contar
    //    somente a continuação.
    {
        const ant = ativo('p1', {
            valor: 50000,
            decisao: 'Improcedente',
            caso_continuacoes: ['p2'],
        });
        const cont = ativo('p2', { valor: 100000, caso_origem: 'p1', protocolo_anterior: 'p1' });
        const r = calcularIndicadoresFinanceiros([ant, cont]);
        registrar('D', r.acoesNaProjecao === 1 && r.projHonorarios === 30000, `anterior Improcedente + continuação ativa: 1 oportunidade pela vigente — obtido: ${r.acoesNaProjecao} ação(ões), R$ ${r.projHonorarios}`);
    }
    // E) Vigente com decisão Improcedente → sem honorários, sem ação ativa.
    {
        const r = calcularIndicadoresFinanceiros([
            ativo('p1', { valor: 100000, decisao: 'Improcedente' }),
        ]);
        registrar('E', r.acoesNaProjecao === 0 &&
            r.projHonorarios === 0 &&
            r.ticketMedio === 0 &&
            r.casosDecisaoDesfavoravel === 1, `vigente Improcedente: 0 ação, R$ 0, ticket 0, caso marcado como decisão desfavorável — obtido: ${r.acoesNaProjecao} ação(ões), R$ ${r.projHonorarios}, ticket ${r.ticketMedio}`);
    }
    // F) Vigente em R. Docs → sem honorários, sem ação ativa (suspensão).
    {
        const r = calcularIndicadoresFinanceiros([ativo('p1', { status: 'R. Docs', valor: 100000 })]);
        registrar('F', r.acoesNaProjecao === 0 &&
            r.projHonorarios === 0 &&
            r.ticketMedio === 0 &&
            r.casosSuspensos === 1, `vigente R. Docs: 0 ação, R$ 0, ticket 0, caso marcado como suspenso — obtido: ${r.acoesNaProjecao} ação(ões), R$ ${r.projHonorarios}, ticket ${r.ticketMedio}`);
    }
    // G) Continuação vigente sem valor da causa → 1 ação ativa, honorários 0.
    {
        const raiz = ativo('p1', {
            status: 'Calculado',
            valor: 70000,
            caso_continuacoes: ['p2'],
        });
        const cont = ativo('p2', { valor: 0, caso_origem: 'p1', protocolo_anterior: 'p1' });
        const r = calcularIndicadoresFinanceiros([raiz, cont]);
        registrar('G', r.acoesNaProjecao === 1 &&
            r.projHonorarios === 0 &&
            r.casosSemValor === 1 &&
            r.ticketMedio === 0, `continuação sem valor: 1 ação ativa, R$ 0 (não presume valor da anterior), ticket 0 — obtido: ${r.acoesNaProjecao} ação(ões), R$ ${r.projHonorarios}, sem valor: ${r.casosSemValor}`);
    }
    // H) Mesmo cliente com contratos distintos → oportunidades independentes.
    {
        const r = calcularIndicadoresFinanceiros([
            ativo('p1', { valor: 100000, contratos: ['c1'] }),
            ativo('p2', { valor: 100000, contratos: ['c2'] }),
        ]);
        registrar('H', r.acoesNaProjecao === 2 && r.projHonorarios === 60000, `2 contratos distintos: 2 oportunidades independentes, R$ 60.000 — obtido: ${r.acoesNaProjecao} ação(ões), R$ ${r.projHonorarios}`);
    }
    // I) Registros antigos sem vínculo inequívoco → NÃO agrupar (mesmo cliente,
    //    mesmo telefone, sem relation e sem cadeia).
    {
        const r = calcularIndicadoresFinanceiros([
            ativo('p1', { nome: 'Fulano', fone: '11999990000', valor: 100000 }),
            ativo('p2', { nome: 'Fulano', fone: '11999990000', valor: 100000 }),
        ]);
        registrar('I', r.acoesNaProjecao === 2, `sem relation e sem cadeia: 2 casos independentes mesmo com mesmo nome/fone — obtido: ${r.acoesNaProjecao} ação(ões)`);
    }
    // J) Nenhuma oportunidade ativa → indicadores zerados, ticket médio seguro.
    {
        const r = calcularIndicadoresFinanceiros([
            ativo('p1', { status: 'Arquivado', valor: 100000 }),
            ativo('p2', { status: 'R. Docs', valor: 50000 }),
        ]);
        registrar('J', r.acoesNaProjecao === 0 && r.projHonorarios === 0 && r.ticketMedio === 0, `nenhuma oportunidade ativa: tudo zerado, ticket 0 (sem divisão inválida) — obtido: ${r.acoesNaProjecao} ação(ões), R$ ${r.projHonorarios}, ticket ${r.ticketMedio}`);
    }
    // K) Caso com três movimentações → considerar somente a vigente (a última).
    {
        const m1 = ativo('p1', {
            status: 'Requerimento Adm.',
            valor: 60000,
            caso_continuacoes: ['p2'],
        });
        const m2 = ativo('p2', {
            status: 'Protocolado Judicial',
            valor: 80000,
            caso_origem: 'p1',
            protocolo_anterior: 'p1',
            caso_continuacoes: ['p3'],
        });
        const m3 = ativo('p3', {
            status: 'Calculado',
            valor: 100000,
            caso_origem: 'p1',
            protocolo_anterior: 'p2',
        });
        const r = calcularIndicadoresFinanceiros([m1, m2, m3]);
        registrar('K', r.acoesNaProjecao === 1 && r.projHonorarios === 30000, `cadeia de 3: só a vigente (p3, Calculado) conta — 1 ação, R$ 30.000 — obtido: ${r.acoesNaProjecao} ação(ões), R$ ${r.projHonorarios}`);
    }
    // Extra (percentual com parceiro preservado na vigente): 15%.
    {
        const r = calcularIndicadoresFinanceiros([ativo('p1', { valor: 100000, parceiro: 'João' })]);
        registrar('P', r.projHonorarios === 15000, `parceiro na vigente: 15% (R$ 15.000) — obtido: R$ ${r.projHonorarios}`);
    }
    // ===== BUILD C — decisão "Extinto sem resolução do mérito" =====
    // C1) Vigente extinta → fora da projeção, sem recuperar a anterior.
    {
        const ext = ativo('p1', {
            status: 'Calculado',
            valor: 80000,
            decisao: 'Extinto sem resolução do mérito',
            caso_continuacoes: ['p2'],
        });
        const novo = ativo('p2', {
            status: 'Prov. Inicial',
            valor: 120000,
            caso_origem: 'p1',
            protocolo_anterior: 'p1',
        });
        const r = calcularIndicadoresFinanceiros([ext, novo]);
        registrar('C1', r.acoesNaProjecao === 1 && r.projHonorarios === 36000 && r.ticketMedio === 36000, `extinta (Calculado) + novo ajuizamento ativo: a vigente é a nova — 1 ação, R$ 36.000, ticket 36.000 — obtido: ${r.acoesNaProjecao} ação(ões), R$ ${r.projHonorarios}, ticket ${r.ticketMedio}`);
    }
    // C2) Vigente extinta e nada depois dela → nada na projeção; a anterior
    //     Procedente NÃO volta (decisão da vigente encerra a oportunidade).
    {
        const ant = ativo('p1', {
            status: 'Calculado',
            valor: 50000,
            decisao: 'Procedente',
            caso_continuacoes: ['p2'],
        });
        const vig = ativo('p2', {
            status: 'Calculado',
            valor: 90000,
            decisao: 'Extinto sem resolução do mérito',
            caso_origem: 'p1',
            protocolo_anterior: 'p1',
        });
        const r = calcularIndicadoresFinanceiros([ant, vig]);
        registrar('C2', r.acoesNaProjecao === 0 && r.projHonorarios === 0 && r.ticketMedio === 0, `anterior Procedente + vigente extinta: 0 ação, R$ 0 (sem recuperar a anterior) — obtido: ${r.acoesNaProjecao} ação(ões), R$ ${r.projHonorarios}, ticket ${r.ticketMedio}`);
    }
    // C3) Vigente extinta conta como decisão desfavorável (mesmo bucket de
    //     Improcedente nos indicadores) e não como suspenso/sem valor.
    {
        const r = calcularIndicadoresFinanceiros([
            ativo('p1', {
                status: 'Calculado',
                valor: 90000,
                decisao: 'Extinto sem resolução do mérito',
            }),
        ]);
        registrar('C3', r.casosDecisaoDesfavoravel === 1 &&
            r.casosSuspensos === 0 &&
            r.casosSemValor === 0 &&
            r.acoesNaProjecao === 0 &&
            r.projHonorarios === 0 &&
            r.ticketMedio === 0, `vigente extinta: decisão desfavorável=1, suspenso=0, sem valor=0, 0 ação, R$ 0 — obtido: desfavorável=${r.casosDecisaoDesfavoravel}, suspenso=${r.casosSuspensos}, sem valor=${r.casosSemValor}`);
    }
    return resultados;
}
