/**
 * AUTORIZAÇÃO — CONTRACHEQUES (Build C1)
 * ============================================================
 * Acesso EXCLUSIVO à conta escritorio@advocaciagasparotto.com.br.
 * Identidade usada: ID INTERNO ESTÁVEL da coleção users (yxubawrt8aser8k,
 * confirmado ao vivo em 26/11/2026) — NÃO é a condição genérica "perfil
 * gestor", que deixaria outros gestores (Nataly, Dr. Caio) entrar.
 *
 * O ID é verificado em PRIMEIRO lugar; o e-mail é um fallback redundante para
 * o caso improvável de o registro ser recriado (o ID mudaria, o e-mail não).
 * Este módulo é usado no FRONTEND (aba e rota); no BACKEND a mesma dupla
 * identidade está nas 5 regras de API da collection cc_salarios (migration
 * 0110). Qualquer divergência futura entre frontend e backend falha FECHADO.
 */

/** ID interno estável da conta autorizada (coleção users). */
export const CC_USUARIO_AUTORIZADO_ID = 'yxubawrt8aser8k'

/** E-mail da conta autorizada (fallback de identidade). */
export const CC_USUARIO_AUTORIZADO_EMAIL = 'escritorio@advocaciagasparotto.com.br'

/**
 * Verdict de acesso: só 'autorizado' exibe a aba; 'nao_autorizado' nega;
 * 'desconhecido' (ainda carregando auth) também NÃO libera nada.
 */
export type VereditoContracheques = 'autorizado' | 'nao_autorizado' | 'desconhecido'

/** A conta autenticada atual corresponde ao usuário autorizado? */
export function verificarAcessoContracheques(
  auth:
    | {
        id?: string
        email?: string
      }
    | null
    | undefined,
): VereditoContracheques {
  if (!auth || !auth.id) return 'desconhecido'
  if (auth.id === CC_USUARIO_AUTORIZADO_ID) return 'autorizado'
  if (auth.email && auth.email.toLowerCase() === CC_USUARIO_AUTORIZADO_EMAIL) return 'autorizado'
  return 'nao_autorizado'
}
