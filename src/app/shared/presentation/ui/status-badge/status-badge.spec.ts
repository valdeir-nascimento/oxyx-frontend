import { TestBed } from '@angular/core/testing';
import { StatusBadge } from './status-badge';

/** Selo de situação: o texto diz o estado, e a forma da marca repete isso sem depender de cor. */
describe('StatusBadge', () => {
  function render(label: string, tone?: 'positive' | 'neutral'): HTMLElement {
    const fixture = TestBed.createComponent(StatusBadge);
    fixture.componentRef.setInput('label', label);
    if (tone) {
      fixture.componentRef.setInput('tone', tone);
    }
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('says the state in words', () => {
    expect(render('Ativo', 'positive').textContent?.trim()).toBe('Ativo');
  });

  it('marks the tone for the style, neutral unless told otherwise', () => {
    expect(render('Inativo').querySelector('.badge')?.getAttribute('data-tone')).toBe('neutral');
    expect(render('Ativo', 'positive').querySelector('.badge')?.getAttribute('data-tone')).toBe('positive');
  });
});
