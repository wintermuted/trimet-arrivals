import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { TextDecoder, TextEncoder } from "util";

global.IS_REACT_ACT_ENVIRONMENT = true;
global.TextDecoder = TextDecoder;
global.TextEncoder = TextEncoder;
window.URL.createObjectURL = vi.fn();
afterEach(cleanup);

// JSDOM has no native dialog lifecycle; browser checks cover modality and focus.
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function() {
    this.setAttribute("open", "");
  };
}
if (!HTMLDialogElement.prototype.close) {
  HTMLDialogElement.prototype.close = function() {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
}
