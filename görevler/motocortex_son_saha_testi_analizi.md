# MotoCortex — En Son Saha Testi Log Analizi (Fix Sonrası, Yine Bağlanamadı)

**Tarih:** 11 Ağustos 2026, 20:52–20:54
**Kaynak:** `motocortex_rolling.md` (2 ayrı bağlantı denemesi/oturum içeriyor)
**Bağlam:** İki güncelleme raporunda (livelock kırıcı, timeout uzatma, fast-path önbellekleme) anlatılan düzeltmelerden SONRA alınan gerçek saha logu.

---

## 🔴 Özet — En Önemli Bulgu

Bu log, önceki iki güncelleme raporunda "çözüldü" denen **iki spesifik sorunun aslında hâlâ canlı olduğunu** ve bunun ötesinde **daha önce fark edilmemiş, muhtemelen bağlantının hiçbir zaman tamamlanamamasının asıl kök nedeni olan yeni bir mimari eksiklik** olduğunu gösteriyor:

1. **`AT DP` + `ATWS` çakışması aynı imzayla tekrar ediyor** (Oturum 2) — livelock kırıcı/`isQueueBusy` düzeltmesi bu logda etkili görünmüyor.
2. **Yanıtlar, geldikleri anda değil, timeout süresi dolmak üzereyken okunuyor** — bu, protokol taramasının neden hâlâ çok yavaş sürdüğünü açıklıyor (adaptör aslında ~150-300ms'de yanıt veriyor, ama uygulama bunu ~5 saniye sonra fark ediyor).
3. **🔴 EN KRİTİK: Uygulama, hiçbir protokol denemesinde gerçek bir ECU sorgusu (`0100` gibi bir PID isteği) göndermiyor.** Sadece `AT SPx` komutuna `OK` alması yeterli sayılıyor gibi görünüyor — ama `OK`, sadece "adaptör bu protokol ayarını kabul etti" demektir, **"araç ECU'su bu protokolde yanıt verdi" anlamına gelmez.** Log'da neredeyse denenen HER protokolde `OK` alınmasına rağmen bağlantı hiç tamamlanmıyor — bu, başarı kriterinin yanlış (veya eksik) tanımlandığına işaret ediyor.

Bu üçü birlikte, Infocar'ın neden anında bağlandığını ve MotoCortex'in neden hâlâ bağlanamadığını çok daha net açıklıyor.

---

## 1. Oturum 1 Analizi (20:52:16 – 20:54:05, ~109 saniye, sonunda sessizce sonlandı)

### 1.1 `AT Z` yine boşluklu gönderiliyor, yine `?` yanıtı alınıyor
```
20:52:17.293  AT Z            (yine boşluklu — "ATZ" değil)
20:52:20.915  READ: "? >"     (adaptör komutu anlamadı)
```
İlk incelemede işaret ettiğim **AT komut formatlama tutarsızlığı** (boşluklu vs bitişik) iki güncelleme raporunda da düzeltilmemiş — sadece timeout süreleri değiştirilmiş, komutların kendisi (`'AT Z'` string literal'i) hiç değişmemiş. Bu, klon çiplerde `?` hatasının hâlâ ilk adımda ortaya çıkmasının doğrudan sebebi olabilir.

### 1.2 Yazma/okuma senkronizasyonu hâlâ bozuk
```
20:52:21.847  WRITE: ATI
20:52:24.571  WRITE: AT RV        ← ATI'nin yanıtı henüz okunmadan yeni komut gönderildi
20:52:26.660  READ:  "ELM327 v1.5 >"   ← bu aslında ATI'nin (gecikmiş) yanıtı
20:52:26.668  WRITE: AT DP
20:52:30.411  READ:  "ISO 15765-4 (CAN 11/500) >"  ← AT DP yanıtı
```
`AT RV` (voltaj sorgusu) için log'da **hiçbir zaman ayrı bir yanıt görünmüyor** — muhtemelen ATI'nin gecikmiş yanıtıyla aynı okuma döngüsünde kayboldu/üzerine yazıldı. Bu, komut-yanıt eşleştirmesinin hâlâ sıkı (strict) olmadığının açık kanıtı.

### 1.3 🟠 Yanıtlar okunuyor ama çok geç okunuyor — asıl performans sorunu burada
Protokol tarama döngüsünde tekrarlayan desen:
```
20:52:39.227  WRITE: AT SP 6
20:52:44.234  WRITE: (boş)          ← ~5 saniye sonra
20:52:44.401  READ:  "OK >"         ← boş yazımdan sadece 167ms sonra!
```
Bu düzen **AT SP 7, 8, 9, 3, 1, 2** için de birebir tekrarlıyor: her seferinde `OK` yanıtı, uygulamanın "boş" bir yazım/kontrol yaptığı andan sadece 70-270ms sonra geliyor — yani **adaptör aslında yüz milisaniyeler içinde yanıt veriyor**, ama uygulama bunu ancak yaklaşık 5 saniyelik (yeni uzatılmış) timeout süresi dolmak üzereyken "fark ediyor".

**Sonuç:** Bu, timeout değerlerinin değil, **okuma mekanizmasının mimarisinin sorunu.** Uygulama muhtemelen Bluetooth soketinden gelen veriyi *anlık* (event/callback ile, veri geldiği an) okumuyor; bunun yerine zamanlayıcı bazlı bir "sona yaklaşınca kontrol et" (polling) modeliyle çalışıyor gibi görünüyor. Bu doğruysa, **10 protokolü taramak zorunda kalan bir cihazda toplam süre gerçekte 1-2 saniyede bitebilecekken, mimari yüzünden 60-90 saniyeye çıkıyor** — geçen raporlarda önerdiğim "timeout'u uzat" çözümü bu sorunu maskeliyor ama kökten çözmüyor; tam tersine, timeout'lar uzadıkça bu bekleme süresi de büyüyor.

### 1.4 🔴 En kritik bulgu: Neredeyse HER protokol `OK` alıyor, ama hiçbiri "bağlandı" sayılmıyor
Bu oturumda denenen protokoller ve sonuçları:

| Protokol | Sonuç |
|---|---|
| AT SP 0 (Auto) | Yanıt yok / timeout |
| AT SP 6 (CAN 11b/500k) | ✅ OK |
| AT SP 7 (CAN 29b/500k) | ✅ OK |
| AT SP 8 (CAN 11b/250k) | ✅ OK |
| AT SP 9 (CAN 29b/250k) | ✅ OK |
| AT SP A (J1939) | ❌ Yanıt yok / timeout |
| AT SP 5 (KWP Fast Init) | ❌ Yanıt yok / timeout |
| AT SP 4 (KWP 5-Baud) | ❌ Yanıt yok / timeout |
| AT SP 3 (ISO 9141-2) | ✅ OK |
| AT SP 1 (J1850 PWM) | ✅ OK |
| AT SP 2 (J1850 VPW) | ✅ OK (son deneme) |

**7 protokolde `OK` alınmasına rağmen** hiçbiri "bağlandı" durumuna geçmiyor, döngü tüm listeyi tüketiyor ve log 76 saniye sessizlik sonrası `Session Ended: true` ile kendiliğinden kapanıyor.

Bunun teknik açıklaması muhtemelen şu: **`AT SPx` komutuna `OK` yanıtı, sadece "adaptör bu protokolü kullanmayı kabul etti" anlamına gelir — aracın ECU'sunun o protokolde gerçekten yanıt verdiğini KANITLAMAZ.** Gerçek bir bağlantı doğrulaması için, protokol seçildikten sonra **standart bir OBD-II sorgusu** (en yaygın örnek: `0100` — desteklenen PID'leri sorgulama) gönderilip **ECU'dan anlamlı bir yanıt (hex veri) geldiğinin** doğrulanması gerekir. Bu logda, ne Oturum 1'de ne de Oturum 2'de, **`0100` veya benzeri bir teşhis sorgusu hiç gönderilmiyor.** Uygulama sadece AT (adaptör yapılandırma) komutlarıyla uğraşıyor, hiçbir zaman gerçek araç verisi istemiyor.

**Bu, "her protokol OK dönüyor ama bağlanamıyoruz" paradoksunu tam olarak açıklar:** başarı kriteri (`ecuConnected = true`) muhtemelen bir ECU-yanıt doğrulama adımına bağlı, ama o adım bu akışta hiç tetiklenmiyor — kod yolunda eksik, yanlış yerde, ya da bu logda görünmeyen bir kanalda.

---

## 2. Oturum 2 Analizi (20:54:13 – 20:54:47, ~34 saniye) — Yeni Bir Regresyon İhtimali

Oturum 2, Oturum 1'den çok daha erken vazgeçilmiş görünüyor (sadece `AT SP 0` denenmiş, `AT SP 6`'ya bile geçilmemiş).

### 2.1 🔴 Kritik: `AT DP` + `ATWS` çakışması AYNI İMZAYLA tekrar ediyor
```
20:54:23.369  WRITE: AT DP
20:54:23.484  WRITE: ATWS      ← AT DP'den sadece 115ms sonra (İLK incelediğimiz log'daki 115ms'lik gecikmeyle BİREBİR AYNI!)
```
İki güncelleme raporunda da bu tam olarak hedeflenen ve "çözüldü" denen sorundu (`isQueueBusy()` kontrolü + `stallSkipCount` livelock kırıcı). Ama bu son sahada **aynı çakışma, aynı zamanlama imzasıyla** yeniden ortaya çıkıyor. Bu şu anlamlardan birine gelebilir:
- Test edilen build'de bu düzeltme fiilen mevcut değildi (deploy/push edilmemiş ya da farklı bir dala gitmiş olabilir), **veya**
- Düzeltme sadece `ADAPTER_STALL` kurtarma yolunu kapsıyor, ama `ATWS`'nin bu noktada **başka bir kod yolundan** (ör. `AT DP` sonrası otomatik bir "warm start" tetikleyicisi, önceki raporlarda bahsedilmeyen ayrı bir mantık) tetiklendiği ihtimali var.

### 2.2 🟠 Olası yeni regresyon: Livelock kırıcının tarama döngüsünü tamamen durdurmuş olma ihtimali
```
20:54:27.527  WRITE: AT SP 0
20:54:31.314  WRITE: AT PC        ← AT SP 0 başarısız/timeout, kapatıldı
20:54:32.133  WRITE: (boş)
                                   ← ve burada tarama tamamen duruyor, AT SP 6 hiç denenmiyor
20:54:47.281  Log export (kullanıcı vazgeçti)
```
Önceki günün logunda (düzeltme öncesi) döngü en azından **tüm 10 protokolü** sırayla deniyordu. Bu son oturumda döngü **yalnızca 1 protokolde (AT SP 0) takılıp tamamen duruyor.** Bu, önceki güncellemede eklenen `this.clear(new Error('LIVELOCK_RECOVERY_FORCE_CLEAR'))` çağrısının, sadece tek bir sıkışmış komutu temizlemek yerine **döngünün kendisini besleyen `await` zincirini de reddedip (`reject`) dış `for` döngüsünü sessizce sonlandırmış olma ihtimalini** düşündürüyor — yani stall kurtarma mekanizması, kurtarmaya çalıştığı süreci bizzat öldürüyor olabilir. Bu, önceki turdaki incelememde "force-clear'ın çağıran tarafta nasıl karşılandığının doğrulanması gerekir" notuyla işaret ettiğim riskin gerçekleşmiş hali olabilir.

**Bu doğruysa**, livelock kırıcı düzeltmesi bir sorunu (sessiz sonsuz kilitlenme) çözerken, muhtemelen ondan **daha sık tetiklenen ve daha erken vazgeçmeye yol açan yeni bir hata modu** yaratmış olabilir — Oturum 2'nin Oturum 1'den çok daha hızlı (34 sn'de) pes etmesi bunu destekliyor.

---

## 3. Infocar Karşılaştırmasının Güncellenmiş Anlamı

Infocar'ın aynı adaptör + araçla anında bağlanması artık şu üç maddeyle çok daha somut açıklanabilir:
- Muhtemelen komutları standart (boşluksuz) formatta gönderiyor → klon adaptörden ilk denemede `?` almıyor.
- Yanıtları soket üzerinden **olay bazlı (event-driven)** okuyor → her komut-yanıt turu yüz milisaniyeler sürüyor, saniyeler değil.
- Protokol seçiminden sonra **gerçek bir ECU sorgusu (`0100` vb.)** göndererek bağlantıyı doğruluyor, sadece `AT SPx` → `OK`'a güvenmiyor.

---

## 4. Öncelik Sırasına Göre Sonraki Adımlar

1. **(En kritik, kök neden)** Protokol seçiminden sonra gerçek bir OBD-II PID sorgusu (`0100`) gönderilip gönderilmediğini ve bağlantı başarı kriterinin (`ecuConnected`) tam olarak neye bağlı olduğunu kod üzerinde doğrulayın. Şu anki log, bu adımın hiç çalışmadığını/tetiklenmediğini gösteriyor.
2. `AT DP` + `ATWS` çakışmasının hangi kod yolundan geldiğini yeniden izleyin — `isQueueBusy`/livelock düzeltmesinin gerçekten bu build'de aktif olup olmadığını doğrulayın.
3. Livelock kırıcının `for` döngüsünü/dış `await` zincirini istemeden sonlandırıp sonlandırmadığını (Oturum 2'deki erken durma) kontrol edin — force-clear sonrası döngünün bir sonraki protokole geçtiğinden emin olun (`try/catch` içinde `continue` var mı?).
4. Okuma mekanizmasının polling mi yoksa event-driven mi olduğunu doğrulayın; mümkünse yanıtı `>` karakteri geldiği anda işleyip timeout'u erken iptal eden bir yapıya geçirin — bu, timeout değerlerini büyütmekten çok daha etkili bir çözüm olur.
5. `AT Z`, `AT RV`, `AT DP` gibi komutların boşluksuz standart formatta (`ATZ`, `ATRV`, `ATDP`) gönderildiğinden emin olun.

---

## 5. Not

Bu analiz yalnızca paylaşılan log dosyasına dayanıyor; yukarıdaki "muhtemelen"/"ihtimal" ifadeleriyle belirtilen noktalar (özellikle 2.2'deki döngü sonlandırma hipotezi) log verisinden çıkarılan güçlü ama dolaylı çıkarımlardır — kesinleştirmek için ilgili kod yolunun (`useBluetooth.ts` fallback döngüsü ve `OBD2ProtocolEngine.ts` clear/recovery mantığı) doğrudan incelenmesi gerekir.
