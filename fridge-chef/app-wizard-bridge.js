'use strict';

const originalWizardSetLoading = setLoading;
setLoading = function setWizardLoading(loading) {
  originalWizardSetLoading(loading);
  if (loading && typeof showWizardStep === 'function') {
    showWizardStep(4, { force: true });
  }
};

const originalWizardRenderResults = renderResults;
renderResults = function renderWizardResults(input, source) {
  originalWizardRenderResults(input, source);
  if (typeof showWizardStep === 'function') {
    showWizardStep(4, { force: true });
  }
};

if (typeof renderAiError === 'function') {
  const originalWizardRenderAiError = renderAiError;
  renderAiError = function renderWizardAiError(input, message) {
    originalWizardRenderAiError(input, message);
    if (typeof showWizardStep === 'function') {
      showWizardStep(4, { force: true });
    }
  };
}
