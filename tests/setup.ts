import 'fake-indexeddb/auto';
import '@testing-library/jest-dom';

// Polyfill scrollIntoView for jsdom (used by chat auto-scroll)
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || function () {};

// Polyfill HTMLDialogElement methods for jsdom
if (typeof HTMLDialogElement !== 'undefined') {
  HTMLDialogElement.prototype.showModal =
    HTMLDialogElement.prototype.showModal ||
    function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    };

  HTMLDialogElement.prototype.close =
    HTMLDialogElement.prototype.close ||
    function (this: HTMLDialogElement) {
      this.removeAttribute('open');
      this.dispatchEvent(new Event('close'));
    };
}
