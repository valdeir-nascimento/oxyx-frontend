/**
 * Situação de um setor ou de uma gaiola. Nada é apagado (FR-012): o que sai de uso fica inativo e
 * continua consultável.
 */
export type FarmStatus = 'ACTIVE' | 'INACTIVE';

/** Filtro de situação das listas: `ALL` traz ativos e inativos (FR-005, FR-010). */
export type StatusFilter = FarmStatus | 'ALL';
