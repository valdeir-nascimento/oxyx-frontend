import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DataTable } from './data-table';

@Component({
  imports: [DataTable],
  template: `
    <ovyx-data-table
      caption="Responsáveis cadastrados"
      [loading]="loading()"
      [empty]="rows().length === 0"
      [summary]="summary()"
    >
      <thead>
        <tr><th scope="col">Nome</th></tr>
      </thead>
      <tbody>
        @for (row of rows(); track row) {
          <tr><td>{{ row }}</td></tr>
        }
      </tbody>
    </ovyx-data-table>
  `,
})
class CaretakerRows {
  readonly loading = signal(false);
  readonly rows = signal<readonly string[]>(['Maria Silva']);
  readonly summary = signal('');
}

/**
 * Tabela de listagem: a página projeta cabeçalho e linhas; a tabela dá o nome, a rolagem em tela
 * estreita e os estados de carregamento e de vazio.
 */
describe('DataTable', () => {
  function render(loading: boolean, rows: readonly string[], summary = '') {
    TestBed.configureTestingModule({ imports: [CaretakerRows] });
    const fixture = TestBed.createComponent(CaretakerRows);
    fixture.componentInstance.loading.set(loading);
    fixture.componentInstance.rows.set(rows);
    fixture.componentInstance.summary.set(summary);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows the projected rows inside a table named by its caption', () => {
    const element = render(false, ['Maria Silva']);
    const region = element.querySelector('[role="region"]')!;

    expect(element.querySelector('table caption')?.textContent?.trim()).toBe('Responsáveis cadastrados');
    expect(element.querySelector(`#${region.getAttribute('aria-labelledby')}`)?.textContent?.trim()).toBe(
      'Responsáveis cadastrados',
    );
    expect(element.querySelector('tbody td')?.textContent).toBe('Maria Silva');
  });

  it('lets the keyboard reach the table, to scroll it on a narrow screen', () => {
    expect(render(false, ['Maria Silva']).querySelector('[role="region"]')?.getAttribute('tabindex')).toBe('0');
  });

  it('says it is loading, in a status region that is always there', () => {
    // A região existe antes do texto: leitor de tela costuma não anunciar a que já nasce preenchida.
    const element = render(true, []);

    expect(element.querySelector('[role="status"]')?.textContent?.trim()).toBe('Carregando…');
  });

  it('says there is nothing to show when the search found no one', () => {
    expect(render(false, []).querySelector('[role="status"]')?.textContent?.trim()).toBe(
      'Nenhum registro encontrado.',
    );
  });

  it('keeps the status region quiet while there are rows and nothing to say about them', () => {
    expect(render(false, ['Maria Silva']).querySelector('[role="status"]')?.textContent?.trim()).toBe('');
  });

  it('keeps the empty status region in the accessibility tree, only out of sight', () => {
    // Com display: none a região saía da árvore de acessibilidade e renascia a cada estado (T235). O
    // navegador não conta o texto vazio da interpolação para :empty; o jsdom conta, e o normalize o
    // retira.
    const region = render(false, ['Maria Silva']).querySelector<HTMLElement>('[role="status"]')!;

    region.normalize();

    expect(getComputedStyle(region).display).not.toBe('none');
    expect(getComputedStyle(region).position).toBe('absolute');
  });

  it('says what the page gives it about the rows found, so a search that finds someone is heard', () => {
    expect(
      render(false, ['Maria Silva'], '1 responsável encontrado.').querySelector('[role="status"]')?.textContent?.trim(),
    ).toBe('1 responsável encontrado.');
  });
});
