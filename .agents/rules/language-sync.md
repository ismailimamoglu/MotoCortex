# Global Proactive Multilingual Synchronization & i18n Guardrails (26-Language Mandate)

**Scope:** Kullanıcıya görünen metin veya arayüz içeren **HER GÜN VEYA HER GÖREVDE** istisnasız aktif. Bu dosya i18n için **TEK VE ZORUNLU KAYNAK**tır.

---

## 1. DERS ALINAN KURAL: 26 DİL MANUEL GÜNCELLENMEZ (MASTER OTOMASYON İŞ AKIŞI)
- **26 Dili Manuel Güncellemek Kesinlikle YASAKTIR:** AI Ajan 26 JSON dosyasını manuel günellemeye çalışmayacaktır.
- **Yeni İş Akışı (Mandatory Workflow):**
  1. Yeni bir UI metni veya anahtar eklendiğinde **SADECE `src/locales/en.json`** (Source of Truth) dosyası güncellenir.
  2. Hemen ardından `npm run i18n:sync` (`node scripts/sync-i18n.js`) komutu çalıştırılarak kalan 25 dil otomatik senkronize edilir.
  3. `bento` veya yeni dinamik modüller eklendiğinde `scripts/sync-i18n.js` içindeki `nativeMatrix` sözlüğüne ilgili dil karşılıkları tanımlanır.

---

## 2. KARIŞIK DİL UX YASAĞI (ZERO MIXED-LANGUAGE UI)
- **%100 Dil Bütünlüğü:** Kullanıcı hangi dili seçerse seçsin (Almanca, Fransızca, Yunanca, Hintçe, Arapça, Çince, Türkçe vs.), ekrandaki **TÜM METİNLER VE LİSTE ELEMANLARI** (başlıklar, kart açıklamaları, butonlar, voltaj barları, kilit uyarıları) **İSTİSNASIZ O DİLDE RENDER EDİLECEKTİR.**
- Dev modda eksik çeviri tespit edilirse `i18n.ts` üzerindeki `parseMissingKeyHandler` sayesinde ekranda `[MISSING: key_name]` uyarısı belirecektir.

---

## 3. HAM METİN / HARDCODED STRING YASAĞI (ESLINT COMPILER GUARD)
- Hiçbir kullanıcıya görünen metin (buton etiketi, hata uyarısı, kart açıklaması, arıza uyarısı) doğrudan UI layout component (`.tsx`), custom hook veya modal içine ham metin (hardcoded literal) olarak yazılamaz.
- `npm run lint` (`eslint-plugin-i18next`) kuralı aktiftir. JSX içerisinde ham kelime yazıldığında derleme aşamasında otomatik kırmızı hata verir.
- Tüm metinler `t('key')` formatında i18n anahtar ağacı üzerinden dinamik çözümlenmelidir.

---

## 4. ZORUNLU OTOMATİK VERİFİKASYON VE TEST PROSEDÜRÜ
Her UI veya i18n değişikliği yapıldıktan hemen sonra aşağıdaki adımlar otomatik sırayla çalıştırılmalıdır:
1. `npm run i18n:sync` çalıştırılarak 26 dilde `en.json` ile sıfır eksik anahtar kaldığı doğrulanır.
2. `node scripts/qa-i18n-audit.js` otomasyonu koşturularak 26 dilde sıfır kayma ve sıfır hardcode ihlali kanıtlanır.
3. `npm run lint` koşturularak JSX hardcode taraması yapılır.
4. `npx tsc --noEmit` ile tip kontrolleri yapılır.
5. `npm test -- --watchAll=false` çalıştırılarak tüm birim testlerin %100 geçtiği doğrulanır.

---

## 5. SUPPORTED 26-LANGUAGE MATRIX (26 DESTEKLENEN DİL LİSTESİ)
1. `tr` - Türkçe
2. `en` - English
3. `de` - Deutsch
4. `fr` - Français
5. `es` - Español
6. `it` - Italiano
7. `el` - Ελληνικά (Greek)
8. `hi` - हिन्दी (Hindi)
9. `ar` - العربية (Arabic)
10. `ru` - Русский (Russian)
11. `zh` - 中文 (Chinese)
12. `ja` - 日本語 (Japanese)
13. `ko` - 한국어 (Korean)
14. `pt` - Português
15. `nl` - Nederlands
16. `sv` - Svenska
17. `da` - Dansk
18. `fi` - Suomi
19. `no` - Norsk
20. `pl` - Polski
21. `cs` - Čeština
22. `hu` - Magyar
23. `ro` - Română
24. `th` - ไทย (Thai)
25. `uk` - Українська (Ukrainian)
26. `id` - Bahasa Indonesia
