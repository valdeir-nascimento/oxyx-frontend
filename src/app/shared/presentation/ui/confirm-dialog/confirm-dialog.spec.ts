import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmDialog } from './confirm-dialog';

@Component({
  imports: [ConfirmDialog],
  template: `
    @if (open()) {
      <ovyx-confirm-dialog
        title="Inativar Maria Silva?"
        confirmLabel="Inativar"
        (confirmed)="confirmed = confirmed + 1"
        (cancelled)="cancelled = cancelled + 1"
      >
        Ela deixa de conseguir entrar no sistema. O histórico é preservado.
      </ovyx-confirm-dialog>
    }
  `,
})
class DeactivationQuestion {
  readonly open = signal(true);
  confirmed = 0;
  cancelled = 0;
}

/**
 * Confirmação de uma ação que não se desfaz com um clique (FR-018). Inline e não modal: aparece
 * junto de onde a ação foi pedida.
 */
describe('ConfirmDialog', () => {
  let fixture: ComponentFixture<DeactivationQuestion>;

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function button(label: string): HTMLButtonElement {
    return Array.from(element().querySelectorAll('button')).find((b) => b.textContent?.trim() === label)!;
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [DeactivationQuestion] });
    fixture = TestBed.createComponent(DeactivationQuestion);
    document.body.appendChild(element());
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => element().remove());

  it('asks the question as an alert dialog, named by the question and described by the consequence', () => {
    const dialog = element().querySelector('[role="alertdialog"]')!;

    expect(element().querySelector(`#${dialog.getAttribute('aria-labelledby')}`)?.textContent?.trim()).toBe(
      'Inativar Maria Silva?',
    );
    expect(element().querySelector(`#${dialog.getAttribute('aria-describedby')}`)?.textContent).toContain(
      'O histórico é preservado.',
    );
  });

  it('puts the focus on the choice that changes nothing', () => {
    expect(document.activeElement).toBe(button('Cancelar'));
  });

  it('reports the confirmation', () => {
    button('Inativar').click();

    expect(fixture.componentInstance.confirmed).toBe(1);
    expect(fixture.componentInstance.cancelled).toBe(0);
  });

  it('reports the cancellation, by the button or by Escape', () => {
    button('Cancelar').click();
    element()
      .querySelector('[role="alertdialog"]')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(fixture.componentInstance.cancelled).toBe(2);
  });
});
