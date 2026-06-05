/**
 * Utility to standardize brand and model strings for database integrity.
 * Converts strings to lowercase, trims them, removes diacritics, maps Turkish characters,
 * and formats them into snake_case.
 */
export function toSnakeCase(str: string): string {
  if (!str) return '';

  const turkishMapping: Record<string, string> = {
    'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u',
    'Ç': 'c', 'Ğ': 'g', 'İ': 'i', 'Ö': 'o', 'Ş': 's', 'Ü': 'u',
    'I': 'i'
  };

  // Replace Turkish characters to prevent encoding variations
  let cleanStr = str.replace(/[çğıöşüÇĞİÖŞÜI]/g, match => turkishMapping[match] || match);

  return cleanStr
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove remaining diacritics
    .replace(/[\s-]+/g, '_')          // replace spaces and dashes with underscore
    .replace(/[^a-z0-9_]/g, '');      // keep only lowercase alphanumeric and underscores
}

/**
 * Formats a snake_case vehicle ID back to a human-readable Title Case string.
 * e.g., 'triumph_tiger' -> 'Triumph Tiger', 'peugeot_moto' -> 'Peugeot Moto'
 */
export function formatVehicleIdToLabel(id: string): string {
  if (!id) return '';
  if (!id.includes('_')) {
    return id.trim();
  }
  return id
    .split('_')
    .map(word => {
      if (word === 'car') return 'Car';
      if (word === 'moto') return 'Moto';
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

/**
 * Returns localized brand string or formats snake_case if custom.
 */
export function getLocalizedVehicleBrand(brandId: string, t: any): string {
  if (!brandId) return '';
  // Heuristic: if brandId is not a lowercase snake_case ID token (i.e. contains spaces, capitals, or other symbols), return as-is.
  if (!/^[a-z0-9_]+$/.test(brandId)) {
    return brandId;
  }
  const translated = t(`brands.${brandId}`, '');
  if (translated && translated !== `brands.${brandId}`) return translated;
  return formatVehicleIdToLabel(brandId);
}

/**
 * Returns localized model string, supporting both plain model and 'model (year)' format.
 */
export function getLocalizedVehicleModel(modelId: string): string {
  if (!modelId) return '';
  // Clean target model from any trailing '(year)' formatting first
  const cleanModelId = modelId.replace(/\s*\(\d{4}\)$/, '');
  // Heuristic: if modelId (excluding trailing year) is not a lowercase snake_case ID token, return as-is.
  if (!/^[a-z0-9_]+$/.test(cleanModelId)) {
    return modelId;
  }
  const matches = modelId.match(/^(.+?)\s*\((.+?)\)$/);
  if (matches) {
    const rawModel = matches[1];
    const year = matches[2];
    return `${formatVehicleIdToLabel(rawModel)} (${year})`;
  }
  return formatVehicleIdToLabel(modelId);
}

