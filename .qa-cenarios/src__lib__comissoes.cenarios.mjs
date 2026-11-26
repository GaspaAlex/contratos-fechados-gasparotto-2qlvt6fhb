/**
 * CENÁRIOS DE LÓGICA DA APURAÇÃO DE COMISSÕES — dados simulados em memória.
 * Função pura: não acessa o banco, não grava nada. Pode ser chamada por um
 * teste manual ou por um runner futuro: `runCenariosComissoes()` devolve o
 * resultado de cada cenário (ok / detalhe).
 * Nenhum dado real é usado; todos os nomes, fones e IDs são fictícios.
 */
import { apurarComissoes, acumuladoComissoes, ROTULO_CONTINUACAO_SEM_COMISSAO, STATUS_SUSPENSO, } from './src__lib__comissoes.mjs';
import { calcularMetaComissoes } from './src__lib__comissaoMeta.mjs';
const MESES = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
];
const TIPO = { id: 'tipo1', nome: 'Aux. Fictício' };
const RESP = 'resp-fict-1';
const contrato = (id, status = 'Ativo', fone = '(00) 90000-0001') => ({
    id,
    nome: `Contrato ${id}`,
    status,
    fone,
    beneficio: TIPO.nome,
});
const prot = (id, dcalculo, extra = {}) => ({
    id,
    nome: `Cliente ${id}`,
    fone: '(00) 90000-0001',
    status: 'Prov. Inicial',
    dcalculo,
    tipo_acao: TIPO.id,
    contratos: ['c1'],
    responsavel: RESP,
    created: '2026-01-01 00:00:00.000Z',
    caso_origem: null,
    protocolo_anterior: null,
    caso_continuacoes: [],
    ...extra,
});
const ap = (protocolos, contratos, mes, ano) => apurarComissoes(protocolos, contratos, mes, ano, MESES, new Map([[TIPO.id, TIPO]]));
const check = (cenario, cond, detalhe) => ({
    cenario,
    ok: cond,
    detalhe,
});
export function runCenariosComissoes() {
    const c1 = contrato('c1');
    const out = [];
    // A — caso único, uma liberação elegível → 1 comissão.
    const a = ap([prot('p1', '2026-11-10 12:00:00.000Z')], [c1], 11, 2026);
    out.push(check('A caso único gera 1 comissão', a.quantidadeElegivel === 1 && a.totalBasico === 50, `elegíveis=${a.quantidadeElegivel}`));
    // B — continuação em outro mês → sem nova comissão.
    const pB = [
        prot('p1', '2026-11-10 12:00:00.000Z'),
        prot('p2', '2026-12-05 12:00:00.000Z', { caso_origem: 'p1', caso_continuacoes: [] }),
    ];
    const bNov = ap(pB, [c1], 11, 2026);
    const bDez = ap(pB, [c1], 12, 2026);
    out.push(check('B continuação em outro mês não gera nova', bNov.quantidadeElegivel === 1 &&
        bDez.quantidadeElegivel === 0 &&
        bDez.totalBasico === 0 &&
        bDez.casosDuplicados.length === 1 &&
        bDez.casosDuplicados[0].observacao.startsWith(ROTULO_CONTINUACAO_SEM_COMISSAO), `nov=${bNov.quantidadeElegivel} dez=${bDez.quantidadeElegivel} dup=${bDez.casosDuplicados.length}`));
    // C — continuação em outro ano → sem nova comissão.
    const pC = [
        prot('p1', '2026-11-10 12:00:00.000Z'),
        prot('p2', '2027-02-03 12:00:00.000Z', { caso_origem: 'p1' }),
    ];
    const cAno = ap(pC, [c1], 2, 2027);
    out.push(check('C continuação em outro ano não gera nova', cAno.quantidadeElegivel === 0 && cAno.casosDuplicados.length === 1, `elegíveis=${cAno.quantidadeElegivel}`));
    // D — administrativo seguido de judicial (mesmo contrato) não duplica.
    const pD = [
        prot('p1', '2026-11-10 12:00:00.000Z', { status: 'Protocolado Administrativo' }),
        prot('p2', '2026-11-20 12:00:00.000Z', { status: 'Protocolado Judicial', caso_origem: 'p1' }),
    ];
    const d = ap(pD, [c1], 11, 2026);
    out.push(check('D administrativo→judicial não duplica', d.quantidadeElegivel === 1 && d.totalBasico === 50, `elegíveis=${d.quantidadeElegivel}`));
    // E — novo ajuizamento após extinção (via protocolo_anterior) não duplica.
    const pE = [
        prot('p1', '2026-10-01 12:00:00.000Z', { status: 'Protocolado Judicial' }),
        prot('p2', '2026-11-15 12:00:00.000Z', { protocolo_anterior: 'p1' }),
    ];
    const e = ap(pE, [c1], 11, 2026);
    out.push(check('E novo ajuizamento após extinção não duplica', e.quantidadeElegivel === 0 && e.casosDuplicados.length === 1, `elegíveis=${e.quantidadeElegivel}`));
    // F — contratos distintos do mesmo cliente são independentes.
    const c2 = contrato('c2');
    const pF = [
        prot('p1', '2026-11-10 12:00:00.000Z', { contratos: ['c1'] }),
        prot('p2', '2026-11-12 12:00:00.000Z', { contratos: ['c2'] }),
    ];
    const f = ap(pF, [c1, c2], 11, 2026);
    out.push(check('F contratos distintos do mesmo cliente independentes', f.quantidadeElegivel === 2 && f.totalBasico === 100, `elegíveis=${f.quantidadeElegivel}`));
    // G — R. Docs suspenso não conta; ao sair, disputa a primeira liberação.
    const pGsusp = [prot('p1', '2026-11-10 12:00:00.000Z', { status: 'R. Docs' })];
    const g1 = ap(pGsusp, [c1], 11, 2026);
    const pGsai = [
        prot('p1', '2026-11-10 12:00:00.000Z', { status: 'Prov. Inicial' }),
        prot('p2', '2026-12-02 12:00:00.000Z', { status: 'R. Docs', caso_origem: 'p1' }),
    ];
    const g2 = ap(pGsai, [c1], 11, 2026);
    out.push(check('G R. Docs suspenso não conta como comissão', g1.quantidadeElegivel === 0 &&
        g1.casosSuspensos.length === 1 &&
        g1.totalBasico === 0 &&
        g2.quantidadeElegivel === 1, `suspenso-sozinho=${g1.quantidadeElegivel} suspensos=${g1.casosSuspensos.length} comR.Docs-com-p1=${g2.quantidadeElegivel}`));
    const pGsem = [
        prot('p1', '2026-11-10 12:00:00.000Z', { status: 'R. Docs' }),
        prot('p2', '2026-12-02 12:00:00.000Z', { status: 'Prov. Inicial', caso_origem: 'p1' }),
    ];
    const g3 = ap(pGsem, [c1], 12, 2026);
    out.push(check('G ao sair de R. Docs disputa a primeira liberação', g3.quantidadeElegivel === 1, `dez=${g3.quantidadeElegivel}`));
    // H — formulário herda dcontrato: coberto por inspeção de código (ProtocoloDialogs.tsx);
    // não é exercitável por lógica pura.
    out.push({
        cenario: 'H formulário herda dcontrato',
        ok: null,
        detalhe: 'verificação manual — efeito de prefill em ProtocoloDialogs.tsx (linha ~230)',
    });
    // I — continuação sem dcalculo não entra na apuração nem gera comissão.
    const pI = [prot('p1', '2026-11-10 12:00:00.000Z'), prot('p2', '', { caso_origem: 'p1' })];
    const i = ap(pI, [c1], 11, 2026);
    out.push(check('I dcalculo vazio na continuação não gera comissão', i.quantidadeElegivel === 1, `elegíveis=${i.quantidadeElegivel}`));
    // J — indicadores financeiros: este build não altera apurarComissoes fora da dedup/rótulo;
    // a projeção (ProtocoloDashboard) não é tocada. Verificação por revisão de diff.
    out.push({
        cenario: 'J indicadores financeiros inalterados',
        ok: null,
        detalhe: 'verificação manual — este build não altera projeção/ticket/distribuição',
    });
    // ===== BUILD D — ACUMULADO HISTÓRICO E DISTRIBUIÇÃO FIXA (cenários A–H) =====
    const somaDistribuicao = (n) => ({
        bia: n * 20,
        nayara: n * 20,
        kaique: n * 10,
        nataly: n * 20,
        basico: n * 50,
        potencial: n * 70,
    });
    // D-A — 100 casos independentes elegíveis → distribuição fixa completa.
    {
        const protos = [];
        const contr = [];
        for (let i = 0; i < 100; i++) {
            contr.push(contrato(`dc${i}`, 'Ativo', `(00) 9${String(1000 + i).slice(-4)}-0001`));
            protos.push(prot(`dp${i}`, '2026-11-10 12:00:00.000Z', { contratos: [`dc${i}`] }));
        }
        const exp = somaDistribuicao(100);
        const aMensal = ap(protos, contr, 11, 2026);
        const aAcum = acumuladoComissoes(protos, contr);
        out.push(check('D-A 100 casos independentes → distribuição fixa', aMensal.quantidadeElegivel === 100 &&
            aMensal.totalBasico === exp.basico &&
            aMensal.totalPotencial === exp.potencial &&
            aMensal.colaboradores.find((c) => c.nome === 'Bia')?.valorBasico === exp.bia &&
            aMensal.colaboradores.find((c) => c.nome === 'Nayara')?.valorBasico === exp.nayara &&
            aMensal.colaboradores.find((c) => c.nome === 'Kaique')?.valorBasico === exp.kaique &&
            aMensal.colaboradores.find((c) => c.nome === 'Nataly')?.valorPotencial === exp.nataly &&
            aAcum.casosElegiveis === 100 &&
            aAcum.totalBasico === exp.basico &&
            aAcum.bia === exp.bia &&
            aAcum.nayara === exp.nayara &&
            aAcum.kaique === exp.kaique &&
            aAcum.natalyPotencial === exp.nataly, `mensal=${aMensal.quantidadeElegivel} acum=${aAcum.casosElegiveis} basico=${aAcum.totalBasico} bia=${aAcum.bia} nayara=${aAcum.nayara} kaique=${aAcum.kaique} nataly=${aAcum.natalyPotencial}`));
    }
    // D-B — mesma caso com continuação em outro mês → comissão única no acumulado.
    {
        const pB = [
            prot('db1', '2026-11-10 12:00:00.000Z'),
            prot('db2', '2026-12-05 12:00:00.000Z', { caso_origem: 'db1' }),
        ];
        const bMensalDez = ap(pB, [c1], 12, 2026);
        const bAcum = acumuladoComissoes(pB, [c1]);
        out.push(check('D-B continuação em outro mês → comissão única no acumulado', bAcum.casosElegiveis === 1 &&
            bAcum.totalBasico === 50 &&
            bMensalDez.quantidadeElegivel === 0 &&
            bMensalDez.casosDuplicados.length === 1, `acum=${bAcum.casosElegiveis} basico=${bAcum.totalBasico} dezElegiveis=${bMensalDez.quantidadeElegivel}`));
    }
    // D-C — mesma caso com continuação em outro ano → comissão única no acumulado.
    {
        const pC = [
            prot('dc1p', '2026-11-10 12:00:00.000Z'),
            prot('dc2p', '2027-02-03 12:00:00.000Z', { caso_origem: 'dc1p' }),
        ];
        const cMensal2027 = ap(pC, [c1], 2, 2027);
        const cAcum = acumuladoComissoes(pC, [c1]);
        out.push(check('D-C continuação em outro ano → comissão única no acumulado', cAcum.casosElegiveis === 1 &&
            cAcum.totalBasico === 50 &&
            cMensal2027.quantidadeElegivel === 0 &&
            cMensal2027.casosDuplicados.length === 1, `acum=${cAcum.casosElegiveis} basico=${cAcum.totalBasico} 2027Elegiveis=${cMensal2027.quantidadeElegivel}`));
    }
    // D-D — caso em R. Docs sem liberação elegível → não contabilizado no acumulado.
    {
        const pD = [prot('dd1', '2026-11-10 12:00:00.000Z', { status: 'R. Docs' })];
        const dMensal = ap(pD, [c1], 11, 2026);
        const dAcum = acumuladoComissoes(pD, [c1]);
        out.push(check('D-D R. Docs sem liberação elegível não contabiliza', dMensal.quantidadeElegivel === 0 &&
            dMensal.casosSuspensos.length === 1 &&
            dAcum.casosElegiveis === 0 &&
            dAcum.totalBasico === 0, `mensal=${dMensal.quantidadeElegivel} acum=${dAcum.casosElegiveis} basico=${dAcum.totalBasico}`));
    }
    // D-E — mesmo cliente com dois contratos independentes → duas comissões.
    {
        const e1 = contrato('de1', 'Ativo', '(00) 90000-1111');
        const e2 = contrato('de2', 'Ativo', '(00) 90000-1111');
        const pE = [
            prot('de1p', '2026-11-10 12:00:00.000Z', { contratos: ['de1'], fone: '(00) 90000-1111' }),
            prot('de2p', '2026-11-12 12:00:00.000Z', { contratos: ['de2'], fone: '(00) 90000-1111' }),
        ];
        const eMensal = ap(pE, [e1, e2], 11, 2026);
        const eAcum = acumuladoComissoes(pE, [e1, e2]);
        out.push(check('D-E dois contratos independentes → duas comissões', eMensal.quantidadeElegivel === 2 &&
            eMensal.totalBasico === 100 &&
            eAcum.casosElegiveis === 2 &&
            eAcum.totalBasico === 100, `mensal=${eMensal.quantidadeElegivel} acum=${eAcum.casosElegiveis}`));
    }
    // D-F — alterar o Responsável do protocolo não muda nenhum valor individual.
    {
        const pF1 = [prot('df1', '2026-11-10 12:00:00.000Z', { responsavel: 'resp-um' })];
        const pF2 = [prot('df1', '2026-11-10 12:00:00.000Z', { responsavel: 'resp-outro' })];
        const f1 = acumuladoComissoes(pF1, [c1]);
        const f2 = acumuladoComissoes(pF2, [c1]);
        const fMensal1 = ap(pF1, [c1], 11, 2026);
        const fMensal2 = ap(pF2, [c1], 11, 2026);
        const igual = JSON.stringify(f1) === JSON.stringify(f2) &&
            JSON.stringify(fMensal1) === JSON.stringify(fMensal2);
        out.push(check('D-F responsável não interfere nos valores', igual &&
            f1.bia === 20 &&
            f1.nayara === 20 &&
            f1.kaique === 10 &&
            f1.natalyPotencial === 20 &&
            f1.totalBasico === 50, `acum invariante=${igual} bia=${f1.bia} nayara=${f1.nayara} kaique=${f1.kaique} nataly=${f1.natalyPotencial}`));
    }
    // D-G — meta da Nataly não implementada: potencial separado do total básico.
    {
        const gAcum = acumuladoComissoes([prot('dg1', '2026-11-10 12:00:00.000Z')], [c1]);
        out.push(check('D-G Nataly potencial fora do total básico', gAcum.natalyPotencial === 20 &&
            gAcum.totalBasico === 50 &&
            gAcum.totalBasico + gAcum.natalyPotencial === gAcum.totalPotencial, `basico=${gAcum.totalBasico} nataly=${gAcum.natalyPotencial} potencial=${gAcum.totalPotencial}`));
    }
    // D-H — consistência entre apuração mensal e acumulada (soma das competências únicas).
    {
        // Caso 1: liberação em nov/2026 com continuação em dez/2026 (comissão só em nov).
        // Caso 2: liberação em dez/2026. Caso 3: liberação em fev/2027.
        const pH = [
            prot('dh1', '2026-11-10 12:00:00.000Z'),
            prot('dh2', '2026-12-05 12:00:00.000Z', { caso_origem: 'dh1', contratos: ['c1'] }),
            prot('dh3', '2026-12-20 12:00:00.000Z', { contratos: ['dhc2'] }),
            prot('dh4', '2027-02-15 12:00:00.000Z', { contratos: ['dhc3'] }),
        ];
        const cH2 = contrato('dhc2', 'Ativo', '(00) 90000-2222');
        const cH3 = contrato('dhc3', 'Ativo', '(00) 90000-3333');
        const contrH = [c1, cH2, cH3];
        const nov = ap(pH, contrH, 11, 2026);
        const dez = ap(pH, contrH, 12, 2026);
        const fev27 = ap(pH, contrH, 2, 2027);
        const somaMensal = nov.totalBasico + dez.totalBasico + fev27.totalBasico;
        const hAcum = acumuladoComissoes(pH, contrH);
        out.push(check('D-H consistência mensal × acumulada', hAcum.casosElegiveis === 3 &&
            hAcum.totalBasico === 150 &&
            somaMensal === hAcum.totalBasico &&
            nov.quantidadeElegivel === 1 &&
            dez.quantidadeElegivel === 1 &&
            fev27.quantidadeElegivel === 1, `somaMensal=${somaMensal} acumulado=${hAcum.totalBasico} casos=${hAcum.casosElegiveis}`));
    }
    // ===== BUILD E1 — META MENSAL DE COMISSÕES (cenários A–J) =====
    /** Contrato de meta com dcontrato e status (mesma forma do RDocsDashboard). */
    const contratoMeta = (id, dcontrato, status = 'Concluído', extra = {}) => ({ id, dcontrato, status, nome: extra.nome || `Contrato ${id}` });
    const cmeta = (cenario, cond, detalhe) => ({
        cenario,
        ok: cond,
        detalhe,
    });
    const fmtBRL = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 });
    // A — meta 50, contratos ativos 52, 25 casos elegíveis → meta atingida:
    //     Nataly 25×20 = R$ 500 integra o total; total = 25×50 + 500 = R$ 1.750.
    {
        const contratos = [];
        for (let i = 0; i < 52; i++)
            contratos.push(contratoMeta(`ma${i}`, '2026-11-05 12:00:00.000Z'));
        const r = calcularMetaComissoes({ contratos, mes: 11, ano: 2026, meta: 50, casosElegiveis: 25 });
        out.push(cmeta('E-A meta 50 com 52 ativos e 25 casos → Nataly R$ 500, total R$ 1.750', r.contratosAtivos === 52 &&
            r.situacaoMeta === 'atingida' &&
            r.natalyIncluida === 500 &&
            r.natalyPotencial === 500 &&
            r.totalBasico === 1250 &&
            r.totalCompetencia === 1750, `ativos=${r.contratosAtivos} situação=${r.situacaoMeta} Nataly=${fmtBRL(r.natalyIncluida)} básico=${fmtBRL(r.totalBasico)} total=${fmtBRL(r.totalCompetencia)}`));
    }
    // B — meta 50, 43 contratos ativos, 25 casos → não atingida: Nataly R$ 0,
    //     total = apenas o básico R$ 1.250.
    {
        const contratos = [];
        for (let i = 0; i < 43; i++)
            contratos.push(contratoMeta(`mb${i}`, '2026-11-05 12:00:00.000Z'));
        const r = calcularMetaComissoes({ contratos, mes: 11, ano: 2026, meta: 50, casosElegiveis: 25 });
        out.push(cmeta('E-B meta 50 com 43 ativos → Nataly R$ 0, total R$ 1.250', r.contratosAtivos === 43 &&
            r.situacaoMeta === 'nao atingida' &&
            r.natalyIncluida === 0 &&
            r.totalBasico === 1250 &&
            r.totalCompetencia === 1250 &&
            r.natalyPotencial === 500, `ativos=${r.contratosAtivos} situação=${r.situacaoMeta} Nataly incluída=${fmtBRL(r.natalyIncluida)} total=${fmtBRL(r.totalCompetencia)}`));
    }
    // C — meta não definida → situação "não definida", Nataly NÃO integra o
    //     total, total = básico. NÃO se presume meta atingida.
    {
        const r = calcularMetaComissoes({
            contratos: [contratoMeta('mc1', '2026-11-05 12:00:00.000Z')],
            mes: 11,
            ano: 2026,
            meta: null,
            casosElegiveis: 25,
        });
        out.push(cmeta('E-C meta não definida → Nataly fora do total', r.situacaoMeta === 'nao definida' &&
            r.metaConfigurada === null &&
            r.natalyIncluida === 0 &&
            r.totalCompetencia === 1250, `situação=${r.situacaoMeta} Nataly incluída=${fmtBRL(r.natalyIncluida)} total=${fmtBRL(r.totalCompetencia)}`));
    }
    // D — contrato arquivado não entra na contagem da meta.
    {
        const r = calcularMetaComissoes({
            contratos: [
                contratoMeta('md1', '2026-11-05 12:00:00.000Z', 'Arquivar'),
                contratoMeta('md2', '2026-11-08 12:00:00.000Z', 'Litispendência'),
                contratoMeta('md3', '2026-11-10 12:00:00.000Z', 'Concluído'),
            ],
            mes: 11,
            ano: 2026,
            meta: 2,
            casosElegiveis: 1,
        });
        out.push(cmeta('E-D contratos arquivados não contam na meta', r.contratosAtivos === 1 && r.situacaoMeta === 'nao atingida', `ativos=${r.contratosAtivos} (3 no mês, 2 arquivados) situação=${r.situacaoMeta}`));
    }
    // E — contrato ativo com protocolo em R. Docs conta na META comercial, mas
    //     o caso fica suspenso (sem comissão) enquanto estiver em R. Docs.
    {
        const contratos = [
            contratoMeta('me1', '2026-11-05 12:00:00.000Z'),
            contratoMeta('me2', '2026-11-08 12:00:00.000Z'),
        ];
        const r = calcularMetaComissoes({
            contratos,
            mes: 11,
            ano: 2026,
            meta: 2,
            casosElegiveis: 0, // caso suspenso em R. Docs — apurarComissoes exclui
        });
        const apSusp = ap([prot('me1p', '2026-11-10 12:00:00.000Z', { status: STATUS_SUSPENSO })], contratos, 11, 2026);
        out.push(cmeta('E-E R. Docs conta na meta comercial mas sem comissão', r.contratosAtivos === 2 &&
            r.situacaoMeta === 'atingida' &&
            apSusp.quantidadeElegivel === 0 &&
            apSusp.casosSuspensos.length === 1, `meta: ativos=${r.contratosAtivos} situação=${r.situacaoMeta}; comissão: elegíveis=${apSusp.quantidadeElegivel} suspensos=${apSusp.casosSuspensos.length}`));
    }
    // F — contrato fechado em novembro com protocolo agendado para dezembro
    //     conta na meta de NOVEMBRO (competência da meta = dcontrato).
    {
        const contratos = [contratoMeta('mf1', '2026-11-20 12:00:00.000Z')];
        const nov = calcularMetaComissoes({
            contratos,
            mes: 11,
            ano: 2026,
            meta: 1,
            casosElegiveis: 1,
        });
        const dez = calcularMetaComissoes({
            contratos,
            mes: 12,
            ano: 2026,
            meta: 1,
            casosElegiveis: 0,
        });
        out.push(cmeta('E-F dcontrato novembro conta na meta de novembro', nov.contratosAtivos === 1 &&
            nov.situacaoMeta === 'atingida' &&
            dez.contratosAtivos === 0 &&
            dez.situacaoMeta === 'nao atingida', `nov ativos=${nov.contratosAtivos} (${nov.situacaoMeta}) · dez ativos=${dez.contratosAtivos} (${dez.situacaoMeta})`));
    }
    // G — caso calculado em novembro com protocolo agendado para dezembro →
    //     comissão pertence a NOVEMBRO (competência exclusiva da dcalculo).
    {
        // Caso com dcalculo em nov; a "movimentação" de dezembro é continuação
        // (mesma cadeia) — a comissão única do caso fica em novembro.
        const pG = [
            prot('eg1', '2026-11-10 12:00:00.000Z', { contratos: ['egc1'] }),
            prot('eg2', '2026-12-05 12:00:00.000Z', { caso_origem: 'eg1', contratos: ['egc1'] }),
        ];
        const cGC = contrato('egc1');
        const nov = ap(pG, [cGC], 11, 2026);
        const dez = ap(pG, [cGC], 12, 2026);
        const rNov = calcularMetaComissoes({
            contratos: [contratoMeta('egc1', '2026-11-05 12:00:00.000Z')],
            mes: 11,
            ano: 2026,
            meta: 1,
            casosElegiveis: nov.quantidadeElegivel,
        });
        out.push(cmeta('E-G dcalculo novembro → comissão em novembro', nov.quantidadeElegivel === 1 &&
            dez.quantidadeElegivel === 0 &&
            dez.casosDuplicados.length === 1 &&
            rNov.totalBasico === 50, `nov elegíveis=${nov.quantidadeElegivel} · dez elegíveis=${dez.quantidadeElegivel} (dup=${dez.casosDuplicados.length}) · básico nov=${fmtBRL(rNov.totalBasico)}`));
    }
    // H — metas independentes por competência: novembro 50 e dezembro 60.
    {
        const contrNov = [];
        const contrDez = [];
        for (let i = 0; i < 50; i++)
            contrNov.push(contratoMeta(`mh-n${i}`, '2026-11-05 12:00:00.000Z'));
        for (let i = 0; i < 59; i++)
            contrDez.push(contratoMeta(`mh-d${i}`, '2026-12-05 12:00:00.000Z'));
        const nov = calcularMetaComissoes({
            contratos: contrNov,
            mes: 11,
            ano: 2026,
            meta: 50,
            casosElegiveis: 10,
        });
        const dez = calcularMetaComissoes({
            contratos: contrDez,
            mes: 12,
            ano: 2026,
            meta: 60,
            casosElegiveis: 10,
        });
        out.push(cmeta('E-H metas independentes nov=50 / dez=60', nov.situacaoMeta === 'atingida' && dez.situacaoMeta === 'nao atingida', `nov ativos=${nov.contratosAtivos} (${nov.situacaoMeta}) · dez ativos=${dez.contratosAtivos} (${dez.situacaoMeta})`));
    }
    // I — mesmo cliente com contratos distintos e ativos → contabiliza
    //     individualmente na meta (2 ativos, não 1).
    {
        const r = calcularMetaComissoes({
            contratos: [
                contratoMeta('mi1', '2026-11-05 12:00:00.000Z', 'Concluído', { nome: 'Cliente X' }),
                contratoMeta('mi2', '2026-11-09 12:00:00.000Z', 'Concluído', { nome: 'Cliente X' }),
            ],
            mes: 11,
            ano: 2026,
            meta: 2,
            casosElegiveis: 2,
        });
        out.push(cmeta('E-I mesmo cliente, contratos distintos → contagem individual', r.contratosAtivos === 2 && r.situacaoMeta === 'atingida' && r.totalCompetencia === 140, `ativos=${r.contratosAtivos} situação=${r.situacaoMeta} total=${fmtBRL(r.totalCompetencia)}`));
    }
    // J — nenhum caso elegível → total R$ 0 independentemente da meta.
    {
        const contratos = [];
        for (let i = 0; i < 60; i++)
            contratos.push(contratoMeta(`mj${i}`, '2026-11-05 12:00:00.000Z'));
        const r = calcularMetaComissoes({ contratos, mes: 11, ano: 2026, meta: 50, casosElegiveis: 0 });
        out.push(cmeta('E-J nenhum caso elegível → total R$ 0', r.contratosAtivos === 60 &&
            r.situacaoMeta === 'atingida' &&
            r.totalBasico === 0 &&
            r.natalyIncluida === 0 &&
            r.totalCompetencia === 0, `meta atingida com ${r.contratosAtivos} ativos, porém total=${fmtBRL(r.totalCompetencia)}`));
    }
    return out;
}
