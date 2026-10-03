import { FarmStatus, StatusFilter } from './status';
import { WeighingPoint } from './weighing';
import { WeighingFilter, WeighingStanding } from './weighing-schedule';

/** Gaiola na lista, como o backend a devolve (`CageSummary`). */
export interface CageSummary {
  readonly id: string;
  readonly sectorId: string;
  /** A bateria, um hífen e o número com pelo menos dois dígitos: "B-07". */
  readonly code: string;
  readonly battery: string;
  readonly number: number;
  readonly birdCount: number;
  readonly status: FarmStatus;
  /** A última pesagem válida da gaiola; ausente sem pesagem (feature 005). */
  readonly lastWeighing?: WeighingPoint;
  /** A situação na agenda de pesagem; ausente na gaiola inativa e em setor inativo (feature 010). */
  readonly weighing?: WeighingStanding;
}

/** Gaiola no detalhe e na edição: o resumo, mais os instantes do cadastro e da última alteração. */
export interface Cage extends CageSummary {
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Uma página da pesquisa de gaiolas, com os totais de todas as páginas. */
export interface CagePage {
  readonly content: readonly CageSummary[];
  readonly page: number;
  readonly size: number;
  readonly totalElements: number;
  readonly totalPages: number;
}

/**
 * Os filtros da lista que a exportação das gaiolas leva (007): a busca, a bateria, a situação e a pesagem
 * pendente (010), sem página.
 */
export interface CageExport {
  readonly code: string;
  readonly battery: string;
  readonly status: StatusFilter;
  readonly weighing?: WeighingFilter;
}

/** O que a pessoa pede na lista: trecho do código, bateria, situação e página. */
export interface CageSearch {
  readonly code?: string;
  readonly battery?: string;
  readonly status: StatusFilter;
  /** Só as gaiolas ativas que faltam pesar (feature 010); ausente, todas. */
  readonly weighing?: WeighingFilter;
  readonly page: number;
  readonly size: number;
}

/**
 * Cadastro ou edição de gaiola, como o formulário a envia: os três campos como foram digitados. Quem
 * valida — e devolve todas as falhas de uma vez, inclusive o número que não é inteiro (FR-017) — é o
 * backend.
 */
export interface CageInput {
  readonly battery: string;
  readonly number: string;
  readonly birdCount: string;
}

/**
 * O código da gaiola: a bateria, um hífen e o número com pelo menos dois dígitos (FR-008). É o que a
 * tela mostra antes da resposta da API, como no título do diálogo de edição.
 */
export function cageCodeOf(battery: string, number: number): string {
  return `${battery}-${String(number).padStart(2, '0')}`;
}
