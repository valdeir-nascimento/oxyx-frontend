import { percentOf } from './daily-report';

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
