import 'fluent-intl-polyfill';
import './polyfill';

import { MessageContext } from 'fluent';
import negotiateLanguages from 'fluent-langneg';

import DOMLocalization from '../dom_localization';
import DocumentLocalization from '..//document_localization';

import { ResourceBundle } from './io';
import { documentReady, getResourceLinks, getMeta } from './util';

// This function is provided to the constructor of `Localization` object and is
// used to create new `MessageContext` objects for a given `lang` with selected
// builtin functions.
function createContext(lang) {
  // IE11 & Edge renders FSI and PDI as mojibakes so we turn them off.
  const isIE11 = window.navigator.userAgent.indexOf('Trident/') > -1;
  const isEdge = window.navigator.userAgent.indexOf('Edge/') > -1;

  return new MessageContext(lang, {
    useIsolating: !isIE11 && !isEdge
  });
}

// Called for every named Localization declared via <link name=…> elements.
function createLocalization(defaultLocale, availableLangs, resIds, name) {
  // This function is called by `Localization` class to retrieve an array of
  // `ResourceBundle`s.
  function requestBundles(requestedLangs = navigator.languages) {
    const newLangs = negotiateLanguages(
      requestedLangs, availableLangs, { defaultLocale }
    );

    const bundles = newLangs.map(
      lang => new ResourceBundle(lang, resIds)
    );

    return Promise.resolve(bundles);
  }

  if (name === 'main') {
    document.l10n = new DocumentLocalization(requestBundles, createContext);
    document.l10n.ready = documentReady().then(() => {
      document.l10n.connectRoot(document.documentElement);
      return document.l10n.translateDocument();
    }).then(() => {
      window.addEventListener('languagechange', document.l10n);
    });
  } else {
    // Pass the main Localization, `document.l10n`, as the observer.
    const l10n = new DOMLocalization(
      requestBundles, createContext, name, document.l10n
    );
    // Add this Localization as a delegate of the main one.
    document.l10n.delegates.set(name, l10n);
  }
}

const { defaultLang, availableLangs } = getMeta(document.head);

// Collect all l10n resource links and create `Localization` objects. The
// 'main' Localization must be declared as the first one.
getResourceLinks(document.head).forEach(
  (resIds, name) => createLocalization(
    defaultLang, availableLangs, resIds, name
  )
);
