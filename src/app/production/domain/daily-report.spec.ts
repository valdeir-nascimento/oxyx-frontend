import { monthToDateOf, percentOf } from './daily-report';

/** As porcentagens vêm prontas da API, com duas casas; a tela só as escreve em português. */
describe('percentOf', () => {
  it('writes the laying rate with one decimal, in Portuguese', () => {
    expect(percentOf(90.82, 1)).toBe('90,8%');
  });

  it('writes the removal rate with two decimals', () => {
    expect(percentOf(2.04, 2)).toBe('2,04%');
  });

  it('writes zero with the decimals asked for', () => {
    expect(percentOf(0, 2)).toBe('0,00%');
  });
});

/** O intervalo que a exportação dos relatórios sugere (R-015 da 007): o fechamento do mês até hoje. */
describe('monthToDateOf', () => {
  it('goes from the first day of the month to today', () => {
    expect(monthToDateOf('2026-09-28')).toEqual({ from: '2026-09-01', to: '2026-09-28' });
  });

  it('is a single day on the first day of the month', () => {
    expect(monthToDateOf('2026-02-01')).toEqual({ from: '2026-02-01', to: '2026-02-01' });
  });
});
