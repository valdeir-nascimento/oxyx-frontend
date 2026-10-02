import {
  nextWeighingTextOf,
  targetInputOf,
  targetOf,
  WEIGHING_DAY_OPTIONS,
  WEIGHING_FILTER_OPTIONS,
  weighingDayLabelOf,
  weighingStandingLabelOf,
  weighingStandingToneOf,
} from './labels';

/** A meta de produtividade do setor, na lista e no formulário (feature 008). */
describe('farm labels', () => {
  describe('targetOf', () => {
    it.each([
      [72, '72%'],
      [82.5, '82,5%'],
      [100, '100%'],
      [1, '1%'],
    ])('writes %s as %s, with the decimal only when there is one', (value, expected) => {
      expect(targetOf(value)).toBe(expected);
    });
  });

  describe('targetInputOf', () => {
    it.each([
      [72, '72'],
      [82.5, '82,5'],
      [100, '100'],
    ])('fills the field with %s as %s, with a comma', (value, expected) => {
      expect(targetInputOf(value)).toBe(expected);
    });
  });

  // ---------------------------------------------------------------- dia da pesagem (010)

  describe('weighingDayLabelOf', () => {
    it.each([
      ['MONDAY', 'Pesagem às segundas'],
      ['TUESDAY', 'Pesagem às terças'],
      ['WEDNESDAY', 'Pesagem às quartas'],
      ['THURSDAY', 'Pesagem às quintas'],
      ['FRIDAY', 'Pesagem às sextas'],
      ['SATURDAY', 'Pesagem aos sábados'],
      ['SUNDAY', 'Pesagem aos domingos'],
    ] as const)('writes %s as "%s"', (day, label) => {
      expect(weighingDayLabelOf(day)).toBe(label);
    });

    it('writes a sector without a weighing day as following the 7-day term', () => {
      expect(weighingDayLabelOf(undefined)).toBe('Pesagem a cada 7 dias');
    });
  });

  describe('WEIGHING_DAY_OPTIONS', () => {
    it('offers no fixed day first, then Monday to Sunday', () => {
      expect(WEIGHING_DAY_OPTIONS).toEqual([
        { value: '', label: 'Sem dia fixo (a cada 7 dias)' },
        { value: 'MONDAY', label: 'Segunda-feira' },
        { value: 'TUESDAY', label: 'Terça-feira' },
        { value: 'WEDNESDAY', label: 'Quarta-feira' },
        { value: 'THURSDAY', label: 'Quinta-feira' },
        { value: 'FRIDAY', label: 'Sexta-feira' },
        { value: 'SATURDAY', label: 'Sábado' },
        { value: 'SUNDAY', label: 'Domingo' },
      ]);
    });
  });

  // ---------------------------------------------------------------- situação na agenda de pesagem (010)

  describe('weighingStandingLabelOf', () => {
    it.each([
      [{ situation: 'UP_TO_DATE', nextOn: '2026-10-02' }, 'Em dia'],
      [{ situation: 'DUE_TODAY' }, 'Pesar hoje'],
      [{ situation: 'LATE', lateSince: '2026-09-25' }, 'Atrasada desde 25/09'],
      [{ situation: 'NEVER_WEIGHED' }, 'Nunca pesada'],
    ] as const)('writes %o as "%s"', (standing, label) => {
      expect(weighingStandingLabelOf(standing)).toBe(label);
    });

    it('writes nothing without a standing', () => {
      expect(weighingStandingLabelOf(undefined)).toBe('');
    });
  });

  describe('weighingStandingToneOf', () => {
    it.each([
      ['UP_TO_DATE', 'success'],
      ['DUE_TODAY', 'info'],
      ['LATE', 'warning'],
      ['NEVER_WEIGHED', 'neutral'],
    ] as const)('gives %s the tone %s', (situation, tone) => {
      expect(weighingStandingToneOf(situation)).toBe(tone);
    });
  });

  describe('nextWeighingTextOf', () => {
    it.each([
      [{ situation: 'UP_TO_DATE', nextOn: '2026-10-02' }, 'Próxima pesagem: sexta-feira, 02/10'],
      [{ situation: 'UP_TO_DATE', nextOn: '2026-10-04' }, 'Próxima pesagem: domingo, 04/10'],
      [{ situation: 'DUE_TODAY' }, 'Pesar hoje'],
      [{ situation: 'LATE', lateSince: '2026-09-25' }, 'Pesagem atrasada desde sexta-feira, 25/09'],
      [{ situation: 'NEVER_WEIGHED' }, 'Nunca pesada'],
    ] as const)('writes %o as "%s"', (standing, text) => {
      expect(nextWeighingTextOf(standing)).toBe(text);
    });

    it('writes nothing without a schedule', () => {
      expect(nextWeighingTextOf(undefined)).toBe('');
    });
  });

  describe('WEIGHING_FILTER_OPTIONS', () => {
    it('offers every cage first, then the pending weighing', () => {
      expect(WEIGHING_FILTER_OPTIONS).toEqual([
        { value: '', label: 'Todas' },
        { value: 'PENDING', label: 'Pesagem pendente' },
      ]);
    });
  });
});
