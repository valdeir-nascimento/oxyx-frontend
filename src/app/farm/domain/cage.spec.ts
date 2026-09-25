import { cageCodeOf } from './cage';

/** O código da gaiola: bateria, hífen e número com pelo menos dois dígitos (FR-008). */
describe('cageCodeOf', () => {
  it.each([
    ['B', 7, 'B-07'],
    ['A', 12, 'A-12'],
    ['C', 120, 'C-120'],
    ['A1', 1, 'A1-01'],
  ])('writes battery %s and number %i as %s', (battery, number, code) => {
    expect(cageCodeOf(battery, number)).toBe(code);
  });
});
