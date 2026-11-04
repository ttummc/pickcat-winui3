/*
 * Per-tab resource blocking.
 *
 * The original build used a static declarativeNetRequest ruleset that blocked the
 * site's /_nuxt/ bundle for the whole browser. That also killed the *official*
 * login page, which we now want to keep exactly as the site ships it.
 *
 * Instead, a tab that mounts our UI asks for the block; a tab that should stay
 * stock (sign-in) simply never asks. Static rules cannot be scoped per tab,
 * session rules can.
 */
const RULE_ID_OFFSET = 100000;

const ruleIdFor = (tabId) => RULE_ID_OFFSET + tabId;

async function setBlock(tabId, enabled) {
  const id = ruleIdFor(tabId);
  try {
    if (enabled) {
      await chrome.declarativeNetRequest.updateSessionRules({
        removeRuleIds: [id],
        addRules: [
          {
            id,
            priority: 1,
            action: { type: 'block' },
            condition: {
              urlFilter: '||pickcat.dao3.fun/_nuxt/',
              resourceTypes: ['script', 'stylesheet', 'image', 'font', 'other', 'media', 'xhr'],
              tabIds: [tabId],
            },
          },
        ],
      });
    } else {
      await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: [id] });
    }
  } catch (error) {
    console.warn('[PickCat] session rule update failed', error);
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender.tab?.id;
  if (tabId === undefined) {
    sendResponse({ ok: false });
    return false;
  }

  if (message?.type === 'pc:block-original') {
    setBlock(tabId, true).then(() => sendResponse({ ok: true }));
    return true;
  }

  if (message?.type === 'pc:allow-original') {
    setBlock(tabId, false).then(() => sendResponse({ ok: true }));
    return true;
  }

  return false;
});

// Never leave a rule behind for a closed tab: session rules are capped and ids
// are derived from the tab id, which Chrome reuses.
chrome.tabs.onRemoved.addListener((tabId) => {
  setBlock(tabId, false);
});
