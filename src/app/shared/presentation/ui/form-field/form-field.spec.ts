import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormControl } from '@angular/forms';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormField, FormFieldType } from './form-field';

/**
 * O campo é o que as duas telas de senha repetiam linha por linha: rótulo, entrada, ajuda e
 * mensagem de recusa. O que ele garante não é o desenho, é a ligação — quem usa leitor de tela
 * precisa ouvir a mensagem de erro junto do campo que a causou, e não solta no fim da página.
 */
describe('FormField', () => {
  @Component({
    selector: 'ovyx-form-field-host',
    imports: [FormField],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
      <ovyx-form-field
        controlId="identifier"
        label="E-mail ou celular"
        autocomplete="username"
        [type]="type()"
        [control]="control"
        [hint]="hint()"
        [error]="error()"
      />
    `,
  })
  class FormFieldHost {
    readonly control = new FormControl('', { nonNullable: true });
    readonly type = signal<FormFieldType>('text');
    readonly hint = signal<string | undefined>(undefined);
    readonly error = signal<string | undefined>(undefined);
  }

  @Component({
    selector: 'ovyx-form-field-defaults-host',
    imports: [FormField],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
      <ovyx-form-field controlId="identifier" label="E-mail ou celular" [control]="control" />
    `,
  })
  class FormFieldDefaultsHost {
    readonly control = new FormControl('', { nonNullable: true });
  }

  @Component({
    selector: 'ovyx-form-field-multiline-host',
    imports: [FormField],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
      <ovyx-form-field
        controlId="description"
        label="Descrição"
        [multiline]="true"
        [control]="control"
        [error]="error()"
      />
    `,
  })
  class FormFieldMultilineHost {
    readonly control = new FormControl('', { nonNullable: true });
    readonly error = signal<string | undefined>(undefined);
  }

  @Component({
    selector: 'ovyx-form-field-numeric-host',
    imports: [FormField],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<ovyx-form-field controlId="birdCount" label="Aves" inputMode="numeric" [control]="control" />`,
  })
  class FormFieldNumericHost {
    readonly control = new FormControl('', { nonNullable: true });
  }

  async function renderMultiline(): Promise<ComponentFixture<FormFieldMultilineHost>> {
    await TestBed.configureTestingModule({ imports: [FormFieldMultilineHost] }).compileComponents();
    const fixture = TestBed.createComponent(FormFieldMultilineHost);
    fixture.detectChanges();
    return fixture;
  }

  async function render(): Promise<ComponentFixture<FormFieldHost>> {
    await TestBed.configureTestingModule({ imports: [FormFieldHost] }).compileComponents();
    const fixture = TestBed.createComponent(FormFieldHost);
    fixture.detectChanges();
    return fixture;
  }

  function element(fixture: ComponentFixture<FormFieldHost>): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function control(fixture: ComponentFixture<FormFieldHost>): HTMLInputElement {
    return element(fixture).querySelector('input')!;
  }

  it('links its label to the control it describes', async () => {
    const fixture = await render();
    const label = element(fixture).querySelector('label');

    expect(label?.getAttribute('for')).toBe('identifier');
    expect(label?.textContent).toContain('E-mail ou celular');
    expect(control(fixture).id).toBe('identifier');
  });

  it('hands what was typed to the form control it was given', async () => {
    const fixture = await render();
    const input = control(fixture);

    input.value = '91988887777';
    input.dispatchEvent(new Event('input'));

    expect(fixture.componentInstance.control.value).toBe('91988887777');
  });

  it('points the control at the message that refused it', async () => {
    const fixture = await render();
    fixture.componentInstance.error.set('Informe o e-mail ou o celular.');
    fixture.detectChanges();

    const message = element(fixture).querySelector('#identifier-error');
    expect(message?.textContent).toContain('Informe o e-mail ou o celular.');
    expect(control(fixture).getAttribute('aria-describedby')).toContain('identifier-error');
  });

  it('marks the control invalid only while it is refused', async () => {
    const fixture = await render();
    expect(control(fixture).getAttribute('aria-invalid')).toBeNull();

    fixture.componentInstance.error.set('Informe a senha.');
    fixture.detectChanges();
    expect(control(fixture).getAttribute('aria-invalid')).toBe('true');

    fixture.componentInstance.error.set(undefined);
    fixture.detectChanges();
    expect(control(fixture).getAttribute('aria-invalid')).toBeNull();
  });

  it('describes the control by the hint while nothing was refused', async () => {
    const fixture = await render();
    fixture.componentInstance.hint.set('Use o e-mail cadastrado ou o celular, só com dígitos.');
    fixture.detectChanges();

    expect(control(fixture).getAttribute('aria-describedby')).toBe('identifier-hint');
    expect(element(fixture).querySelector('#identifier-hint')?.textContent).toContain(
      'só com dígitos',
    );
  });

  it('announces the refusal before the hint, because the refusal is what blocks the person', async () => {
    const fixture = await render();
    fixture.componentInstance.hint.set('Só dígitos.');
    fixture.componentInstance.error.set('Celular inválido.');
    fixture.detectChanges();

    expect(control(fixture).getAttribute('aria-describedby')).toBe(
      'identifier-error identifier-hint',
    );
  });

  it('renders no error element while the field is valid', async () => {
    const fixture = await render();

    expect(element(fixture).querySelector('#identifier-error')).toBeNull();
    expect(control(fixture).getAttribute('aria-describedby')).toBeNull();
  });

  it('passes the autocomplete hint on to the browser', async () => {
    expect(control(await render()).getAttribute('autocomplete')).toBe('username');
  });

  it('keeps a password hidden while it is typed', async () => {
    // Sem este teste, trocar o tipo por um `text` fixo deixava a senha desenhada em texto claro na
    // tela e a suíte inteira continuava verde.
    const fixture = await render();
    fixture.componentInstance.type.set('password');
    fixture.detectChanges();

    expect(control(fixture).type).toBe('password');
  });

  it.each(['date', 'time'] as const)('renders a %s field for the day and the hour of a collection', async (kind) => {
    await TestBed.configureTestingModule({ imports: [FormFieldHost] }).compileComponents();
    const fixture = TestBed.createComponent(FormFieldHost);
    fixture.componentInstance.type.set(kind);
    fixture.detectChanges();

    const input = (fixture.nativeElement as HTMLElement).querySelector('input')!;
    expect(input.type).toBe(kind);
  });

  it('shows an ordinary field as text when nothing else was asked', async () => {
    await TestBed.configureTestingModule({ imports: [FormFieldDefaultsHost] }).compileComponents();
    const fixture = TestBed.createComponent(FormFieldDefaultsHost);
    fixture.detectChanges();

    const input = (fixture.nativeElement as HTMLElement).querySelector('input')!;
    expect(input.type).toBe('text');
  });

  it('takes a long text in a text area, linked to its label and to its refusal', async () => {
    // A descrição do setor tem até 500 caracteres: numa linha só, a pessoa não vê o que escreveu.
    const fixture = await renderMultiline();
    const root = fixture.nativeElement as HTMLElement;
    fixture.componentInstance.error.set('A descrição deve ter no máximo 500 caracteres.');
    fixture.detectChanges();

    const area = root.querySelector('textarea')!;
    expect(root.querySelector('input')).toBeNull();
    expect(area.id).toBe('description');
    expect(area.closest('.control')?.classList).toContain('area');
    expect(root.querySelector('label')?.getAttribute('for')).toBe('description');
    expect(area.getAttribute('aria-describedby')).toBe('description-error');
    expect(area.getAttribute('aria-invalid')).toBe('true');
  });

  it('hands what was typed in the text area to the form control', async () => {
    const fixture = await renderMultiline();
    const area = (fixture.nativeElement as HTMLElement).querySelector('textarea')!;

    area.value = 'Codornas japonesas em postura';
    area.dispatchEvent(new Event('input'));

    expect(fixture.componentInstance.control.value).toBe('Codornas japonesas em postura');
  });

  it('opens the numeric keyboard for a quantity, and keeps what was typed as text', async () => {
    // Um campo `number` entregaria número ao formulário e apagaria o "12,5" que o backend precisa
    // recusar com a mensagem certa (FR-017).
    await TestBed.configureTestingModule({ imports: [FormFieldNumericHost] }).compileComponents();
    const fixture = TestBed.createComponent(FormFieldNumericHost);
    fixture.detectChanges();
    const input = (fixture.nativeElement as HTMLElement).querySelector('input')!;

    input.value = '12,5';
    input.dispatchEvent(new Event('input'));

    expect(input.getAttribute('inputmode')).toBe('numeric');
    expect(input.type).toBe('text');
    expect(fixture.componentInstance.control.value).toBe('12,5');
  });
});
