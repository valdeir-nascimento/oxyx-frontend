import { ReferenceWeight } from './sector';
import { FarmStatus } from './status';
import { WeighingStanding } from './weighing-schedule';

/** Quem fez a operação, como estava na sessão. */
export interface Actor {
  readonly id: string;
  readonly name: string;
}

/**
 * Uma pesagem válida da gaiola, como o backend a devolve (`Weighing`, feature 005): o peso médio de uma
 * amostra de aves num dia, em gramas.
 */
export interface Weighing {
  readonly id: string;
  /** O dia da pesagem, em ISO ("2026-09-24"). */
  readonly weighedOn: string;
  /** Gramas, com uma casa. */
  readonly averageWeight: number;
  readonly recordedBy: Actor;
  readonly recordedAt: string;
  /** Ausentes sem correção. */
  readonly lastCorrectedBy?: Actor;
  readonly lastCorrectedAt?: string;
}

/** Uma pesagem no histórico, com a variação sobre a anterior. */
export interface WeighingHistoryEntry {
  readonly id: string;
  readonly weighedOn: string;
  readonly averageWeight: number;
  /** Gramas sobre a pesagem anterior; ausente na primeira. Vem pronta do backend (R-008 da 005). */
  readonly change?: number;
  readonly recordedBy: Actor;
  readonly lastCorrectedBy?: Actor;
}

/** A gaiola pesada. */
export interface WeighedCage {
  readonly id: string;
  /** Bateria, hífen e número com ao menos dois dígitos ("A-01"). */
  readonly code: string;
  readonly battery: string;
  readonly number: number;
  readonly birdCount: number;
  readonly status: FarmStatus;
}

/** O setor da gaiola pesada. */
export interface WeighedSector {
  readonly id: string;
  readonly name: string;
  readonly status: FarmStatus;
  /** A faixa de peso de referência; ausente sem faixa. */
  readonly referenceWeight?: ReferenceWeight;
}

/** A última pesagem diante da faixa do setor, com os limites incluídos. */
export type WeightRangeStatus = 'WITHIN' | 'OUTSIDE' | 'NO_RANGE';

/** Um ponto do gráfico: o dia e o peso médio, em gramas. */
export interface WeighingPoint {
  readonly weighedOn: string;
  readonly averageWeight: number;
}

/**
 * O acompanhamento do peso de uma gaiola, para a tela Peso médio: uma leitura só, com as contas feitas pelo
 * backend (R-008 da 005). A tela não calcula nada.
 */
export interface WeighingOverview {
  readonly cage: WeighedCage;
  readonly sector: WeighedSector;
  /** A última pesagem válida; ausente sem pesagem. */
  readonly latest?: {
    readonly id: string;
    readonly weighedOn: string;
    readonly averageWeight: number;
  };
  /** A última menos a pesagem mais recente feita até 28 dias antes dela; ausente sem ela. */
  readonly fourWeekChange?: { readonly change: number; readonly since: string };
  /** A última pesagem diante da faixa do setor; ausente sem pesagem. */
  readonly rangeStatus?: WeightRangeStatus;
  /** As últimas 12 pesagens, da mais antiga para a mais recente. */
  readonly chart: readonly WeighingPoint[];
  /** Da mais recente para a mais antiga. */
  readonly history: readonly WeighingHistoryEntry[];
  /** A situação na agenda de pesagem, com a próxima pesagem; ausente na gaiola ou no setor inativo (010). */
  readonly schedule?: WeighingStanding;
}

/**
 * Registro ou correção de pesagem, como o formulário a envia: tudo como foi digitado, o peso com a
 * vírgula. Quem valida, e devolve todas as falhas de uma vez, é o backend (FR-014 da 005).
 */
export interface WeighingInput {
  readonly weighedOn: string;
  readonly averageWeight: string;
}
