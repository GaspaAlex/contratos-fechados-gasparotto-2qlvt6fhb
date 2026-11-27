/**
 * INDICADORES FINANCEIROS DA ABA PROTOCOLO — por CASO, pela movimentação VIGENTE.
 * =============================================================================
 * Substitui o cálculo por registro individual do ProtocoloDashboard: antes, um
 * requerimento administrativo e a ação judicial posterior do mesmo caso somavam
 * como duas oportunidades; idem processo extinto e reajuizado.
 *
 * Função PURA: não acessa o banco, não grava, não altera registros. Alimenta
 * SOMENTE os 3 indicadores financeiros (Projeção de Honorários, Ações na
 * Projeção, Ticket Médio). NÃO interfere no card de Comissões, em
 * src/lib/comissoes.ts (dedup global própria), na Distribuição por Status, na
 * tabela, nos filtros ou em qualquer outro módulo.
 *
 * IDENTIDADE DO CASO — agrupamento APENAS por vínculo inequívoco:
 *   (a) relation protocolo.contratos (mesmo contrato_fechado);
 *   (b) cadeia de continuidade: caso_origem (raiz), protocolo_anterior e
 *       caso_continuacoes.
 * Nome e telefone NUNCA unem casos: contratos distintos do mesmo cliente são
 * casos independentes. Registros históricos sem vínculo inequívoco permanecem
 * casos próprios (sem associação automática).
 *
 * MOVIMENTAÇÃO VIGENTE — a mais recente da cadeia pela ORDEM EXPLÍCITA da
 * cadeia (raiz → … → última, via caso_origem/protocolo_anterior/
 * caso_continuacoes), NÃO pela maior Data do Protocolo ou Data do Cálculo
 * (podem ser preenchidas depois ou refletir agendamentos — servem apenas de
 * desempate defensivo entre vínculos paralelos da mesma cadeia). Se a
 * movimentação mais recente estiver ENCERRADA (decisão desfavorável) ou
 * SUSPENSA (R. Docs), NÃO se recupera movimentação anterior: o caso fica sem
 * oportunidade financeira ativa enquanto durar essa condição.
 *
 * HONORÁRIOS — calculados apenas sobre a movimentação vigente de cada caso,
 * preservando os percentuais atuais (sem parceiro 30%, com parceiro 15%).
 * Sem valor da causa na vigente, não se presume valor de movimentação anterior:
 * o caso conta como ação ativa com contribuição financeira zero.
 *
 * DECISÕES QUE EXCLUDEM DA PROJEÇÃO — lista central DECISOES_SEM_PROJECAO.
 * Contém 'Improcedente' e 'Extinto sem resolução do mérito' (opção 0107 do
 * campo decisao, acrescentada por migration aditiva). Vigente com qualquer
 * uma delas fica sem oportunidade financeira ativa, sem recuperar a
 * movimentação anterior do caso.
 *
 * Observação: este módulo é propositalmente DEPENDÊNCIA-LIVRE de banco/infra
 * (só módulos puros) para poder ser executado de verdade em QA/build
 * (scripts/run-cenarios.mjs). O status suspenso é repetido aqui como constante
 * local com a mesma fonte de verdade do literal 'R. Docs' usado em
 * src/lib/comissoes.ts (STATUS_SUSPENSO).
 */
/** Status que suspende o caso (exibido como "Faltando Documentos") — mesmo literal de comissoes.STATUS_SUSPENSO. */
export const STATUS_SUSPENSO_PROJECAO = 'R. Docs';
/** Status de contrato que invalidam a projeção (fonte única: archivedStatuses). */
export const ARCHIVED_STATUSES_PROJECAO = [
    'Arquivar',
    'Litispendência',
    'Sem Qualidade de Segurado',
    'Tem Advogado',
];
const ARCHIVED_SET = new Set(ARCHIVED_STATUSES_PROJECAO.map((s) => s.toLowerCase()));
/** isArchived local, espelho fiel de src/lib/archivedStatuses.ts. */
function isContratoArquivado(status) {
    if (!status)
        return false;
    return ARCHIVED_SET.has(status.trim().toLowerCase());
}
/**
 * Espelho fiel de isProtocoloValido (src/services/protocoloValidade.ts), sem
 * importar módulos com acesso a banco: sem relation → válido (fallback
 * conservador); com relation → válido apenas com 1 contrato existente e não
 * arquivado; todos órfãos → conservador (válido).
 */
export function isProtocoloValidoProjecao(protocolo, contratosPorId) {
    const ids = (protocolo.contratos || []).filter(Boolean);
    if (ids.length === 0)
        return true;
    if (!contratosPorId)
        return true; // sem lista de contratos: conservador
    const resolviveis = ids
        .map((id) => contratosPorId.get(id))
        .filter(Boolean);
    if (resolviveis.length === 0)
        return true; // todos órfãos → conservador
    return resolviveis.some((c) => !isContratoArquivado(c.status));
}
/** Status ativos na projeção — mesma lista do filtro "Todos" do dashboard. */
export const STATUS_ATIVOS_PROJECAO = [
    'Protocolado Judicial',
    'Protocolado Administrativo',
    'Requerimento Adm.',
    'Prov. Inicial',
    'Calculado',
];
const STATUS_ATIVOS_SET = new Set(STATUS_ATIVOS_PROJECAO);
/**
 * Lista CENTRAL de decisões que excluem a movimentação da projeção financeira.
 * 'Improcedente' e 'Extinto sem resolução do mérito' (opção 0107 do campo
 * decisao) são encerramentos sem oportunidade financeira ativa — enquanto a
 * vigente do caso tiver uma delas, NÃO se recupera movimentação anterior.
 * Um novo ajuizamento ativo do mesmo caso volta a ser a vigente e a projetar.
 * Preserva integralmente a regra atual de 'Improcedente'.
 */
export const DECISOES_SEM_PROJECAO = ['Improcedente', 'Extinto sem resolução do mérito'];
const DECISOES_SEM_PROJECAO_SET = new Set(DECISOES_SEM_PROJECAO);
/** União-busca mínima para agrupar protocolos em casos (mesma técnica da dedup de comissões). */
function criarGruposDeCaso() {
    const pai = new Map();
    const find = (x) => {
        if (!pai.has(x))
            pai.set(x, x);
        let raiz = x;
        while (pai.get(raiz) !== raiz)
            raiz = pai.get(raiz);
        let atual = x;
        while (atual !== raiz) {
            const prox = pai.get(atual);
            pai.set(atual, raiz);
            atual = prox;
        }
        return raiz;
    };
    const unir = (a, b) => {
        const ra = find(a);
        const rb = find(b);
        if (ra !== rb)
            pai.set(ra, rb);
    };
    return { find, unir };
}
/**
 * Agrupa os protocolos em CASOS por vínculo inequívoco (relation de contrato +
 * cadeia de continuidade). Nome/telefone nunca unem. Retorna grupo → registros
 * e registro → grupo.
 */
export function agruparCasos(protocolos) {
    const grupos = criarGruposDeCaso();
    for (const p of protocolos) {
        grupos.find(p.id);
        for (const cid of (p.contratos || []).filter(Boolean)) {
            grupos.unir(p.id, `contrato:${String(cid)}`);
        }
        if (p.caso_origem)
            grupos.unir(p.id, String(p.caso_origem));
        if (p.protocolo_anterior)
            grupos.unir(p.id, String(p.protocolo_anterior));
        if (Array.isArray(p.caso_continuacoes)) {
            for (const id of p.caso_continuacoes) {
                if (id)
                    grupos.unir(p.id, String(id));
            }
        }
    }
    const porGrupo = new Map();
    const grupoDe = new Map();
    for (const p of protocolos) {
        const g = grupos.find(p.id);
        grupoDe.set(p.id, g);
        const arr = porGrupo.get(g);
        if (arr)
            arr.push(p);
        else
            porGrupo.set(g, [p]);
    }
    return { porGrupo, grupoDe };
}
/** Data de referência para desempate defensivo da ordem de cadeia (só desempate). */
function chaveData(p) {
    return `${String(p.dprotocolo || '')}|${String(p.dcalculo || '')}|${String(p.created || '')}|${p.id}`;
}
/**
 * Raiz do caso dentro do conjunto carregado: resolve a cadeia via
 * caso_origem (campo gravado pelo hook como raiz; resolução recursiva defensiva
 * com guarda de ciclo para dados anteriores à regra da raiz).
 */
function raizNoConjunto(registros) {
    const porId = new Map(registros.map((r) => [r.id, r]));
    for (const inicial of registros) {
        let atual = inicial;
        const visita = new Set();
        while (atual) {
            if (visita.has(atual.id))
                break; // guarda de ciclo
            visita.add(atual.id);
            const origemId = String(atual.caso_origem || '') || String(atual.expand?.caso_origem?.id || '');
            if (!origemId)
                return atual; // chegou à raiz
            const prox = porId.get(origemId);
            if (!prox)
                break; // raiz fora do conjunto carregado
            atual = prox;
        }
    }
    return null;
}
/**
 * Identifica a movimentação VIGENTE do caso: a mais recente da cadeia pela
 * ORDEM EXPLÍCITA (raiz → … → última, via caso_origem/protocolo_anterior/
 * caso_continuacoes), NÃO por maior data. Desempate defensivo por dprotocolo →
 * dcalculo → created → id apenas entre vínculos paralelos sem ordem de cadeia.
 * Retorna null quando a raiz não está no conjunto carregado (dados incompletos:
 * não há como garantir qual é a vigente — nenhum registro do caso é usado).
 */
export function movimentacaoVigente(registros) {
    if (registros.length === 0)
        return null;
    const raiz = raizNoConjunto(registros);
    if (!raiz)
        return null;
    const porId = new Map(registros.map((r) => [r.id, r]));
    const visitados = new Set([raiz.id]);
    let vigente = raiz;
    let guard = 0;
    while (guard++ < 100) {
        const continuacoes = Array.isArray(vigente.caso_continuacoes)
            ? vigente.caso_continuacoes.filter(Boolean)
            : [];
        const candidatos = [];
        // Caso clássico (1ª continuação): a raiz aponta para a primeira via
        // caso_continuacoes; as seguintes se encadeiam por protocolo_anterior.
        for (const id of continuacoes) {
            const p = porId.get(id);
            if (p && !visitados.has(p.id))
                candidatos.push(p);
        }
        if (candidatos.length === 0) {
            // Fallback: algum registro carregado aponta de volta para o vigente
            // (caso_origem ou protocolo_anterior) — cobre cadeias sem caso_continuacoes.
            for (const r of registros) {
                if (visitados.has(r.id))
                    continue;
                const aponta = String(r.caso_origem || '') === vigente.id ||
                    String(r.protocolo_anterior || '') === vigente.id;
                if (aponta)
                    candidatos.push(r);
            }
        }
        if (candidatos.length === 0)
            break;
        // Desempate defensivo (vínculos paralelos): dprotocolo → dcalculo → created → id.
        candidatos.sort((a, b) => chaveData(a) < chaveData(b) ? -1 : chaveData(a) > chaveData(b) ? 1 : 0);
        const proximo = candidatos[candidatos.length - 1];
        if (!proximo)
            break;
        visitados.add(proximo.id);
        vigente = proximo;
    }
    return vigente;
}
/**
 * A movimentação vigente é OPORTUNIDADE FINANCEIRA ATIVA quando:
 *  - status ativo da projeção (não históricos: julgado, arquivado etc.);
 *  - sem decisão desfavorável (DECISOES_SEM_PROJECAO — 'Improcedente' ou
 *    'Extinto sem resolução do mérito');
 *  - não suspensa em R. Docs (Faltando Documentos — suspensão, não encerramento);
 *  - válida pelas regras atuais de validade/arquivamento de contratos
 *    (isProtocoloValido — fonte única src/lib/archivedStatuses.ts).
 * Sem valor da causa CONTINUA ativa (contribuição zero) — nunca se presume valor.
 */
export function isOportunidadeAtiva(p, contratosPorId) {
    if (!STATUS_ATIVOS_SET.has(p.status || ''))
        return false;
    if (DECISOES_SEM_PROJECAO_SET.has(String(p.decisao || '')))
        return false;
    if (p.status === STATUS_SUSPENSO_PROJECAO)
        return false;
    if (!isProtocoloValidoProjecao(p, contratosPorId))
        return false;
    return true;
}
/** Percentual do escritório preservado: com parceiro 15%, sem parceiro 30%. */
export function honorariosDoRegistro(p) {
    const valor = Number(p.valor) || 0;
    return valor * (p.parceiro ? 0.15 : 0.3);
}
/**
 * Calcula os 3 indicadores financeiros por CASO, sobre a movimentação VIGENTE
 * de cada cadeia. Cada caso elegível contribui com NO MÁXIMO UMA ação.
 * `contratosFechados` alimenta apenas a leitura de validade (nada é gravado).
 */
export function calcularIndicadoresFinanceiros(protocolos, contratosFechados) {
    const contratosPorId = new Map((contratosFechados || []).map((c) => [c.id, c]));
    const { porGrupo } = agruparCasos(protocolos);
    let projHonorarios = 0;
    let acoesNaProjecao = 0;
    let casosSemValor = 0;
    let casosDecisaoDesfavoravel = 0;
    let casosSuspensos = 0;
    for (const registros of porGrupo.values()) {
        // Registros excluídos da base por contrato arquivado não podem se tornar a
        // vigente de referência financeira (regra atual de validade preservada).
        const validos = registros.filter((r) => isProtocoloValidoProjecao(r, contratosPorId));
        if (validos.length === 0)
            continue;
        const vigente = movimentacaoVigente(validos);
        if (!vigente)
            continue; // dados incompletos: nenhum registro do caso é usado
        // R. Docs (suspensão) e decisão desfavorável são checadas ANTES do status
        // ativo: 'R. Docs' não está em STATUS_ATIVOS_PROJECAO, mas deve ser
        // contabilizado como caso suspenso (não como caso encerrado/genérico).
        if (vigente.status === STATUS_SUSPENSO_PROJECAO) {
            casosSuspensos += 1; // R. Docs: suspensão — sem oportunidade ativa enquanto durar
            continue;
        }
        if (!STATUS_ATIVOS_SET.has(vigente.status || ''))
            continue;
        if (DECISOES_SEM_PROJECAO_SET.has(String(vigente.decisao || ''))) {
            casosDecisaoDesfavoravel += 1;
            continue;
        }
        if (!isOportunidadeAtiva(vigente, contratosPorId))
            continue;
        acoesNaProjecao += 1;
        const valor = Number(vigente.valor) || 0;
        if (valor > 0) {
            projHonorarios += honorariosDoRegistro(vigente);
        }
        else {
            casosSemValor += 1; // ação ativa com contribuição financeira zero
        }
    }
    const ticketMedio = acoesNaProjecao > 0 ? projHonorarios / acoesNaProjecao : 0;
    return {
        projHonorarios,
        acoesNaProjecao,
        ticketMedio,
        casosSemValor,
        casosDecisaoDesfavoravel,
        casosSuspensos,
    };
}
