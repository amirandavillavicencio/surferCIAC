import test from 'node:test';
import assert from 'node:assert/strict';
import { bindInput, type Action } from '../upstream/src/input';

test('las letras del nombre no se interceptan, pero A sigue cambiando de carril', () => {
  const originalWindow = (globalThis as any).window;
  const originalDocument = (globalThis as any).document;
  const originalHTMLElement = (globalThis as any).HTMLElement;
  const listeners = new Map<string, (event: any) => void>();
  const actions: Action[] = [];
  class TestElement {
    constructor(readonly kind: string, readonly isContentEditable = false) {}
    closest(selector: string) {
      return selector.split(',').map(s => s.trim()).includes(this.kind) ? this : null;
    }
  }
  try {
    (globalThis as any).HTMLElement = TestElement;
    (globalThis as any).window = {addEventListener: (type: string, handler: (event: any) => void) => listeners.set(type, handler)};
    (globalThis as any).document = {addEventListener: () => {}};
    bindInput({addEventListener: () => {}} as any, a => actions.push(a), () => true);

    const keydown = listeners.get('keydown')!;
    const press = (code: string, target: TestElement) => {
      let prevented = false;
      keydown({code, target, repeat: false, preventDefault: () => {prevented = true;}});
      return prevented;
    };

    const nameInput = new TestElement('input');
    assert.equal(press('KeyA', nameInput), false, 'A inicial debe poder escribirse');
    assert.equal(press('KeyD', nameInput), false, 'D también debe poder escribirse');
    assert.equal(press('Enter', nameInput), false, 'Enter debe quedar disponible para guardar');
    assert.equal(press('KeyA', new TestElement('span', true)), false, 'texto editable conserva sus teclas');
    assert.deepEqual(actions, [], 'escribir no activa movimientos del juego');

    assert.equal(press('KeyA', new TestElement('div')), true, 'A fuera del formulario sigue siendo control');
    assert.deepEqual(actions, ['left']);
  } finally {
    if (originalWindow === undefined) delete (globalThis as any).window;
    else (globalThis as any).window = originalWindow;
    if (originalDocument === undefined) delete (globalThis as any).document;
    else (globalThis as any).document = originalDocument;
    if (originalHTMLElement === undefined) delete (globalThis as any).HTMLElement;
    else (globalThis as any).HTMLElement = originalHTMLElement;
  }
});
