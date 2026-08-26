import i18n, { localeLoaders, ensureLocaleLoaded } from '../i18n';

describe('i18n Dynamic Lazy Loading Test Suite', () => {
    const supportedLanguages = Object.keys(localeLoaders);

    test('should have 26 supported languages configured in loaders', () => {
        expect(supportedLanguages.length).toBe(26);
    });

    test('should load fallback language (en) on initial startup', () => {
        expect(i18n.isInitialized).toBe(true);
        expect(i18n.hasResourceBundle('en', 'translation')).toBe(true);
    });

    test.each(supportedLanguages)('should dynamically load and switch to language: %s without errors', async (lang) => {
        const loaded = ensureLocaleLoaded(lang);
        expect(loaded).toBe(true);
        expect(i18n.hasResourceBundle(lang, 'translation')).toBe(true);

        await i18n.changeLanguage(lang);
        expect(i18n.language).toBe(lang);

        // Verify key translation works in the loaded language
        const appTitle = i18n.t('common.appName');
        expect(typeof appTitle).toBe('string');
        expect(appTitle.length).toBeGreaterThan(0);
    });
});
