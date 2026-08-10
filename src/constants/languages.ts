import { AppLanguage } from '../store/useAppStore';

export interface LanguageItem {
  code: AppLanguage;
  name: string;
  flag: string;
  nativeName: string;
  sub: string;
}

export const ALL_26_LANGUAGES: LanguageItem[] = [
  { code: 'ar', name: 'العربية', flag: '🇸🇦', nativeName: 'العربية', sub: 'Arabic Diagnostics Hub' },
  { code: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩', nativeName: 'Bahasa Indonesia', sub: 'Indonesian Diagnostics Hub' },
  { code: 'cs', name: 'Čeština', flag: '🇨🇿', nativeName: 'Čeština', sub: 'Czech Diagnostics Hub' },
  { code: 'da', name: 'Dansk', flag: '🇩🇰', nativeName: 'Dansk', sub: 'Danish Diagnostics Hub' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪', nativeName: 'Deutsch', sub: 'German Diagnostics Hub' },
  { code: 'el', name: 'Ελληνικά', flag: '🇬🇷', nativeName: 'Ελληνικά', sub: 'Greek Diagnostics Hub' },
  { code: 'en', name: 'English', flag: '🇬🇧', nativeName: 'English (US)', sub: 'English Diagnostics Hub' },
  { code: 'es', name: 'Español', flag: '🇪🇸', nativeName: 'Español', sub: 'Spanish Diagnostics Hub' },
  { code: 'fr', name: 'Français', flag: '🇫🇷', nativeName: 'Français', sub: 'French Diagnostics Hub' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳', nativeName: 'हिन्दी', sub: 'Hindi Diagnostics Hub' },
  { code: 'hu', name: 'Magyar', flag: '🇭🇺', nativeName: 'Magyar', sub: 'Hungarian Diagnostics Hub' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹', nativeName: 'Italiano', sub: 'Italian Diagnostics Hub' },
  { code: 'ja', name: '日本語', flag: '🇯🇵', nativeName: '日本語', sub: 'Japanese Diagnostics Hub' },
  { code: 'ko', name: '한국어', flag: '🇰🇷', nativeName: '한국어', sub: 'Korean Diagnostics Hub' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱', nativeName: 'Nederlands', sub: 'Dutch Diagnostics Hub' },
  { code: 'no', name: 'Norsk', flag: '🇳🇴', nativeName: 'Norsk', sub: 'Norwegian Diagnostics Hub' },
  { code: 'pl', name: 'Polski', flag: '🇵🇱', nativeName: 'Polski', sub: 'Polish Diagnostics Hub' },
  { code: 'pt', name: 'Português', flag: '🇵🇹', nativeName: 'Português', sub: 'Portuguese Diagnostics Hub' },
  { code: 'ro', name: 'Română', flag: '🇷🇴', nativeName: 'Română', sub: 'Romanian Diagnostics Hub' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺', nativeName: 'Русский', sub: 'Russian Diagnostics Hub' },
  { code: 'fi', name: 'Suomi', flag: '🇫🇮', nativeName: 'Suomi', sub: 'Finnish Diagnostics Hub' },
  { code: 'sv', name: 'Svenska', flag: '🇸🇪', nativeName: 'Svenska', sub: 'Swedish Diagnostics Hub' },
  { code: 'th', name: 'ไทย', flag: '🇹🇭', nativeName: 'ไทย', sub: 'Thai Diagnostics Hub' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷', nativeName: 'Türkçe', sub: 'Türkçe Teşhis Arayüzü' },
  { code: 'uk', name: 'Українська', flag: '🇺🇦', nativeName: 'Українська', sub: 'Ukrainian Diagnostics Hub' },
  { code: 'zh', name: '中文', flag: '🇨🇳', nativeName: '简体中文', sub: 'Chinese Diagnostics Hub' },
].map((item) => ({ ...item, code: item.code as AppLanguage }))
 .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
