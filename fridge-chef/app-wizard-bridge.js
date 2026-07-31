'use strict';

function openWizardResultsScreen() {
  if (typeof showWizardStep !== 'function') return;
  showWizardStep(4, {
    force: true,
    replace: location.hash === '#recipes'
  });
}

const originalWizardSetLoading = setLoading;
setLoading = function setWizardLoading(loading) {
  originalWizardSetLoading(loading);
  if (loading) openWizardResultsScreen();
};

const originalWizardRenderResults = renderResults;
renderResults = function renderWizardResults(input, source) {
  originalWizardRenderResults(input, source);
  openWizardResultsScreen();
};

if (typeof renderAiError === 'function') {
  const originalWizardRenderAiError = renderAiError;
  renderAiError = function renderWizardAiError(input, message) {
    originalWizardRenderAiError(input, message);
    openWizardResultsScreen();
  };
}

if (!document.querySelector('.wizard-screen.is-active') && typeof showWizardStep === 'function') {
  showWizardStep(1, { force: true, replace: true });
}
