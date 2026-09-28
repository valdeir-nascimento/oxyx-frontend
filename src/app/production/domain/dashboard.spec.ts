import { Indicator, TodayReport, isComplete, verdictOf } from './dashboard';

/**
 * As regras do painel no cliente (feature 006): o relatório de hoje completo (FR-004, FR-018) e o veredito da
 * variação de um indicador pelo sentido bom dele (FR-006). As contas vêm prontas do backend; aqui só se lê.
 */
describe('dashboard domain', () => {
  const complete: TodayReport = {
    id: '6b1d3f5a-7c9e-4a2b-8d4f-1e3a5c7b9d55',
    productionStatus: 'COMPLETE',
    feedStatus: 'COMPLETE',
    mortalityStatus: 'RECORDED',
  };

  it('takes the report of today as complete with the production, the feed and the mortality recorded', () => {
    expect(isComplete(complete)).toBe(true);
  });

  it.each([
    ['the production', { productionStatus: 'PENDING' }],
    ['the feed', { feedStatus: 'PENDING' }],
    ['the mortality', { mortalityStatus: 'PENDING' }],
  ] as const)('takes the report of today as not complete with %s pending', (_, pending) => {
    expect(isComplete({ ...complete, ...pending })).toBe(false);
  });

  function indicator(
    change: number | undefined,
    goodDirection: Indicator['goodDirection'],
  ): Indicator {
    return { value: 100, previous: 90, change, goodDirection, incompleteDays: 0 };
  }

  it.each([
    [2.4, 'UP', 'good'],
    [-2.4, 'UP', 'bad'],
    [1.5, 'DOWN', 'bad'],
    [-1.1, 'DOWN', 'good'],
    [0, 'UP', 'flat'],
    [undefined, 'DOWN', 'flat'],
  ] as const)(
    'judges a change of %s with the good direction %s as %s',
    (change, direction, expected) => {
      expect(verdictOf(indicator(change, direction))).toBe(expected);
    },
  );
});
