# 🔬 MotoCortex Arıza Kodları (DTC) & Açıklamaları Bağımsız Denetim Direktifi

> **Kullanım:** Aşağıdaki prompt metnini kopyalayıp **GitHub Copilot Chat** penceresine yapıştırın.

---

```markdown
Sen kıdemli bir Otomotiv Teşhis Yazılımı ve SAE J2012 / ISO 15031 Standartları Uzmanısın (Automotive Diagnostic Protocol & DTC Expert).
MotoCortex projesindeki Arıza Teşhis Kodları (DTC) kütüphanesi, ayrıştırma mekanizması (parser) ve yerelleştirilmiş arıza açıklamaları üzerinde bağımsız ve kapsamlı bir denetim yapmanı istiyorum.

### 📂 İncelemen Gereken Dosyalar:
1. `src/data/dtcDictionary.ts` (Statik ve dinamik chunk'lı DTC sözlüğü ve arama motoru)
2. `src/core/parser/DtcStreamParser.ts` (Mode 03, Mode 07 ve Mode 0A ham Hex/ASCII yanıt ayrıştırıcısı)
3. `src/locales/` altındaki dil dosyaları (26 dil DTC çeviri desteği)
4. `src/components/InspectionReportView.tsx` & `src/screens/MainApp.tsx` (DTC'lerin kullanıcı arayüzüne yansıtılması)

---

### 🔍 Lütfen Şu 5 Kritik Başlıkta Denetim Yap ve Raporla:

1. **DTC Kapsamı ve Kod Çeşitliliği:**
   - Standart Powertrain (P0xxx), Üreticiye Özel Powertrain (P1xxx, P2xxx, P3xxx), Gövde (B0xxx, B1xxx), Şasi/ABS (C0xxx, C1xxx) ve Ağ/CAN (U0xxx, U1xxx) kodlarının kapsayıcılığı yeterli mi? Eksik kalan kritik kod blokları var mı?

2. **DtcStreamParser Hex Ayrıştırma Doğruluğu:**
   - `43 01 01 03 00 00` veya ISO-TP çok satırlı (multi-frame) yanıtlardan 5 haneli DTC'leri (örn. P0101, P0300) ayrıştırırken bayt kayması, çift sayma veya kod yutma riski var mı?

3. **DTC Açıklamalarının Güncelliği & Teknik Doğruluğu:**
   - Sözlükteki açıklamalar SAE J2012 / ISO 15031-6 uluslararası standartlarına uygun mu? Açıklamalar kullanıcıya ve teknisyene yeterli arıza teşhis rehberliği sağlıyor mu?

4. **Dinamik Yükleme (Chunking) & Bellek Performansı:**
   - `prefetchDtcChunksForCodes` ve dinamik içe aktarma mekanizması binlerce kod içeren veritabanında bellek sızıntısı (memory leak) veya takılmaya yol açıyor mu?

5. **26 Dil Yerelleştirme & Fallback Güvenliği:**
   - Kullanıcı uygulamayı Türkçe dışındaki dillerde (İngilizce, Almanca, Fransızca, İspanyolca vb.) kullandığında, sözlükte olmayan bir kod gelirse sistem çökmek yerine güvenli bir standart açıklama (Fallback) üretiyor mu?

---

### 📋 Beklenen Çıktı Formatı:
- Tespit edilen zayıf yönler ve eksik kod grupları
- Varsa parser veya dictionary içinde riskli satırlar
- Geliştirme ve zenginleştirme önerileri
- DTC Doğruluk & Kapsayıcılık Puanı (1-100)
```
