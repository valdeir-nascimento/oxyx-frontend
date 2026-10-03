import { SegmentOption } from '../../../shared/presentation/ui/segmented-control/segmented-control';
import { SelectOption } from '../../../shared/presentation/ui/select-field/select-field';
import { StatusBadgeTone } from '../../../shared/presentation/ui/status-badge/status-badge';
import { FarmStatus } from '../../domain/status';
import { WeighingDay, WeighingSituation, WeighingStanding } from '../../domain/weighing-schedule';

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

/** Os dias da semana na ordem da semana da granja, de segunda a domingo (feature 010). */
const WEEK: readonly { day: WeighingDay; name: string; plural: string }[] = [
  { day: 'MONDAY', name: 'Segunda-feira', plural: 'às segundas' },
  { day: 'TUESDAY', name: 'Terça-feira', plural: 'às terças' },
  { day: 'WEDNESDAY', name: 'Quarta-feira', plural: 'às quartas' },
  { day: 'THURSDAY', name: 'Quinta-feira', plural: 'às quintas' },
  { day: 'FRIDAY', name: 'Sexta-feira', plural: 'às sextas' },
  { day: 'SATURDAY', name: 'Sábado', plural: 'aos sábados' },
  { day: 'SUNDAY', name: 'Domingo', plural: 'aos domingos' },
];

/** As escolhas do dia da pesagem no cadastro do setor: "sem dia fixo" primeiro, depois a semana (feature 010). */
export const WEIGHING_DAY_OPTIONS: readonly SelectOption[] = [
  { value: '', label: 'Sem dia fixo (a cada 7 dias)' },
  ...WEEK.map(({ day, name }) => ({ value: day, label: name })),
];

/** O dia da pesagem do setor como o cartão o escreve: "Pesagem às sextas", ou o prazo de 7 dias sem dia. */
export function weighingDayLabelOf(day: WeighingDay | undefined): string {
  const found = WEEK.find((entry) => entry.day === day);
  return found ? `Pesagem ${found.plural}` : 'Pesagem a cada 7 dias';
}

/** O filtro de pesagem da lista de gaiolas: todas, ou só as que faltam pesar (feature 010). */
export const WEIGHING_FILTER_OPTIONS: readonly SegmentOption[] = [
  { value: '', label: 'Todas' },
  { value: 'PENDING', label: 'Pesagem pendente' },
];

/** Os dias da semana pela ordem do `getUTCDay`, de domingo a sábado, como a granja os escreve. */
const WEEKDAY_NAMES = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];

/** O dia e o mês, a partir do ISO: "2026-09-25" vira "25/09". */
function dayAndMonthOf(isoDate: string): string {
  const [, month, day] = isoDate.split('-');
  return `${day}/${month}`;
}

/** O dia da semana e o dia, a partir do ISO, sem depender do fuso de quem vê: "sexta-feira, 25/09". */
function weekdayOf(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return `${WEEKDAY_NAMES[new Date(Date.UTC(year, month - 1, day)).getUTCDay()]}, ${dayAndMonthOf(isoDate)}`;
}

/** A situação de uma gaiola na agenda de pesagem, como a lista a escreve: "Atrasada desde 25/09" (010). */
export function weighingStandingLabelOf(standing: WeighingStanding | undefined): string {
  switch (standing?.situation) {
    case 'UP_TO_DATE':
      return 'Em dia';
    case 'DUE_TODAY':
      return 'Pesar hoje';
    case 'LATE':
      return `Atrasada desde ${dayAndMonthOf(standing.lateSince ?? '')}`;
    case 'NEVER_WEIGHED':
      return 'Nunca pesada';
    default:
      return '';
  }
}

/** O tom do selo da situação na agenda: em dia é sucesso; pesar hoje, informação; atrasada, atenção. */
export function weighingStandingToneOf(situation: WeighingSituation): StatusBadgeTone {
  const tones: Readonly<Record<WeighingSituation, StatusBadgeTone>> = {
    UP_TO_DATE: 'success',
    DUE_TODAY: 'info',
    LATE: 'warning',
    NEVER_WEIGHED: 'neutral',
  };
  return tones[situation];
}

/** A próxima pesagem da gaiola, como a tela Peso médio a escreve (FR-015 da 010); nada sem agenda. */
export function nextWeighingTextOf(schedule: WeighingStanding | undefined): string {
  switch (schedule?.situation) {
    case 'UP_TO_DATE':
      return `Próxima pesagem: ${weekdayOf(schedule.nextOn ?? '')}`;
    case 'DUE_TODAY':
      return 'Pesar hoje';
    case 'LATE':
      return `Pesagem atrasada desde ${weekdayOf(schedule.lateSince ?? '')}`;
    case 'NEVER_WEIGHED':
      return 'Nunca pesada';
    default:
      return '';
  }
}
