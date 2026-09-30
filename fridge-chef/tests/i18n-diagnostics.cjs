const {chromium} = require('playwright');
const launch = chromium.launch.bind(chromium);
chromium.launch = async function (...args) {
  const browser = await launch(...args);
  const newContext = browser.newContext.bind(browser);
  browser.newContext = async function (...options) {
    const context = await newContext(...options);
    context.on('page', page => {
      page.on('pageerror', error => console.error('BROWSER ERROR:', error.stack || error.message));
      page.on('console', msg => {if (msg.type() === 'error') console.error('BROWSER CONSOLE:',msg.text());});
      page.on('requestfailed', request => {if (request.url().includes('/api/translate-ui')) console.error('TRANSLATE REQUEST FAILED:',request.failure());});
    });
    return context;
  };
  return browser;
};
