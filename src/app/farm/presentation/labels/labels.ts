import { SegmentOption } from '../../../shared/presentation/ui/segmented-control/segmented-control';
import { StatusBadgeTone } from '../../../shared/presentation/ui/status-badge/status-badge';
import { FarmStatus } from '../../domain/status';

/** A situação de um setor, no masculino: "setor ativo". */
export function sectorStatusLabelOf(status: FarmStatus): string {
  return status === 'ACTIVE' ? 'Ativo' : 'Inativo';
}

/** A situação de uma gaiola, no feminino: "gaiola ativa". */
export function cageStatusLabelOf(status: FarmStatus): string {
  return status === 'ACTIVE' ? 'Ativa' : 'Inativa';
}

/** A situação de uma fórmula concorda como a da gaiola: "fórmula ativa". */
export const formulaStatusLabelOf = cageStatusLabelOf;

/** O tom do selo de situação: ativo em verde, inativo neutro. */
export function statusToneOf(status: FarmStatus): StatusBadgeTone {
  return status === 'ACTIVE' ? 'success' : 'neutral';
}

/** O filtro de situação da lista de setores; os ativos vêm primeiro, porque são o padrão (FR-005). */
export const SECTOR_STATUS_OPTIONS: readonly SegmentOption[] = [
  { value: 'ACTIVE', label: 'Ativos' },
  { value: 'INACTIVE', label: 'Inativos' },
  { value: 'ALL', label: 'Todos' },
];

/** O filtro de situação da lista de gaiolas; as ativas vêm primeiro, porque são o padrão. */
export const CAGE_STATUS_OPTIONS: readonly SegmentOption[] = [
  { value: 'ACTIVE', label: 'Ativas' },
  { value: 'INACTIVE', label: 'Inativas' },
  { value: 'ALL', label: 'Todas' },
];

/** O filtro de situação da lista de fórmulas, no feminino como o das gaiolas; as ativas primeiro. */
export const FORMULA_STATUS_OPTIONS: readonly SegmentOption[] = CAGE_STATUS_OPTIONS;

/**
 * Um valor em reais, com as casas pedidas: "R$ 2,85", ou "R$ 0,080" para o custo por ave ao dia (R-007 da
 * 004). É exibição: o valor vem pronto do backend.
 */
export function moneyOf(value: number, decimals = 2): string {
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

/** Um número inteiro como a granja o lê: com o ponto dos milhares. */
export function countOf(value: number): string {
  return value.toLocaleString('pt-BR');
}

/** A meta de produtividade do setor, com a casa decimal só quando houver: "72%", "82,5%" (feature 008). */
export function targetOf(percent: number): string {
  return `${targetInputOf(percent)}%`;
}

/** A meta como o campo do formulário a mostra, com vírgula e sem o "%": "72", "82,5" (feature 008). */
export function targetInputOf(percent: number): string {
  return percent.toLocaleString('pt-BR', { maximumFractionDigits: 1, useGrouping: false });
}

/** O dia no formato brasileiro, a partir do ISO: "2026-09-24" vira "24/09/2026". */
export function dayOf(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

/** Um peso em gramas, com a casa decimal só quando houver: "158 g", "158,4 g" (R-007 da 005). */
export function weightOf(grams: number): string {
  return `${grams.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} g`;
}

/**
 * Uma variação de peso, com o sinal sempre escrito: "+3 g", "−1,5 g", com o sinal de menos tipográfico, e
 * "0 g" sem sinal. É exibição: a variação vem pronta do backend (R-008 da 005).
 */
export function changeOf(grams: number): string {
  const sign = grams > 0 ? '+' : grams < 0 ? '−' : '';
  return `${sign}${weightOf(Math.abs(grams))}`;
}
