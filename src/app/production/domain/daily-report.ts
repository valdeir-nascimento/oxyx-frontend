/** Situação do setor do relatório: num setor inativo, os relatórios só consultam (FR-020). */
export type ReportingSectorStatus = 'ACTIVE' | 'INACTIVE';

/** `COMPLETE` quando toda gaiola do relatório tem a produção lançada. */
export type ProductionStatus = 'COMPLETE' | 'PENDING';

/** `RECORDED` quando há morte ou descarte lançado, ou a confirmação de dia sem ocorrência. */
export type MortalityStatus = 'RECORDED' | 'PENDING';

/** O setor do relatório, como a tela precisa dele. */
export interface ReportingSector {
  readonly id: string;
  readonly name: string;
  readonly status: ReportingSectorStatus;
}

/** Quem fez uma operação, como estava na sessão. */
export interface Actor {
  readonly id: string;
  readonly name: string;
}

/** O relatório na lista do setor. */
export interface DailyReportSummary {
  readonly id: string;
  /** `AAAA-MM-DD`, o dia da granja. */
  readonly collectionDate: string;
  /** `HH:mm`. */
  readonly collectionTime: string;
  readonly openedByName: string;
  readonly flockAge: number;
  readonly collectedEggs: number;
  readonly removedBirds: number;
  readonly closingBirdCount: number;
  /** Ausente quando não há observação. */
  readonly note?: string;
  readonly productionStatus: ProductionStatus;
  readonly pendingCages: number;
  readonly mortalityStatus: MortalityStatus;
}

/** Uma página dos relatórios do setor, com o setor junto. */
export interface DailyReportPage {
  readonly sector: ReportingSector;
  readonly content: readonly DailyReportSummary[];
  readonly page: number;
  readonly size: number;
  readonly totalElements: number;
  readonly totalPages: number;
}

/** O que a lista pede: a página e, se houver, o dia. */
export interface DailyReportSearch {
  readonly collectionDate?: string;
  readonly page: number;
  readonly size: number;
}

/** Valores sugeridos para o relatório novo; sem relatório anterior, a idade não vem. */
export interface DailyReportSuggestion {
  readonly collectionDate: string;
  readonly collectionTime: string;
  readonly openingBirdCount: number;
  readonly flockAge?: number;
}

/**
 * Abertura ou correção dos dados gerais, como o formulário as envia: os campos vão como foram
 * digitados, e quem valida — e devolve todas as falhas de uma vez (FR-018) — é o backend.
 */
export interface DailyReportInput {
  readonly collectionDate: string;
  readonly collectionTime: string;
  readonly openingBirdCount: string;
  readonly flockAge: string;
  readonly note: string;
}

/**
 * Lançamento ou correção da produção de uma gaiola, como o formulário o envia: os campos como foram
 * digitados; classificação em branco vale zero, e quem valida é o backend.
 */
export interface ProductionInput {
  readonly eggs: string;
  readonly small: string;
  readonly jumbo: string;
  readonly dirty: string;
  readonly cracked: string;
  readonly bloodSpot: string;
  readonly abnormal: string;
}

/**
 * Lançamento ou correção da mortalidade de uma gaiola, como o formulário o envia: os campos como foram
 * digitados; mortes e descartes em branco valem zero, e quem valida é o backend.
 */
export interface MortalityInput {
  readonly deaths: string;
  readonly culls: string;
  readonly note: string;
}

/** A produção lançada numa gaiola. */
export interface CageProduction {
  readonly eggs: number;
  readonly small: number;
  readonly jumbo: number;
  readonly dirty: number;
  readonly cracked: number;
  readonly bloodSpot: number;
  readonly abnormal: number;
}

/** A mortalidade lançada numa gaiola. */
export interface CageMortality {
  readonly deaths: number;
  readonly culls: number;
  readonly note?: string;
}

/** Uma gaiola do relatório, como estava na abertura, com os lançamentos que tiver. */
export interface ReportCage {
  readonly cageId: string;
  readonly code: string;
  readonly battery: string;
  readonly number: number;
  readonly birdCount: number;
  readonly production?: CageProduction;
  readonly mortality?: CageMortality;
}

/** Os totais de produção do dia; a produtividade vem em porcentagem, com duas casas. */
export interface ProductionTotals {
  readonly status: ProductionStatus;
  readonly pendingCages: number;
  readonly collectedEggs: number;
  readonly standardEggs: number;
  readonly unsellableEggs: number;
  readonly layingRate: number;
}

/** Os totais de mortalidade do dia; a taxa vem em porcentagem, com duas casas. */
export interface MortalityTotals {
  readonly status: MortalityStatus;
  readonly deaths: number;
  readonly culls: number;
  readonly removalRate: number;
  readonly closingBirdCount: number;
}

/** O relatório com as gaiolas, os lançamentos e os totais do dia. */
export interface DailyReport {
  readonly id: string;
  readonly sector: ReportingSector;
  readonly collectionDate: string;
  readonly collectionTime: string;
  readonly openingBirdCount: number;
  readonly flockAge: number;
  readonly note?: string;
  readonly noMortalityConfirmed: boolean;
  readonly openedBy: Actor;
  readonly openedAt: string;
  readonly lastCorrectedBy?: Actor;
  readonly lastCorrectedAt?: string;
  readonly production: ProductionTotals;
  readonly mortality: MortalityTotals;
  readonly cages: readonly ReportCage[];
}

/**
 * Uma porcentagem da API, escrita em português ("90,8%", "0,13%"). É exibição, e não cálculo: os
 * totais vêm prontos do backend (R-008).
 */
export function percentOf(value: number, decimals: number): string {
  const text = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
  return `${text}%`;
}
