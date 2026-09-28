import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { TabLink, TabNav } from './tab-nav';

@Component({ template: '' })
class Blank {}

/**
 * Abas de navegação, o `.tabs` do design system: cada aba é um link para uma rota, e a da rota atual é
 * a página em que se está (`aria-current="page"`).
 */
describe('TabNav', () => {
  let fixture: ComponentFixture<TabNav>;

  const tabs: readonly TabLink[] = [
    { label: 'Produção', icon: 'egg', link: ['/relatorio', 'producao'], count: 'pendente' },
    { label: 'Mortalidade', icon: 'pulse', link: ['/relatorio', 'mortalidade'] },
  ];

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function links(): HTMLAnchorElement[] {
    return Array.from(element().querySelectorAll<HTMLAnchorElement>('a'));
  }

  async function render(url: string): Promise<void> {
    TestBed.configureTestingModule({
      imports: [TabNav],
      providers: [
        provideRouter([
          { path: 'relatorio/producao', component: Blank },
          { path: 'relatorio/mortalidade', component: Blank },
        ]),
      ],
    });
    await TestBed.inject(Router).navigateByUrl(url);
    fixture = TestBed.createComponent(TabNav);
    fixture.componentRef.setInput('label', 'Lançamentos do relatório');
    fixture.componentRef.setInput('tabs', tabs);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('is a navigation named for the screen reader, in the tabs style', async () => {
    await render('/relatorio/producao');

    const nav = element().querySelector('nav')!;
    expect(nav.classList).toContain('tabs');
    expect(nav.getAttribute('aria-label')).toBe('Lançamentos do relatório');
  });

  it('leads each tab to its route', async () => {
    await render('/relatorio/producao');

    expect(links().map((link) => link.getAttribute('href'))).toEqual(['/relatorio/producao', '/relatorio/mortalidade']);
    expect(links().map((link) => link.textContent?.trim())).toEqual(['Produção pendente', 'Mortalidade']);
  });

  it('marks the tab of the current route as the current page, and only it', async () => {
    await render('/relatorio/mortalidade');

    expect(links().map((link) => link.getAttribute('aria-current'))).toEqual([null, 'page']);
  });

  it('shows the count of a tab only where there is one', async () => {
    await render('/relatorio/producao');

    const [production, mortality] = links();
    expect(production.querySelector('.cnt')?.textContent?.trim()).toBe('pendente');
    expect(mortality.querySelector('.cnt')).toBeNull();
  });

  // ---------------------------------------------------------------- parâmetros de consulta (006)

  it('keeps the query of each tab, and marks as current only the one of the current query', async () => {
    TestBed.configureTestingModule({
      imports: [TabNav],
      providers: [provideRouter([{ path: 'painel', component: Blank }])],
    });
    await TestBed.inject(Router).navigateByUrl('/painel?setor=b&periodo=hoje');
    fixture = TestBed.createComponent(TabNav);
    fixture.componentRef.setInput('label', 'Setor');
    fixture.componentRef.setInput('tabs', [
      { label: 'Galpão A', link: ['/painel'], queryParams: { setor: 'a', periodo: 'hoje' } },
      { label: 'Galpão B', link: ['/painel'], queryParams: { setor: 'b', periodo: 'hoje' } },
    ]);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(links().map((link) => link.getAttribute('href'))).toEqual([
      '/painel?setor=a&periodo=hoje',
      '/painel?setor=b&periodo=hoje',
    ]);
    expect(links().map((link) => link.getAttribute('aria-current'))).toEqual([null, 'page']);
  });
});
