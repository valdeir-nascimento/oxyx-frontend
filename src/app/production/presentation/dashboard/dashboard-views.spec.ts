import { DashboardDay, EggGrading, Indicators } from '../../domain/dashboard';
import {
  gradingOf,
  kpisOf,
  pendingNote,
  pointsOf,
  targetBadgeOf,
  targetReferenceOf,
} from './dashboard-views';

/**
 * A montagem do painel em textos e pontos (R-011 da 009): as mesmas funções para a aba de um setor e para a
 * granja toda, sem conta nenhuma — os números vêm prontos do backend.
 */
describe('dashboard views', () => {
  const indicators: Indicators = {
    production: {
      value: 2900,
      previous: 2860,
      change: 1.4,
      goodDirection: 'UP',
      incompleteDays: 0,
    },
    layingRate: {
      value: 90.63,
      previous: 89.38,
      change: 1.25,
      goodDirection: 'UP',
      incompleteDays: 1,
    },
    feedCost: { goodDirection: 'DOWN', incompleteDays: 2 },
    costPerEgg: {
      value: 0.097,
      previous: 0.097,
      change: 0,
      goodDirection: 'DOWN',
      incompleteDays: 2,
    },
  };

  const trend: readonly DashboardDay[] = [
    { date: '2026-09-22', production: 2870, layingRate: 89.69, feedCost: 278.9, costPerEgg: 0.097 },
    { date: '2026-09-23' },
    { date: '2026-09-24', production: 2900, layingRate: 90.63 },
  ];

  describe('kpisOf', () => {
    it('writes the four indicators with the value, the change and the trend', () => {
      const [production, layingRate, feedCost, costPerEgg] = kpisOf(indicators, trend, 'DAY');

      expect(production.label).toBe('Produção');
      expect(production.value).toBe('2.900');
      expect(production.change).toBe('+1,4%');
      expect(production.direction).toBe('up');
      expect(production.trend).toEqual([2870, undefined, 2900]);
      expect(layingRate.value).toBe('90,63%');
      expect(layingRate.change).toBe('+1,25 p.p.');
      expect(feedCost.value).toBeUndefined();
      expect(costPerEgg.value).toBe('R$ 0,097');
      expect(costPerEgg.direction).toBeUndefined();
    });

    it('writes the pending ones in days for a sector and in reports for the farm', () => {
      const sector = kpisOf(indicators, trend, 'DAY');
      const farm = kpisOf(indicators, trend, 'REPORT');

      expect(sector[1].note).toBe('1 dia com a produção pendente');
      expect(sector[2].note).toBe('2 dias sem ração completa');
      expect(farm[1].note).toBe('1 relatório com a produção pendente');
      expect(farm[3].note).toBe('2 relatórios sem ração completa');
      expect(farm[0].note).toBeUndefined();
    });
  });

  describe('pendingNote', () => {
    it('says nothing without pending ones, and agrees in number otherwise', () => {
      expect(pendingNote(0, 'DAY', 'sem ração completa')).toBeUndefined();
      expect(pendingNote(1, 'REPORT', 'sem ração completa')).toBe(
        '1 relatório sem ração completa',
      );
      expect(pendingNote(3, 'DAY', 'sem ração completa')).toBe('3 dias sem ração completa');
    });
  });

  describe('pointsOf', () => {
    it('leaves the day without value out of the chart, instead of drawing it as zero', () => {
      const points = pointsOf(trend, 'layingRate', (value) => `${value}%`);

      expect(points.map((point) => point.label)).toEqual(['22/09', '24/09']);
      expect(points[1].value).toBe(90.63);
      expect(points[1].text).toBe('90.63% em 24/09/2026');
    });
  });

  describe('targetReferenceOf and targetBadgeOf', () => {
    it('names the line of the target with the decimal only when there is one', () => {
      expect(targetReferenceOf(82.5)).toEqual({ value: 82.5, label: 'Meta 82,5%' });
      expect(targetReferenceOf(80.13)?.label).toBe('Meta 80,13%');
      expect(targetReferenceOf(undefined)).toBeUndefined();
    });

    it('says above or below the target, and nothing without a day with report', () => {
      expect(targetBadgeOf('ABOVE')).toEqual({ label: 'Acima da meta', tone: 'success' });
      expect(targetBadgeOf('BELOW')).toEqual({ label: 'Abaixo da meta', tone: 'warning' });
      expect(targetBadgeOf(undefined)).toBeNull();
    });
  });

  describe('gradingOf', () => {
    it('writes the standard eggs and each class, and nothing without eggs', () => {
      const grades: EggGrading = {
        collected: 2900,
        standard: { grade: 'standard', count: 2760, percent: 95.2 },
        shares: [{ grade: 'small', count: 48, percent: 1.7 }],
      };

      const grading = gradingOf(grades);

      expect(grading?.mainText).toBe('95,2%');
      expect(grading?.mainNote).toBe('padrão · 2.760 de 2.900 ovos');
      expect(grading?.parts).toEqual([
        { label: 'Pequenos', count: 48, countText: '48', percentText: '1,7%' },
      ]);
      expect(gradingOf(undefined)).toBeNull();
    });
  });
});
