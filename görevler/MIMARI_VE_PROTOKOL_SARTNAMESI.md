# 🛠️ MotoCortex Global Seviye Mimarı & Protokol Şartnamesi (v1.2.0)

Bu doküman, MotoCortex OBD2 teşhis ve OEM kodlama uygulamasının sıfırdan, temiz mimari (Clean Architecture) ile inşasında esas alınacak teknik el kitabıdır.

---

## 📌 1. Sütun: Temiz & Yalın Bağlantı Motoru (Clean Protocol Engine)

Eski sürümlerdeki karmaşık benchmark'lar, karaliste kilitleri ve 90 saniyelik gereksiz K-Line adres tarama döngüleri tamamen temizlenmiştir.

### ⚡ 4 Kademeli Yalın El Sıkışma Akışı:
$$\text{Soket Açılışı} \longrightarrow \text{AT Z} \longrightarrow \text{AT E0} \longrightarrow \text{AT SP 0} \longrightarrow \text{01 00 (Mode 01 PID 00)}$$

1. **Birincil Hızlı Bağlantı (`AT SP 0` - Otomatik):**
   - `AT Z` (Sıfırla) $\rightarrow$ `AT E0` (Yankı Kapat) $\rightarrow$ `AT SP 0` (Auto Protocol) $\rightarrow$ `01 00`.
   - Yanıt `41 00` gelirse **BAĞLANDI** (2.5 saniyenin altında iletişim başlar).

2. **Kesintisiz Halka Düşüşü (Fallback Ring - `AT SP 0` Zaman Aşımında):**
   `AT SP 0` yanıt vermezse soket koparılmadan `AT WS` (Warm Start) verilir ve halka devreye girer:
   - **Kademe A (Modern CAN Bus 500k):** `AT SP 6` (11bit) $\rightarrow$ `AT SP 7` (29bit) [2008+ Araçların %90'ı].
   - **Kademe B (Orta Hız CAN 250k):** `AT SP 8` (11bit) $\rightarrow$ `AT SP 9` (29bit) [Ford, Opel, GM].
   - **Kademe C (K-Line / KWP2000):** `AT SP 5` (FastInit) $\rightarrow$ `AT SP 3` (ISO 9141-2 5-Baud SlowInit) [Eski Dacia, Renault, Fiat, VW Golf 4].
   - **Kademe D (Legacy J1850):** `AT SP 1` (PWM) $\rightarrow$ `AT SP 2` (VPW) [Eski Ford/GM/Chrysler].

---

## 📌 2. Sütun: Masaüstü Mock Donanım Simülatörü (Mock Hardware Suite)

Araca gidip zaman kaybetmeyi engellemek için Jest ortamında (`npm test`) çalışan sanal bir ELM327 adaptörü ve ECU simülatörü kurulacaktır.

### 🧪 Simülasyon Kapsamı:
- **CAN Bus Simülasyonu:** `AT SP 6` ve `01 00` gönderildiğinde `41 00 00 18 3E 00` yanıtı üreterek 1 saniyede test doğrulama.
- **K-Line KWP FastInit Simülasyonu:** `AT SP 5` ve `01 00` için KWP header ve checksum doğrulama.
- **Hata Senaryoları:** Zaman aşımı (Timeout), `BUS INIT: ERROR` ve `NO DATA` durumlarının masaüstünde 2 saniyede sınanması.

---

## 📌 3. Sütun: Multi-ECU Modül Taraması (Çoklu Beyin Haritası)

Uygulama araç üzerindeki 4 temel kontrol ünitesini standart ISO 15765-4 (CAN) ve ISO 14230 (KWP) header adresleriyle sorgular:

| Modül Adı | Açıklama | CAN Tx Header | CAN Rx Header | K-Line Header |
| :--- | :--- | :--- | :--- | :--- |
| **ECM** | Motor Kontrol Ünitesi | `0x7E0` | `0x7E8` | `AT SH 81 10 F1` |
| **TCM** | Otomatik Şanzıman Beyni (DSG, EDC, ZF8) | `0x7E1` | `0x7E9` | `AT SH 81 18 F1` |
| **ABS/ESP** | Fren & Stabilite Kontrol Beyni | `0x7E2` | `0x7EA` | `AT SH 81 28 F1` |
| **SRS** | Hava Yastığı & Güvenlik Beyni | `0x7E3` | `0x7EB` | `AT SH 81 58 F1` |

---

## 📌 4. Sütun: 65+ Markalara Özel OEM Kodlama Veritabanı Yapısı

OEM gizli özellik aktivasyonları güvenli UDS / KWP2000 yazma komutlarıyla yapılacaktır:

### 1. VAG Grubu (Volkswagen, Audi, SEAT, Skoda, Porsche):
- **Kadran Selamlama (Gauge Staging):** UDS DID `0x0501` Byte 0 Bit 3 $\rightarrow$ `1`.
- **Amerikan Park:** UDS DID `0x0602` Dimming Value $\rightarrow$ `%30`.
- **Kilit Teyit Sesi:** UDS DID `0x0505` Acoustic Confirmation $\rightarrow$ `Active`.

### 2. BMW & MINI (F ve G Serisi):
- **Spor Göstergeler (Sport Display):** NBT DID `0x3000` EFF_DYN_SPORT_UNIT $\rightarrow$ `Active`.
- **M Performance Logo:** NBT DID `0x3001` STARTUP_EMBLEM $\rightarrow$ `Variant_01 (M)`.

### 3. Renault & Dacia:
- **Yol Bilgisayarı Aktivasyonu:** KWP2000 DID `0x2180` Trip Computer Byte $\rightarrow$ `01`.
- **Hareket Halinde Otomatik Kapı Kilit:** KWP2000 DID `0x2181` Auto Lock $\rightarrow$ `01`.

---

## 🚀 Sonraki Adım: Masaüstü Mock Simülatörünün Yazılması

Şartname hazırdır. Bir sonraki adımda bilgisayarda araca gitmeden tüm bağlantı protokollerini sınayacak **Masaüstü Mock Simülatör Test Paketini** yazıp `npm test` ile doğrulayacağız!
