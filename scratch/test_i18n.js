const i18n = require('./src/i18n').default;

console.log('Active language:', i18n.language);
console.log('Resolving vehicleSelect.mismatchTitle in en:', i18n.t('vehicleSelect.mismatchTitle', { lng: 'en' }));
console.log('Resolving vehicleSelect.mismatchTitle in tr:', i18n.t('vehicleSelect.mismatchTitle', { lng: 'tr' }));
console.log('Resolving vehicleSelect.mismatchTitle in pt:', i18n.t('vehicleSelect.mismatchTitle', { lng: 'pt' }));
console.log('Resolving common.yes in pt:', i18n.t('common.yes', { lng: 'pt' }));
