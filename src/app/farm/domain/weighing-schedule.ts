/**
 * O dia da semana da pesagem das aves de um setor, como a API o escreve (feature 010). Sem ele, o setor
 * segue o prazo de 7 dias desde a última pesagem de cada gaiola.
 */
export type WeighingDay =
  'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

/**
 * A pesagem da semana de uma gaiola ativa (feature 010): em dia, a pesar hoje (é o dia da pesagem e falta a da
 * semana), atrasada (o dia passou sem ela, ou a última tem mais de 7 dias sem dia definido) ou nunca pesada.
 */
export type WeighingSituation = 'UP_TO_DATE' | 'DUE_TODAY' | 'LATE' | 'NEVER_WEIGHED';

/** A situação de uma gaiola ativa de setor ativo na agenda de pesagem, como o backend a calcula. */
export interface WeighingStanding {
  readonly situation: WeighingSituation;
  /** Só na atrasada: o último dia de pesagem que passou sem ela. */
  readonly lateSince?: string;
  /** Só na em dia: o próximo dia de pesagem. */
  readonly nextOn?: string;
}

/** O filtro de pesagem da lista de gaiolas: as gaiolas ativas que faltam pesar. */
export type WeighingFilter = 'PENDING';
