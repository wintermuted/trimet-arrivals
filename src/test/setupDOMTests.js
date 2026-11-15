global.IS_REACT_ACT_ENVIRONMENT = true;

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
