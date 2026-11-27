/** Extrai a parte civil (YYYY-MM-DD) de uma data PocketBase. */
const dataYMD = (valor) => !valor ? '' : String(valor).slice(0, 10).replace(/T.*$/, '');
const HOJE = '2026-11-26'; // data do build — espelha hojeYMD() do hook
/** Validações de COMPATIBILIDADE de uma única vigência (espelha o hook). */
export function validarVigenciaIsolada(v) {
    const inicio = dataYMD(v.vigencia_inicio);
    const fim = dataYMD(v.vigencia_fim);
    if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(inicio)) {
        return 'Vigência inicial inválida: informe uma data válida.';
    }
    if (fim !== '' && !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(fim)) {
        return 'Vigência final inválida: informe uma data válida ou deixe vazia.';
    }
    if (fim !== '' && fim < inicio) {
        return `Vigência incompatível: o fim (${fim}) não pode ser anterior ao início (${inicio}).`;
    }
    if (inicio > HOJE) {
        return `A vigência inicial não pode ser uma data futura (${inicio}). Salários retroativos são permitidos; futuros, não.`;
    }
    return null;
}
/**
 * Espelho do teste de sobreposição do hook cc_salarios (datas inclusivas;
 * vigência sem fim = aberta até 9999-12-31). Recebe as vigências JÁ
 * gravadas do funcionário + a candidata; devolve null se aceita.
 */
export function validarSobreposicao(vigenciasExistentes, candidata) {
    const inicio = dataYMD(candidata.vigencia_inicio);
    const fim = dataYMD(candidata.vigencia_fim);
    const fimA = fim === '' ? '9999-12-31' : fim;
    for (const outra of vigenciasExistentes) {
        if (outra.id === candidata.id)
            continue; // o hook exclui o próprio id
        const outraInicio = dataYMD(outra.vigencia_inicio);
        const outraFim = dataYMD(outra.vigencia_fim);
        const fimB = outraFim === '' ? '9999-12-31' : outraFim;
        if (inicio <= fimB && outraInicio <= fimA) {
            return `Conflito de vigência: já existe salário vigente no período (${outraInicio} a ${outraFim === '' ? 'em vigor' : outraFim}).`;
        }
    }
    return null;
}
/** Restrição de histórico imutável do hook (update em vigência já iniciada). */
export function validarUpdateHistorico(original, candidata) {
    const inicioOriginal = dataYMD(original.vigencia_inicio);
    const iniciada = inicioOriginal !== '' && inicioOriginal <= HOJE;
    if (!iniciada)
        return null;
    const fimOriginal = dataYMD(original.vigencia_fim);
    const fim = dataYMD(candidata.vigencia_fim);
    const mudouInicio = dataYMD(candidata.vigencia_inicio) !== inicioOriginal;
    const mudouValor = candidata.valor !== original.valor;
    const mudouFuncionario = candidata.funcionario !== original.funcionario;
    const fimAvancou = fim !== fimOriginal && (fimOriginal === '' || fim > fimOriginal);
    if (mudouInicio || mudouValor || mudouFuncionario || !fimAvancou) {
        return 'Esta vigência salarial já está em vigor (histórico imutável). Somente o ENCERRAMENTO (vigência fim) pode ser definido ou movido para frente. Para novo salário a partir de uma data, crie uma NOVA vigência.';
    }
    return null;
}
export function runCenariosContracheques() {
    const cenarios = [];
    const push = (cenario, detalhe, ok) => cenarios.push({ cenario, detalhe, ok });
    // CC-A — vigências subsequentes coexistem (encerrada na véspera da nova).
    {
        const existentes = [
            {
                id: 's1',
                funcionario: 'f1',
                valor: 2000,
                vigencia_inicio: '2026-01-01',
                vigencia_fim: '2026-05-31',
            },
        ];
        const nova = {
            id: 's2',
            funcionario: 'f1',
            valor: 2500,
            vigencia_inicio: '2026-06-01',
            vigencia_fim: '',
        };
        const err = validarVigenciaIsolada(nova) ?? validarSobreposicao(existentes, nova);
        push('CC-A vigências subsequentes OK (2026-01-01→2026-05-31 e 2026-06-01→em vigor)', err ? `recusada: ${err}` : 'aceita; salário anterior preservado no histórico', err === null);
    }
    // CC-B — sobreposição parcial é RECUSADA.
    {
        const existentes = [
            {
                id: 's1',
                funcionario: 'f1',
                valor: 2000,
                vigencia_inicio: '2026-01-01',
                vigencia_fim: '2026-05-31',
            },
        ];
        const nova = {
            id: 's2',
            funcionario: 'f1',
            valor: 2500,
            vigencia_inicio: '2026-05-15',
            vigencia_fim: '',
        };
        const err = validarSobreposicao(existentes, nova);
        push('CC-B sobreposição parcial recusada (novo início 2026-05-15 dentro de vigência até 2026-05-31)', err ? `recusada: ${err.slice(0, 60)}…` : 'ACEITA (não deveria!)', err !== null);
    }
    // CC-C — vigência aberta conflita com qualquer nova posterior.
    {
        const existentes = [
            { id: 's1', funcionario: 'f2', valor: 3000, vigencia_inicio: '2026-03-01', vigencia_fim: '' },
        ];
        const nova = {
            id: 's2',
            funcionario: 'f2',
            valor: 3500,
            vigencia_inicio: '2026-11-01',
            vigencia_fim: '',
        };
        const err = validarSobreposicao(existentes, nova);
        push('CC-C vigência aberta (sem fim) conflita com nova vigência posterior', err ? `recusada: ${err.slice(0, 60)}…` : 'ACEITA (não deveria!)', err !== null);
    }
    // CC-D — fim anterior ao início é RECUSADO (vigência incompatível).
    {
        const v = { vigencia_inicio: '2026-06-01', vigencia_fim: '2026-05-31' };
        const err = validarVigenciaIsolada(v);
        push('CC-D vigência incompatível recusada (fim 2026-05-31 < início 2026-06-01)', err ? `recusada: ${err.slice(0, 60)}…` : 'ACEITA (não deveria!)', err !== null);
    }
    // CC-E — histórico imutável: vigência em vigor só permite adiantar o fim.
    {
        const original = {
            id: 's1',
            funcionario: 'f3',
            valor: 2200,
            vigencia_inicio: '2026-04-01',
            vigencia_fim: '',
        };
        const mudandoValor = { ...original, valor: 2800 };
        const errValor = validarUpdateHistorico(original, mudandoValor);
        const encerrando = { ...original, vigencia_fim: '2026-11-30' };
        const errEncerrar = validarUpdateHistorico(original, encerrando);
        push('CC-E histórico imutável: alterar valor recusado; encerrar vigência (adiantar fim) permitido', `alterar valor: ${errValor ? 'recusado' : 'ACEITO (não deveria!)'}; encerrar: ${errEncerrar === null ? 'permitido' : 'recusado'}`, errValor !== null && errEncerrar === null);
    }
    // CC-F — mesmo funcionário, vigências em meses distintos sem sobreposição.
    {
        const existentes = [
            {
                id: 's1',
                funcionario: 'f4',
                valor: 1500,
                vigencia_inicio: '2026-08-01',
                vigencia_fim: '2026-08-31',
            },
        ];
        const nova = {
            id: 's2',
            funcionario: 'f4',
            valor: 1600,
            vigencia_inicio: '2026-09-01',
            vigencia_fim: '2026-09-30',
        };
        const err = validarSobreposicao(existentes, nova);
        push('CC-F mesmo funcionário, meses distintos (ago/2026 e set/2026) coexistem', err ? `recusada: ${err.slice(0, 60)}…` : 'aceita', err === null);
    }
    // CC-G — funcionários diferentes nunca conflitam.
    {
        const existentes = [
            { id: 's1', funcionario: 'f5', valor: 2000, vigencia_inicio: '2026-01-01', vigencia_fim: '' },
        ];
        const nova = {
            id: 's2',
            funcionario: 'f6',
            valor: 2000,
            vigencia_inicio: '2026-01-01',
            vigencia_fim: '',
        };
        const err = validarSobreposicao(existentes, nova);
        push('CC-G funcionários diferentes com vigência idêntica não conflitam', err ? `recusada: ${err.slice(0, 60)}…` : 'aceita', err === null);
    }
    return cenarios;
}
