# Global Proactive Multilingual Synchronization & i18n Guardrails (26-Language Mandate)

**Scope:** Kullanıcıya görünen metin veya arayüz içeren **HERGÜN VEYA HER GÖREVDE** istisnasız aktif. Bu dosya i18n için **TEK VE ZORUNLU KAYNAK**tır.

---

## 1. ZORUNLU OTOMATİK 26 DİL PROAKTİF SENKRONİZASYONU
- **Kullanıcı Hatırlatması Beklenemez:** Uygulamaya yeni bir buton (`KODLA`, `KALDIR`, `KAPAT`, `KAYDET`), modal, başlık, UI rozeti, hata uyarısı VEYA veritabanına eklenen OEM özellik isimleri ve açıklamaları (`features.items.*.name`, `features.items.*.desc`) eklendiğinde veya değiştirildiğinde; AI ajan **KULLANICI SÖYLEMEDEN OTOMATİK OLARAK** 26 desteklenen dil dosyasının tamamını (`tr, en, de, fr, es, it, el, hi, ar, ru, zh, ja, ko, pt, nl, sv, da, fi, no, pl, cs, hu, ro, th, uk, id`) native yerel çevirileri ile güncellemek zorundadır.
- "Sadece Türkçe veya İngilizce ekledim, diğerlerini kullanıcı söyleyince ekleyeceğim" veya "Butonları çevirdim ama liste elemanlarının açıklamaları İngilizce kaldı" mantığı KESİNLİKLE YASAKTIR.

---

## 2. KARIŞIK DİL UX YASAĞI (ZERO MIXED-LANGUAGE UI)
- **%100 Dil Bütünlüğü:** Kullanıcı hangi dili seçerse seçsin (Almanca, Fransızca, Yunanca, Hintçe, Arapça, Çince, Türkçe vs.), ekrandaki **TÜM METİNLER VE LİSTE ELEMANLARI** (başlıklar, kart açıklamaları, butonlar, voltaj barları, kilit uyarıları) **İSTİSNASIZ O DİLDE RENDER EDİLECEKTİR.**
- Bir ekranda butonlar Arapça/Çince iken liste elemanı açıklamalarının İngilizce kalması (karışık/Frankenstein dil UX) KESİNLİKLE YASAKTIR.

---

## 3. HAM METİN / HARDCODED STRING YASAĞI
- Hiçbir kullanıcıya görünen metin (buton etiketi, hata uyarısı, kart açıklaması, arıza uyarısı) doğrudan UI layout component (`.tsx`), custom hook veya modal içine ham metin (hardcoded literal) olarak yazılamaz.
- Tüm metinler `t('key', 'Default English')` formatında i18n anahtar ağacı üzerinden dinamik çözümlenmelidir.

---

## 4. OTOMATİK DİL MATRİSİ ÇALIŞTIRMA VE TEST PROSEDÜRÜ
- Her UI veya i18n değişikliği yapıldıktan hemen sonra aşağıdaki adımlar otomatik sırayla çalıştırılmalıdır:
  1. `node scripts/translate-all-26-features.js` çalıştırılarak veritabanı elemanlarının 26 dile çevirisi işlenir.
  2. `node scripts/sync-26-matrix.js` betiği çalıştırılarak 26 dildeki JSON dosyalarında sıfır eksik anahtar kaldığı doğrulanır.
  3. `node scripts/qa-i18n-audit.js` otomasyonu koşturularak 26 dilde sıfır kayma ve sıfır hardcode ihlali kanıtlanır.
  4. `npx tsc --noEmit` ile tip kontrolleri yapılır.
  5. `npx jest src/core/__tests__/GlobalUdsEngine.test.ts` çalıştırılarak 26 dil anahtar matrisinin %100 senkronize olduğu birim test ile kanıtlanır.

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
