# ELM327 Bağlantı & Handshake Playbook
### Torque Pro / Car Scanner / OBD Fusion seviyesinde hızlı, stabil, evrensel bağlantı (iOS & Android)

> Hedef: kablo/soket açıldıktan sonra **1–2 saniye** içinde canlı PID akışı (RPM, Hız, Voltaj), UART buffer kilitlenmesi olmadan, klon ELM327'leri dondurmadan.

---

## 0. Taşıma katmanı (transport) kuralları — her şeyin temeli

| Platform | Adaptör tipi | Kural |
|---|---|---|
| Android | BT Classic (SPP) | `UUID 00001101-...`; `createRfcommSocketToServiceRecord`, başarısızsa `createInsecureRfcomm...`, son çare reflection `createRfcommSocket(1)`. Bağlantı öncesi `cancelDiscovery()` **zorunlu**. |
| Android / iOS | BLE (4.0/5.x) | Servis genelde `FFF0` (write `FFF1`/`FFF2`, notify `FFF1`), Vgate iOS `18F0` (write `2AF1`, notify `2AF0`). `setCharacteristicNotification` + CCCD `2902` yazımı şart. |
| iOS | BT Classic | **Kullanılamaz** (MFi olmadan). iOS'ta yalnız BLE veya WiFi. |
| iOS/Android | WiFi | TCP `192.168.0.10:35000` (yaygın), Android'de `bindProcessToNetwork` ile trafiği WiFi'ye sabitle. |

**BLE için kritik:** MTU. Android'de bağlantıdan hemen sonra `requestMtu(185)` (cevabı bekle, sonra servis keşfi). Klonların çoğu 20 byte payload ile çalışır → **komutları 20 byte'ı aşacak şekilde birleştirme**, tek satır tek komut gönder.

---

## 1. Standart init AT dizisi (tam sıra)

Her komut `\r` ile biter. **Her komuttan sonra `>` prompt karakteri beklenir** — sabit `sleep` kullanma, prompt'u bekle (bu, buffer stall'un 1 numaralı çözümüdür).

```text
1  ATZ            # reset (tek sefer, 1000 ms timeout, cevap: "ELM327 v1.5")
2  ATE0           # echo off  -> parse yükünü yarıya indirir
3  ATL0           # linefeed off
4  ATS0           # boşlukları kaldır -> daha az byte, daha hızlı UART
5  ATH0           # header off (başlangıçta; multi-ECU ayrımı gerekince ATH1)
6  ATAT1          # adaptive timing (klonlarda AT2 riskli, AT1 güvenli)
7  ATST32         # timeout = 0x32*4ms ≈ 200 ms
8  ATSP0          # otomatik protokol arama
9  0100           # ilk gerçek istek -> protokolü kilitler, desteklenen PID bitmap'i döner
10 ATDPN          # kilitlenen protokol numarasını oku (1..C)
11 ATSP<n>        # bulunan protokolü SABİTLE -> sonraki reconnect'ler <300 ms
```

Notlar:
- `ATZ` yerine hızlı yeniden bağlanmada `ATWS` (warm start) kullan; ~600 ms kazandırır.
- `ATI` / `ATRV` sadece teşhis/voltaj için; init zincirine sokma.
- `ATE0` **öncesinde** gelen echo satırlarını parser'ın tolere etmesi gerekir.
- `ATSP0` sonrası **ATDPN ile bulunan protokolü kalıcı sakla** (adaptör MAC + araç VIN anahtarıyla). Bir sonraki oturumda 8–10. adımlar atlanır: `ATSP6` → `0100` → akış.

### Yasak/riskli komutlar (klon dondurucular)
`ATCAF0` (gereksiz raw CAN), `ATMA` (monitor all — çıkışı yalnız fiziksel reset durdurur), `ATBRD` (baud değiştirme, klonlarda kalıcı bricking riski), `ATPP` (programlanabilir parametre yazma), `ATAT2`, `ATSP0` ile birlikte `ATCM/ATCF` maskeleri.

---

## 2. K-Line (ISO 9141-2 / KWP2000) vs CAN (ISO 15765-4) — kilitlenmeden yönetim

**Ana kural: tek bir kod yolu, protokole göre yalnız *zamanlama* ve *çerçeveleme* değişir.**

| Özellik | ISO 9141-2 / ISO 14230-4 (K-Line) | ISO 15765-4 (CAN) |
|---|---|---|
| ELM protokol no | 3, 4, 5 | 6 (11-bit/500k), 7 (29-bit/500k), 8/9 (250k) |
| Init süresi | 2–5 sn (5-baud veya fast init) | < 200 ms |
| Cevap süresi/PID | 60–120 ms | 15–40 ms |
| Güvenli `ATST` | `ATST64` (≈400 ms) | `ATST32` (≈200 ms) |
| Çoklu PID isteği | **Yapma** (tek PID/istek) | `010C0D0546` (max 6 PID) desteklenir |
| Keep-alive | Gerekli: 2 sn'de bir istek yoksa bus düşer | Gerekmez |
| Multi-frame | ISO-TP yok/sınırlı | ELM otomatik birleştirir (`ATCAF1` açık kalsın) |

Uygulama stratejisi:
1. Protokol numarasını `ATDPN` ile öğren → `profile = KLINE | CAN`.
2. **K-Line profilinde**: sorgu havuzunu tek-PID'e düşür, poll aralığını ≥120 ms yap, `ATST64`, ve boşta kalınca 1.5 sn'de bir `0100` "kalp atışı" gönder (aksi halde init tekrar gerekir, 5 sn kayıp).
3. **CAN profilinde**: PID'leri gruplayıp tek istekte 4–6 tanesini iste, 50–100 ms döngü.
4. `ATSP0` araması sırasında ard arda komut basma — arama sırasında adaptör cevapsız kalır; **sadece prompt bekle**, timeout 5 sn (K-Line araması bu kadar sürer).
5. `NO DATA` / `?` cevabı hata değildir: o PID desteklenmiyor → **PID'i kalıcı olarak listeden çıkar**, yeniden deneme yapma (klonlarda tekrar denemeler kuyruğu tıkar).
6. `BUFFER FULL` / `BUS BUSY` / `FB ERROR` → poll döngüsünü durdur, 500 ms bekle, `ATWS` + init'i 6. adımdan itibaren tekrarla; 3 başarısızlıkta soket kapat–aç.

---

## 3. Canlı veri akışına 1–2 saniyede ulaşan altın standart akış

```text
t=0 ms     Soket/GATT bağlantısı (BLE: connect -> MTU 185 -> discoverServices -> CCCD)
t≈150 ms   ATWS  (ilk kurulumda ATZ)          -> ">"
t≈250 ms   ATE0 ATL0 ATS0 ATH0 ATAT1 ATST32   -> her biri prompt bekleyerek, ~15 ms/komut
t≈350 ms   Kayıtlı profil var mı?
             VAR  -> ATSP<n>
             YOK  -> ATSP0
t≈400 ms   0100  -> desteklenen PID bitmap (00-1F)
t≈500 ms   0120 / 0140 (opsiyonel, destek haritasını tamamla; arka planda yapılabilir)
t≈550 ms   ATDPN -> profili kaydet (adaptör+VIN)
t≈600 ms   UI: "Bağlandı" + poll döngüsü BAŞLAT
           CAN : 010C0D0542  (RPM+Hız+Yük+Voltaj-ECU)  |  ATRV (gerçek batarya)
           KLINE: 010C -> 010D -> ATRV  sırayla
t≈700 ms   İlk RPM/Hız/Voltaj ekranda
```

Kritik: `0120`/`0140` ve VIN (`0902`) sorgularını **ilk ekran çizildikten sonra** arka planda yap. Bunları init'e koymak açılışı 1.5 sn geciktirir.

---

## 4. Pipeline'ı hafif tutan 8 kural (buffer stall önleme)

1. **Tek uçuşta tek komut.** Global bir `Mutex` + FIFO kuyruk; cevabı (`>`) gelmeden ikinci komut asla yazılmaz. Bu tek başına stall'ların ~%90'ını bitirir.
2. **Prompt tabanlı okuma**, satır sayısı tabanlı değil. Buffer'ı `>` görene kadar biriktir.
3. **Sabit gecikme yok.** `Thread.sleep(200)` gibi kalıplar hem yavaş hem güvensiz.
4. **Yazma öncesi giriş buffer'ını temizle** (stale byte'lar bir sonraki cevabı bozar).
5. **Komut başına timeout**: init 1000 ms, `ATSP0`+`0100` 5000 ms, normal PID 300 ms. Timeout'ta kuyruğu boşalt, komutu **tekrar etme** (tekrar = çift cevap = desenkronizasyon).
6. **Adaptif poll hızı**: cevap süresini ölç, ortalamanın 1.2 katını döngü aralığı yap. Adaptör yavaşlarsa otomatik geri çekil.
7. **Ekranda görünmeyen PID'i sorgulama.** Aktif görünüm neyse onu iste (Torque'un yaptığı budur).
8. **BLE'de write tipi**: `WRITE_NO_RESPONSE` daha hızlı ama bazı klonlarda veri kaybettirir → önce `WRITE_DEFAULT`, 3 başarılı turdan sonra no-response'a geç.

---

## 5. Cevap ayrıştırma (parse) kısa referansı

| Yanıt | Anlam | Aksiyon |
|---|---|---|
| `41 0C 1A F8` | RPM = ((0x1A*256)+0xF8)/4 = 1726 | Göster |
| `41 0D 50` | Hız = 80 km/h | Göster |
| `SEARCHING...` | Protokol aranıyor | Bekle, komut gönderme |
| `NO DATA` | PID desteklenmiyor | PID'i kalıcı devre dışı bırak |
| `STOPPED` | İstek kesildi | Aynı komutu bir kez tekrarla |
| `UNABLE TO CONNECT` | Kontak kapalı / yanlış protokol | `ATSP0` ile tam yeniden arama |
| `BUS INIT: ERROR` | K-Line init başarısız | 1 sn bekle, `ATWS` + tekrar |
| `CAN ERROR` | Yanlış baud (250k/500k) | `ATSP7`/`ATSP9` alternatiflerini dene |
| `?` | Komut anlaşılmadı | Komutu destekleme listesinden çıkar |

---

## 6. Uygulama kontrol listesi

- [ ] Bağlantı durum makinesi: `IDLE → CONNECTING → INITIALIZING → PROTOCOL_DETECT → READY → POLLING → (DEGRADED) → CLOSING`
- [ ] Adaptör profili kalıcı saklama (MAC/UUID + protokol no + desteklenen PID bitmap + VIN)
- [ ] Komut kuyruğu + mutex + prompt tabanlı okuyucu
- [ ] K-Line keep-alive zamanlayıcısı
- [ ] Klon-yasaklı komut kara listesi
- [ ] Otomatik yeniden bağlanma: 1s, 2s, 4s, 8s (üstel geri çekilme, max 5 deneme)
- [ ] iOS: BT Classic yok — kullanıcıya BLE/WiFi adaptör uyarısı
- [ ] Android 12+: `BLUETOOTH_SCAN` + `BLUETOOTH_CONNECT` runtime izinleri
