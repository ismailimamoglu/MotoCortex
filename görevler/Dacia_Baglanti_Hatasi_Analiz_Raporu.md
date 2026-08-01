# 2011 Dacia Logan Bağlantı Hatası — Log Analizi ve Global Protokol Kapsamı Raporu

**İncelenen log:** `motocortex_rolling.log` (2026-08-01, 11:55:35 - 11:56:23 arası bağlantı denemesi)

---

## 1. Özet Teşhis

Bu log, uygulamanın **kendi tanımladığı 4 fallback protokolünün tamamını sırayla denediğini ve hiçbirinde başarılı olamadığını** gösteriyor. Bu, rastgele bir hata değil — sistematik bir protokol kapsamı boşluğuna işaret ediyor. Ayrıca, bu logun kendisinde **kritik bir görünürlük eksikliği** var ki bu, gelecekteki her saha sorununu teşhis etmenizi zorlaştıracak.

---

## 2. En Kritik Bulgu: Log'da Hiç RX (Cihaz Yanıtı) Kaydı Yok

Log dosyasındaki **her satır `[BT_WRITE]` etiketli** — yani sadece uygulamanın adaptöre **gönderdiği** komutlar kayıtlı. Adaptörün veya araç ECU'sunun **döndüğü hiçbir yanıt (`NO DATA`, `UNABLE TO CONNECT`, `BUS INIT: ERROR`, `CAN ERROR` gibi) loglanmamış.**

**Bu neden en öncelikli sorun:** Bu eksiklik olduğu sürece, ne siz ne de ben, gelecekte gelecek herhangi bir saha logundan **gerçekte ne olduğunu** anlayamayız. Şu an elimizdeki log sadece "uygulama şunu denedi, şunu denedi, şunu denedi" diyor ama **adaptörün/aracın buna nasıl karşılık verdiğini hiç göstermiyor.** Sorun şu üç ihtimalden hangisi olabilir, bu logdan asla anlayamayız:
1. Adaptör hiç yanıt vermedi (fiziksel/kablo sorunu).
2. Adaptör bir hata mesajı döndü (`BUS INIT: ERROR`, `NO DATA` vb.) ama bu mesaj bir yerde kayboldu.
3. Adaptör doğru yanıt verdi ama uygulama bunu yanlış parse etti.

**Talimat (Acil, Diğer Her Şeyden Önce):** `BT_WRITE` loglamasının yanına bir **`BT_READ`/`BT_RESPONSE`** log kanalı ekleyin — adaptörden gelen her ham yanıt, gönderilen komutla eşleşecek şekilde kaydedilmeli. Bu olmadan, sahadan topladığınız hiçbir log gerçek bir teşhis değeri taşımaz; sadece "bağlanamadı" der ama "neden" sorusuna asla cevap veremez.

---

## 3. Protokol Zinciri Analizi — Tam Sırayla Çalışmış, Ama Hiçbiri Tutmamış

Log, konuşmamızın en başında tanımladığınız "Otomatik Kurtarma Zinciri"nin **birebir çalıştığını** doğruluyor:

```
AT SP 0 (auto) → [başarısız/timeout]
→ AT PC → AT WS → AT ST FF → AT TP 6 (CAN 11-bit/500k) → [başarısız]
→ AT PC → AT WS → AT ST FF → AT TP 7 (CAN 29-bit/500k) → [başarısız]
→ AT PC → AT WS → AT ST FF → AT TP 5 (KWP2000 Fast Init) → [başarısız]
→ AT PC → AT WS → AT ST FF → AT TP 3 (ISO 9141-2 5-baud Slow Init) → [başarısız]
→ [zincir tükendi, log sonlandı]
```

Toplam süre: ~46 saniye (11:55:35 → 11:56:21). Uygulamanın mantığı doğru çalışmış — sorun kurtarma zincirinin **mantığında değil, zincirin içeriğinde.**

---

## 4. Kök Neden Hipotezi: Zincirde Eksik Olan Tam Olarak 2011 Dacia'nın İhtiyaç Duyabileceği Protokol

Burada teknik olarak somut ve önemli bir nokta var: **2011 model Dacia Logan (ilk nesil, B90 platformu), pazara ve motor/ECU tedarikçisine (Delphi/Continental) bağlı olarak, çoğunlukla ISO 9141-2 veya ISO 14230-4 (KWP2000) K-Line protokollerini kullanır — CAN bus değil.** Bu motor ailesi için CAN protokolüne (`AT TP 6`/`AT TP 7`) hiç geçmemesi normal, zaten log da bunu gösteriyor (CAN denemeleri hızlıca elenmiş).

**Asıl dikkat çekici nokta:** `AT TP 5` (KWP2000 **Fast** Init) ve `AT TP 3` (ISO 9141-2 **5-baud** Init) denenmiş ama **`AT TP 4` (ISO 14230-4 KWP2000 — 5-baud Slow Init, Fast Init'in bir alternatifi olarak) hiç denenmemiş.** ELM327 protokol numaralandırmasında bu, gözden kaçan bir ara protokol:

| ELM327 Protokol No | Tanım | Bu Zincirde Var mı? |
|---|---|---|
| 3 | ISO 9141-2 (5-baud init) | ✅ Denendi |
| 4 | ISO 14230-4 KWP (**5-baud init**) | ❌ **Eksik** |
| 5 | ISO 14230-4 KWP (Fast init) | ✅ Denendi |
| 6 | ISO 15765-4 CAN (11-bit/500k) | ✅ Denendi |
| 7 | ISO 15765-4 CAN (29-bit/500k) | ✅ Denendi |
| 8 | ISO 15765-4 CAN (11-bit/**250k**) | ❌ **Eksik** |
| 9 | ISO 15765-4 CAN (29-bit/**250k**) | ❌ **Eksik** |

**Neden bu önemli:** 2011 Logan'ın kullandığı Delphi/Renault ECU kalibrasyonlarının bir kısmı, **KWP2000'i fast init değil, 5-baud (slow) init ile** başlatır — bu, fast init'ten farklı bir el sıkışma prosedürüdür ve ELM327'de ayrı bir protokol numarasıdır (`4`). Şu anki zincirinizde bu numara **hiç denenmiyor** — yani uygulamanız, tam da bu yaşlı Renault/Dacia grubu araçların ihtiyaç duyabileceği protokolü **atlıyor.**

Ayrıca 250 kbaud CAN (protokol 8/9) bazı Renault-Nissan-Dacia platformlarında ve ağır ticari araçlarda kullanılıyor — bu da zincirde yok.

**Talimat:** Kurtarma zincirine şu iki adımı ekleyin:
1. `AT TP 4` (KWP2000 5-baud init) — özellikle `AT TP 5` (fast init) başarısız olduktan hemen sonra denenmeli, çünkü aynı protokol ailesinin (KWP2000) alternatif el sıkışma yöntemi.
2. `AT TP 8`/`AT TP 9` (250 kbaud CAN varyantları) — CAN denemeleri (6/7) başarısız olduğunda ek bir adım olarak.

---

## 5. İkinci Hipotez: Adaptör veya Fiziksel Bağlantı Sorunu

`AT TP 3` (ISO 9141-2, 5-baud init) denemesi de başarısız oldu. Bunun bir başka olası açıklaması var ve bu, protokol zincirinden bağımsız bir sorun olabilir:

**5-baud slow init, OBD dünyasında bilinen en hassas ve en sık sorun çıkaran el sıkışma prosedürüdür** — çok kesin bit zamanlamasına dayanır ve **ucuz ELM327 klonlarının çoğu bunu düzgün uygulayamaz** (gerçek/orijinal STN tabanlı çipler bunu daha güvenilir yapar). Eğer bu testte kullanılan adaptör bir klon ise, `AT TP 3` ve `AT TP 4`'ün her ikisi de (5-baud tabanlı oldukları için) güvenilmez şekilde başarısız olabilir — bu, protokol zincirinizin eksikliğinden değil, **donanımın kendisinden** kaynaklanan bir sorun olabilir.

**Ayrıca göz önünde bulundurulması gerekenler:**
- 2011 model gibi eski araçlarda OBD2 portu kablo/pin arızaları (özellikle Türkiye/Romanya pazarında yaygın olan aftermarket alarm/immobilizer kurulumlarının K-Line pinine (Pin 7) müdahale etmesi) sık görülen bir durumdur.
- Bu test için kullanılan adaptörün model/çip tipini (gerçek STN mi, klon mu) doğrulamanızı öneririm — bu, sorunun uygulamada mı yoksa donanımda mı olduğunu ayırt etmenin en hızlı yolu.

**Talimat:** Mümkünse bu aracı, **bilinen/sertifikalı bir adaptörle (örn. gerçek OBDLink veya doğrulanmış bir STN2xxx tabanlı cihaz) tekrar test edin.** Eğer bilinen iyi bir adaptörle de bağlanamıyorsa, sorun protokol zincirinde veya araçtaki fiziksel bir arızada; eğer bağlanabiliyorsa, sorun test edilen adaptörün 5-baud init implementasyonunda.

---

## 6. Global Ölçek İçin Genel Öneri — Bu Tek Vaka, Daha Büyük Bir Örüntünün Habercisi

Bu, sadece bir Dacia'ya özel bir sorun değil — **dünya genelinde hâlâ çok sayıda 2000'ler-2010'lar model araç K-Line (ISO 9141-2/KWP2000) kullanıyor** ve bu protokol ailesi, CAN'a göre çok daha fazla varyant ve edge-case içeriyor (5-baud vs fast init, farklı zaman aşımı toleransları, üretici-özel varyasyonlar). Global lansmanda, özellikle Doğu Avrupa, Güney Amerika, Kuzey Afrika ve Güneydoğu Asya gibi eski araç parkının yaygın olduğu pazarlarda, **bu protokol ailesinin eksiksiz kapsanması CAN'dan daha kritik olabilir** — çünkü bu pazarlardaki araçların büyük kısmı henüz CAN'a geçmemiş.

**Talimat:** Kurtarma zincirini yukarıdaki eksik iki protokolle (TP4, TP8/9) tamamladıktan sonra, özellikle K-Line ailesi için **daha uzun zaman aşımı toleransı** (5-baud init'in doğası gereği daha yavaş olduğunu unutmayın) ve **RX logu ile birlikte** bu tür araçlarda saha testi tekrarlanmalı.

---

## 7. Öncelik Sıralı Özet

| # | Görev | Öncelik |
|---|---|---|
| 1 | `BT_WRITE`'ın yanına `BT_READ`/`BT_RESPONSE` log kanalı ekle — RX verisi olmadan hiçbir saha logu teşhis değeri taşımıyor | 🔴 Acil |
| 2 | Kurtarma zincirine `AT TP 4` (KWP2000 5-baud init) ekle | 🔴 Yüksek |
| 3 | Kurtarma zincirine `AT TP 8`/`AT TP 9` (250 kbaud CAN) ekle | 🟠 Orta-Yüksek |
| 4 | Bu spesifik Dacia'yı bilinen/sertifikalı bir adaptörle tekrar test et — sorunun app mi yoksa donanım mı olduğunu ayır | 🟠 Orta-Yüksek |
| 5 | K-Line protokol ailesi için zaman aşımı toleranslarını gözden geçir (5-baud init doğası gereği yavaştır) | 🟡 Orta |
| 6 | OBD port fiziksel/kablo kontrolü için sahadaki teknisyene bir kontrol listesi hazırla (aftermarket alarm K-Line müdahalesi vb.) | 🟢 Düşük-Orta |

---

## 8. Sonuç

Bu log, uygulamanızın kurtarma zinciri mantığının doğru çalıştığını ama **zincirin içeriğinin eksik olduğunu** kanıtlıyor — özellikle KWP2000 5-baud init (`AT TP 4`) ve 250 kbaud CAN (`AT TP 8/9`) hiç denenmemiş. Ayrıca, bu ve gelecekteki tüm saha loglarının gerçek teşhis değeri taşıması için **RX/yanıt loglamasının acilen eklenmesi şart** — şu anki log formatı, "bağlanamadı" der ama hiçbir zaman "neden" sorusuna cevap veremez. Bu iki değişiklik (eksik protokoller + RX loglama) yapıldıktan sonra, hem bu spesifik Dacia'yı hem de gelecekte karşılaşacağınız benzer eski-nesil K-Line araçları çok daha güvenilir şekilde teşhis edebilirsiniz.
