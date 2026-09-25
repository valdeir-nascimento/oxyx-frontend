import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Dialog } from './dialog';

@Component({
  imports: [Dialog],
  template: `
    <ovyx-dialog title="Novo responsável" subtitle="Quem pode entrar no sistema." (closed)="closed()" (submitted)="submitted()">
      <input id="fullName" />
      <button dialog-actions type="submit">Cadastrar</button>
    </ovyx-dialog>
  `,
})
class Host {
  readonly closed = vi.fn();
  readonly submitted = vi.fn();
}

/** Diálogo de formulário: modal, nomeado pelo título, e que se fecha pelo "Fechar", pelo Esc e por fora. */
describe('Dialog', () => {
  let fixture: ComponentFixture<Host>;

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function dialog(): HTMLFormElement {
    return element().querySelector<HTMLFormElement>('[role="dialog"]')!;
  }

  async function render(): Promise<void> {
    TestBed.configureTestingModule({ imports: [Host] });
    fixture = TestBed.createComponent(Host);
    document.body.appendChild(element());
    fixture.detectChanges();
    await fixture.whenStable();
  }

  afterEach(() => element().remove());

  it('is a modal dialog named by its title and described by its subtitle', async () => {
    await render();

    expect(dialog().getAttribute('aria-modal')).toBe('true');
    expect(element().querySelector(`#${dialog().getAttribute('aria-labelledby')}`)?.textContent).toBe(
      'Novo responsável',
    );
    expect(element().querySelector(`#${dialog().getAttribute('aria-describedby')}`)?.textContent).toBe(
      'Quem pode entrar no sistema.',
    );
  });

  it('opens with the focus on the first field', async () => {
    await render();

    expect(document.activeElement).toBe(element().querySelector('#fullName'));
  });

  it('puts the fields in the body and the actions in the footer', async () => {
    await render();

    expect(element().querySelector('.dlg-body #fullName')).not.toBeNull();
    expect(element().querySelector('.dlg-foot button')?.textContent).toBe('Cadastrar');
  });

  it('is a form the browser does not validate, so every refusal comes from the backend at once', async () => {
    await render();

    expect(dialog().noValidate).toBe(true);
  });

  it('reports the submission, and keeps the browser from leaving the page', async () => {
    await render();
    const event = new Event('submit', { cancelable: true });

    dialog().dispatchEvent(event);

    expect(fixture.componentInstance.submitted).toHaveBeenCalledOnce();
    expect(event.defaultPrevented).toBe(true);
  });

  it('asks to close by the close button', async () => {
    await render();

    element().querySelector<HTMLButtonElement>('[aria-label="Fechar"]')!.click();

    expect(fixture.componentInstance.closed).toHaveBeenCalledOnce();
  });

  it('asks to close on Escape', async () => {
    await render();

    element()
      .querySelector('#fullName')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(fixture.componentInstance.closed).toHaveBeenCalledOnce();
  });

  it('asks to close on a click outside it, and not on a click inside it', async () => {
    await render();

    element().querySelector<HTMLElement>('#fullName')!.click();
    expect(fixture.componentInstance.closed).not.toHaveBeenCalled();

    element().querySelector<HTMLElement>('.layer')!.click();
    expect(fixture.componentInstance.closed).toHaveBeenCalledOnce();
  });
});
