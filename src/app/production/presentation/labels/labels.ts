import { FeedStatus, MortalityStatus, ProductionStatus } from '../../domain/daily-report';

/** Os dias da semana abreviados, como o protótipo os escreve ("Qui, 24/09/2026"). */
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/** O dia de `AAAA-MM-DD` em português: "24/09/2026". Sem `Date`, para o fuso do navegador não mudar o dia. */
export function dayOf(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

/** O dia com a semana: "Qui, 24/09/2026". */
export function dayWithWeekdayOf(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return `${WEEKDAYS[weekday]}, ${dayOf(isoDate)}`;
}

/**
 * O fuso da granja, o mesmo padrão do backend (`ovyx.farm.time-zone`, R-006 da 003 e R-004 da 005): os instantes da API
 * — quando o relatório foi corrigido — aparecem na hora da granja, e não na do navegador.
 */
export const FARM_TIME_ZONE = 'America/Sao_Paulo';

/** Um instante da API na data e na hora da granja: "24/09/2026, 08:05". */
export function dateTimeAtTheFarmOf(instant: string): string {
  const parts = new Intl.DateTimeFormat('pt-BR', {
    timeZone: FARM_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(instant));
  const part = (type: Intl.DateTimeFormatPartTypes): string => parts.find((each) => each.type === type)?.value ?? '';
  return `${part('day')}/${part('month')}/${part('year')}, ${part('hour')}:${part('minute')}`;
}

/** Uma contagem com ponto de milhar: "2.400". */
export function countOf(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value);
}

/** A situação da produção, no texto da etiqueta, com as gaiolas que faltam. */
export function productionLabelOf(status: ProductionStatus, pendingCages: number): string {
  if (status === 'COMPLETE') {
    return 'Produção completa';
  }
  return pendingCages === 1 ? 'Produção: falta 1 gaiola' : `Produção: faltam ${countOf(pendingCages)} gaiolas`;
}

/** A situação da ração, no texto da etiqueta (feature 004). */
export function feedLabelOf(status: FeedStatus): string {
  return status === 'COMPLETE' ? 'Ração lançada' : 'Ração pendente';
}

/** Um número com as casas pedidas, em português: "2,85", "28,0". */
function decimalOf(value: number, decimals: number): string {
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(
    value,
  );
}

/** Um valor em reais, com as casas pedidas: "R$ 7,82", ou "R$ 0,088" para o custo por ovo (R-007 da 004). */
export function moneyOf(value: number, decimals = 2): string {
  return `R$ ${decimalOf(value, decimals)}`;
}

/** Gramas, inteiras ou com as casas pedidas: "1.344 g", "28,0 g". */
export function gramsOf(value: number, decimals = 0): string {
  return `${decimalOf(value, decimals)} g`;
}

/** O desvio do consumo sobre o esperado, com o sinal e uma casa: "+3,1%", "−10,7%" (R-007 da 004). */
export function deviationOf(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${decimalOf(Math.abs(value), 1)}%`;
}

/** Gramas escritas em quilos, com uma casa: 2.744 g são "2,7 kg". É só a unidade: o total vem do backend. */
export function kilogramsOf(grams: number): string {
  return `${decimalOf(grams / 1000, 1)} kg`;
}

/** A situação da mortalidade, no texto da etiqueta. */
export function mortalityLabelOf(status: MortalityStatus): string {
  return status === 'RECORDED' ? 'Mortalidade lançada' : 'Mortalidade pendente';
}

/** A idade do lote, concordando com o número: "1 semana", "20 semanas". */
export function weeksOf(weeks: number): string {
  return weeks === 1 ? '1 semana' : `${countOf(weeks)} semanas`;
}

/** O que a tela diz quando o endereço não leva a nada, pelo código da recusa. */
const NOT_FOUND_MESSAGES: Readonly<Record<string, string>> = {
  SECTOR_NOT_FOUND: 'Setor não encontrado.',
  DAILY_REPORT_NOT_FOUND: 'Relatório não encontrado.',
  CAGE_NOT_FOUND: 'Gaiola não encontrada neste relatório.',
};

/** A mensagem do primeiro "não encontrado" da recusa, ou nenhuma quando a recusa é outra. */
export function notFoundMessageOf(errors: readonly { readonly code: string }[]): string | undefined {
  return errors.map((error) => NOT_FOUND_MESSAGES[error.code]).find((message) => message !== undefined);
}

/** O aviso do setor inativo, igual na lista e na página do relatório. */
export const INACTIVE_SECTOR_NOTICE = 'O setor está inativo: os relatórios dele são só para consulta.';
