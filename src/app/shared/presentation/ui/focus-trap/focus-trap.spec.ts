import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FocusTrap } from './focus-trap';

@Component({
  imports: [FocusTrap],
  template: `
    <button type="button" id="opener" (click)="open.set(true)">Abrir</button>
    @if (open()) {
      <div role="dialog" aria-modal="true" [ovyxFocusTrap]="initial()">
        <button type="button" id="first">Fechar</button>
        <input id="field" />
        <button type="button" id="last" (click)="open.set(false)">Salvar</button>
      </div>
    }
  `,
})
class Host {
  readonly open = signal(false);
  readonly initial = signal('');
}

/** Foco preso no diálogo modal: entra nele ao abrir, circula dentro dele, e volta a quem abriu. */
describe('FocusTrap', () => {
  let fixture: ComponentFixture<Host>;

  function byId(id: string): HTMLElement {
    return (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('#' + id)!;
  }

  function tab(shiftKey = false): KeyboardEvent {
    const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey, bubbles: true, cancelable: true });
    document.activeElement!.dispatchEvent(event);
    return event;
  }

  async function open(initial = ''): Promise<void> {
    TestBed.configureTestingModule({ imports: [Host] });
    fixture = TestBed.createComponent(Host);
    document.body.appendChild(fixture.nativeElement as HTMLElement);
    fixture.componentInstance.initial.set(initial);
    fixture.detectChanges();
    byId('opener').focus();
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  afterEach(() => (fixture.nativeElement as HTMLElement).remove());

  it('moves the focus to the first element that takes it, when told none', async () => {
    await open();

    expect(document.activeElement).toBe(byId('first'));
  });

  it('moves the focus to the element it is told', async () => {
    await open('input');

    expect(document.activeElement).toBe(byId('field'));
  });

  it('takes Tab from the last element back to the first', async () => {
    await open();
    byId('last').focus();

    const event = tab();

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(byId('first'));
  });

  it('takes Shift+Tab from the first element to the last', async () => {
    await open();

    const event = tab(true);

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(byId('last'));
  });

  it('lets Tab move normally between the elements in the middle', async () => {
    await open();

    expect(tab().defaultPrevented).toBe(false);
  });

  it('gives the focus back to whoever opened the dialog once it closes', async () => {
    await open();

    byId('last').click();
    fixture.detectChanges();

    expect(document.activeElement).toBe(byId('opener'));
  });
});
