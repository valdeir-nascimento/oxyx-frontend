import { FarmStatus } from './status';

/**
 * Setor na lista, como o backend o devolve (`SectorSummary`): um galpão, uma espécie ou um lote, com
 * os totais das gaiolas ativas dele.
 */
export interface SectorSummary {
  readonly id: string;
  readonly name: string;
  /** Ausente quando o setor não tem descrição. */
  readonly description?: string;
  readonly status: FarmStatus;
  /** Quantidade de gaiolas ativas. */
  readonly activeCageCount: number;
  /** Soma das aves das gaiolas ativas. */
  readonly birdCount: number;
}

/**
 * Setor no detalhe e na edição: o resumo, mais as baterias que as gaiolas dele usam e os instantes do
 * cadastro e da última alteração.
 */
export interface Sector extends SectorSummary {
  /** As baterias das gaiolas do setor, ativas ou inativas, em ordem: é o filtro da lista de gaiolas. */
  readonly batteries: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Cadastro ou edição de setor, como o formulário o envia.
 *
 * Os campos vão como foram digitados: quem valida — e devolve todas as falhas de uma vez (FR-017) —
 * é o backend.
 */
export interface SectorInput {
  readonly name: string;
  readonly description: string;
}
