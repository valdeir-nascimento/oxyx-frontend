import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DomainError } from '../../../domain/domain-error';
import { ErrorSummary } from './error-summary';

/** Formulário mínimo: um campo de verdade, para o link do resumo ter onde levar o foco. */
@Component({
  imports: [ErrorSummary],
  template: `
    @if (errors().length > 0) {
      <ovyx-error-summary [errors]="errors()" [fields]="fields()" [heading]="heading()" />
    }
    <label for="email">E-mail</label>
    <input id="email" />
  `,
})
class FormWithSummary {
  readonly errors = signal<readonly DomainError[]>([]);
  readonly fields = signal<readonly string[] | undefined>(undefined);
  readonly heading = signal<string | undefined>(undefined);
}

/**
 * T234: depois de uma recusa, o foco ficava no botão e o leitor de tela não anunciava nada. O resumo
 * recebe o foco — a mudança de foco é o que o leitor anuncia — e lista todas as falhas de uma vez
 * (FR-017), cada uma com o caminho até o seu campo.
 */
describe('ErrorSummary', () => {
  const refusal: readonly DomainError[] = [
    { code: 'EMAIL_MALFORMED', field: 'email', message: 'Informe um e-mail em formato válido.' },
    { code: 'REQUEST_FAILED', message: 'Não houve resposta do servidor. Tente novamente em instantes.' },
  ];

  let fixture: ComponentFixture<FormWithSummary>;

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  async function refuse(errors: readonly DomainError[]): Promise<void> {
    fixture.componentInstance.errors.set(errors);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [FormWithSummary] }).compileComponents();
    fixture = TestBed.createComponent(FormWithSummary);
    fixture.autoDetectChanges();
    document.body.appendChild(element());
  });

  afterEach(() => element().remove());

  it('lists every error, and links the ones that belong to a field', async () => {
    await refuse(refusal);

    const items = Array.from(element().querySelectorAll('.error-summary li'));
    const link = items[0].querySelector('a');

    expect(items.map((item) => item.textContent?.trim())).toEqual([
      'Informe um e-mail em formato válido.',
      'Não houve resposta do servidor. Tente novamente em instantes.',
    ]);
    expect(link?.getAttribute('href')).toBe('#email');
    expect(items[1].querySelector('a')).toBeNull();
  });

  it('does not link a field the form does not show', async () => {
    // Um link que não leva a lugar nenhum é pior que texto: a falha continua visível, sem promessa.
    fixture.componentInstance.fields.set(['name']);

    await refuse(refusal);

    expect(element().querySelector('.error-summary a')).toBeNull();
    expect(element().querySelector('.error-summary')?.textContent).toContain('Informe um e-mail em formato válido.');
  });

  it('takes the focus when it appears, so the screen reader announces the refusal', async () => {
    await refuse(refusal);

    expect(document.activeElement).toBe(element().querySelector('.error-summary'));
  });

  it('takes the focus again on a new refusal', async () => {
    await refuse(refusal);
    (element().querySelector('#email') as HTMLInputElement).focus();

    await refuse([refusal[0]]);

    expect(document.activeElement).toBe(element().querySelector('.error-summary'));
  });

  it('takes the person to the refused field', async () => {
    await refuse(refusal);

    (element().querySelector('.error-summary a') as HTMLAnchorElement).click();

    expect(document.activeElement).toBe(element().querySelector('#email'));
  });

  it('is named by its title, and does not announce itself a second time as an alert', async () => {
    // O anúncio vem da mudança de foco. Com role="alert", o leitor anunciaria a recusa duas vezes.
    await refuse(refusal);

    const summary = element().querySelector('.error-summary')!;
    const title = element().querySelector(`#${summary.getAttribute('aria-labelledby')}`);

    expect(title?.textContent?.trim()).toBe('Não foi possível concluir. Corrija o que está indicado:');
    expect(summary.getAttribute('role')).not.toBe('alert');
  });

  it('does not ask to correct the form when the refusal points to no field of it', async () => {
    // Observação do QA: a gaiola recusada porque o setor está inativo não tem campo a corrigir, e o
    // título mandava corrigir "o que está indicado".
    fixture.componentInstance.fields.set(['email']);

    await refuse([
      { code: 'SECTOR_INACTIVE', message: 'O setor está inativo.' },
      { code: 'EMAIL_MALFORMED', field: 'name', message: 'Campo que a tela não mostra.' },
    ]);

    const summary = element().querySelector('.error-summary')!;
    expect(element().querySelector(`#${summary.getAttribute('aria-labelledby')}`)?.textContent?.trim()).toBe(
      'Não foi possível concluir a operação:',
    );
  });

  it('is a group, a role that admits the name its title gives it', async () => {
    // Um div sem papel é "generic", e o papel generic não admite nome (ARIA 1.2): o título não
    // chegava ao leitor de tela.
    await refuse(refusal);

    expect(element().querySelector('.error-summary')?.getAttribute('role')).toBe('group');
  });

  it('takes the heading the screen gives it, for a refusal that is not about filling a form', async () => {
    fixture.componentInstance.heading.set('Não foi possível concluir a operação:');

    await refuse(refusal);

    const summary = element().querySelector('.error-summary')!;
    expect(element().querySelector(`#${summary.getAttribute('aria-labelledby')}`)?.textContent?.trim()).toBe(
      'Não foi possível concluir a operação:',
    );
  });

  it('lists a message repeated in two fields once, linked to the first field', async () => {
    // Revisão e QA (D-4): o conflito de gaiola põe a mesma frase na bateria e no número, e o resumo a
    // lia duas vezes. Junto de cada campo ela continua; no resumo, basta uma.
    const message = 'Já existe uma gaiola ativa B-07 neste setor.';
    await refuse([
      { code: 'CAGE_ALREADY_EXISTS', field: 'email', message },
      { code: 'CAGE_ALREADY_EXISTS', field: 'number', message },
    ]);

    const items = Array.from(element().querySelectorAll('.error-summary li'));
    expect(items.map((item) => item.textContent?.trim())).toEqual([message]);
    expect(items[0].querySelector('a')?.getAttribute('href')).toBe('#email');
  });
});
