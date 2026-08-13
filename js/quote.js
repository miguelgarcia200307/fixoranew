/* FIXORA - Quote (delegates to DocumentEditor) */

const Quote = {
  async init() {
    await DocumentEditor.init('quote');
  }
};

window.Quote = Quote;
