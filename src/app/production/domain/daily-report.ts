/** Situação do setor do relatório: num setor inativo, os relatórios só consultam (FR-020). */
export type ReportingSectorStatus = 'ACTIVE' | 'INACTIVE';

/** `COMPLETE` quando toda gaiola do relatório tem a produção lançada. */
export type ProductionStatus = 'COMPLETE' | 'PENDING';

/** `RECORDED` quando há morte ou descarte lançado, ou a confirmação de dia sem ocorrência. */
export type MortalityStatus = 'RECORDED' | 'PENDING';

/** `COMPLETE` quando toda gaiola do relatório tem a ração lançada (feature 004). */
export type FeedStatus = 'COMPLETE' | 'PENDING';

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
  readonly feedStatus: FeedStatus;
  /** Gaiolas ainda sem ração. */
  readonly feedPendingCages: number;
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

/**
 * Lançamento ou correção da ração de uma gaiola, como o formulário o envia (feature 004): a fórmula
 * escolhida e o consumo como foi digitado; quem valida, e devolve todas as falhas de uma vez, é o backend.
 */
export interface FeedInput {
  readonly formulaId: string;
  readonly consumption: string;
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

/**
 * A ração lançada numa gaiola (feature 004): a fórmula, com o nome atual e o preço e o esperado guardados
 * no lançamento, e os derivados, prontos do backend (R-007).
 */
export interface CageFeed {
  readonly formulaId: string;
  readonly formulaName: string;
  readonly pricePerKg: number;
  readonly expectedIntake: number;
  /** Gramas no dia. */
  readonly consumption: number;
  /** Em reais, com duas casas. */
  readonly cost: number;
  /** Gramas por ave, com uma casa; ausente com 0 aves. */
  readonly intakePerBird?: number;
  /** Porcentagem sobre o esperado, com uma casa; ausente com 0 aves. */
  readonly deviation?: number;
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
  readonly feed?: CageFeed;
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

/** Os totais de ração do dia, das gaiolas lançadas, prontos do backend (R-007 da 004). */
export interface FeedTotals {
  readonly status: FeedStatus;
  readonly pendingCages: number;
  /** Gramas. */
  readonly consumption: number;
  /** Em reais, com duas casas. */
  readonly cost: number;
  /** Em reais, com três casas; ausente sem ovo ou sem ração lançada. */
  readonly costPerEgg?: number;
  /** Gramas por ave, com uma casa; ausente sem aves. */
  readonly intakePerBird?: number;
  /** O esperado de cada fórmula pesado pelas aves, com uma casa; ausente sem aves. */
  readonly expectedIntakePerBird?: number;
}

/**
 * Uma fórmula que o lançamento de ração oferece, como o production precisa dela: o nome, o preço e o
 * consumo esperado atuais. O production não conhece o cadastro de fórmulas do farm (princípio I).
 */
export interface FeedFormulaOption {
  readonly id: string;
  readonly name: string;
  readonly pricePerKg: number;
  readonly expectedIntake: number;
}

/** A proposta da sugestão para uma gaiola sem ração. */
export interface SuggestedCageFeed {
  readonly cageId: string;
  readonly code: string;
  readonly birdCount: number;
  /** As aves vezes o consumo esperado, em gramas. */
  readonly consumption: number;
  readonly cost: number;
}

/** O que o lançamento pela sugestão gravaria: a proposta das gaiolas sem ração e os totais do dia com ela. */
export interface FeedSuggestion {
  readonly formula: FeedFormulaOption;
  readonly cages: readonly SuggestedCageFeed[];
  readonly totals: FeedTotals;
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
  readonly feed: FeedTotals;
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
