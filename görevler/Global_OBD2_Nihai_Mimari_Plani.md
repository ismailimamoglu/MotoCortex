# 🏆 MotoCortex Global OBD2 & UDS Bağlantı ve Teşhis Platformu — NİHAİ MİMARİ MASTER PLAN (V3 - SON SÜRÜM)

> ⚠️ **NOT:** Bu doküman; Gemini, ChatGPT, Claude, Perplexity ve MotoCortex teşhis mühendisliği ekibinin tüm soru, eleştiri ve geri bildirimlerini yanıtlayarak son haline getirilmiş **NİHAİ UYGULAMA PLANIDIR**. **Kod tabanında henüz hiçbir değişiklik yapılmamıştır.**

---

## 📑 İÇİNDEKİLER

1. **Çapraz Sorgu Sentezi & AI Konsensüs Tablosu (Son Sürüm)**
2. **AI Sorularına Teknik Yanıtlar ve Çözümler (Multi-ECU, K-Line Latch-up, Address Alignment)**
3. **Kök Neden Özeti (ATWS Sabotajı, 0100 Sinyal Tetikleme, Eksik Protokoller)**
4. **Nihai "Kurşun Geçirmez" State-Machine Akış Şeması**
5. **Dört Temel Keşif Motoru & Doğrulanmış ECU Adres Matrisi**
6. **İleri Mimari Katmanları (Transport Abstraction, ISO-TP Core, OTA Poisoning Safety)**
7. **Sertleştirilmiş 4 Fazlı Kodlama ve Test Yol Haritası**

---

## 1. 🤖 Çapraz Sorgu Sentezi & AI Konsensüs Tablosu

| AI Aracı | Puan / İnceleme | Kritik Katkısı & Düzeltilen Nokta |
| :--- | :--- | :--- |
| **Claude** | Tam Onay (Adres Düzeltmesiyle) | ECU Discovery adresleri `veriokuma.md` ile hizalandı: ABS (`7D0/7D8`), Airbag (`770/778`), BCM (`720/728`). `AT SP` ifadesi genel uyumluluk vurgusuyla güncellendi. |
| **Gemini** | Tam Onay (PHY & Safety Eklendi) | **1. Multi-ECU Çakışması:** `0100` atılırken `AT SH 7E0` (Engine Target) mühürlemesi eklendi.<br>**2. K-Line Latch-Up:** `BUS INIT ERROR` durumunda `AT BI` (Break Init) fiziksel reset komutu eklendi.<br>**3. OTA Zehirlenme Koruması:** App Attest + Adaptör Skoru > 85 şartı getirildi. |
| **ChatGPT** | **9.4 / 10** | **1. Transport Abstraction Layer:** BT Classic, BLE, Wi-Fi, USB, DoIP ortak arayüze alındı.<br>**2. ISO-TP Multi-Frame Engine:** First Frame / Flow Control / Consecutive Frame yönetimi ayrıştırıldı. |
| **Perplexity** | Tam Onay | Hata koduna dayalı karar ağacı (Error-Driven Fallback Matrix) ve Otomatik Regresyon Test Planı eklendi. |

---

## 2. ❓ AI Sorularına Teknik Yanıtlar & Mimari Çözümler

### 1️⃣ CAN Bus Multi-ECU Response Collision Çakışması (Gemini Yanıtı)
- **Sorun:** CAN bus üzerinde `AT SH` ayarlanmadan `0100` gönderilirse Motor (0x7E8), Şanzıman (0x7E9) ve Hibrit (0x7EA) ECU'ları aynı anda yanıt vererek UART tamponunu kilitler.
- **Çözüm:** `AT SP 6/7` ayarlandıktan hemen sonra **`AT SH 7E0`** (Engine Target Header) basılacak, ardından `0100` atılacaktır. Böylece sadece motor beyninden temiz `41 00...` yanıtı alınır.

### 2️⃣ K-Line Latch-Up ve Fiziksel Hat Resetleme (Gemini Yanıtı)
- **Sorun:** K-Line (ISO 9141 / KWP) hattında `BUS INIT: ERROR` alındığında K-Line çipi hattı YÜKSEK voltajda kilitli bırakabilir.
- **Çözüm:** Düz retry yerine adaptöre **`AT BI` (Break Init / Baudrate Init)** komutu gönderilip hat elektriksel olarak sıfırlanacak, 500ms quiet time verildikten sonra 1 defa retry yapılacaktır.

### 3️⃣ ECU Adres Hizalaması & Güvenlik Blokajı (Claude Yanıtı)
- **Sorun:** Şablon adresler (`7E2/7E3/7E4`) kullanılması durumunda, `veriokuma.md` içindeki gerçek güvenlik hard-block adresleri (`7D0/770`) ile eşleşmeme ve güvenlik zafiyeti riski.
- **Çözüm:** ECU Discovery Engine adresleri projemizin yetkili dokümanı olan `veriokuma.md` ile **100% eşitlenmiştir**.

---

## 3. 🔍 Log Otopsisinde Kesinleşen 3 Kök Hata

1. **`ATWS` Sabotaj Döngüsü:** Her `AT SP X` sonrası atılan `ATWS` (Warm Start) komutu RAM'deki konfigürasyonu sıfırladığı için kaldırılacaktır.
2. **`0100` Sinyal Tetikleme Eksikliği:** Adaptörün araca fiziksel sinyal basması için her `AT SP X` komutunun ardından `0100` (Request Supported PIDs) basılacaktır.
3. **Eksik Protokol Numaraları:** **`AT SP 4` (KWP 5-Baud Init)** ve **`AT SP 8 / AT SP 9` (250k CAN)** zincire eklenecektir.

---

## 4. 🗺️ Nihai State-Machine Akış Şeması

```
[1. RESET & ADAPTÖR HAZIRLIK]
 └──► AT Z (Reset) ──► (500ms Quiet Time) ──► ATE0 ──► ATL0 ──► ATH0 ──► AT RV ──► ATI

[2. FAZ 1: OTOMATİK KEŞİF (AUTO DETECT)]
 └──► AT SP 0 ──► AT SH 7E0 ──► 0100 ──► [Promise Timeout: 3500ms]
        ├──► Yanıt: "41 00 XX XX" ──► [BAĞLANTI BAŞARILI] ──► (AT DP ile Protokolü Mühürle)
        └──► Yanıt: "NO DATA" / "BUS INIT: ERROR" / TIMEOUT ──► [FAZ 2'YE GEÇ]

[3. FAZ 2: MANUEL DİNAMİK FALLBACK MATRİSİ] (Hiçbir adımda ATWS ATILMAZ!)
 ├──► A. High-Speed CAN Group  : AT SP 6 (11b/500k) ──► AT SH 7E0 ──► 0100 (Başarısızsa AT SP 7 -> 29b/500k)
 ├──► B. Low-Speed CAN Group   : AT SP 8 (11b/250k) ──► AT SH 7E0 ──► 0100 (Başarısızsa AT SP 9 -> 29b/250k)
 ├──► C. KWP2000 Group         : AT SP 5 (Fast Init) ──► 0100 
 │                               └──► BUS INIT ERROR alınırsa ──► AT BI ──► (500ms bekle) ──► 1 Retry
 │                               └──► Başarısızsa AT SP 4 (5-Baud Init) ──► 0100 [Timeout: 4500ms]
 ├──► D. ISO 9141-2 Group      : AT SP 3 (5-Baud Init) ──► 0100 [Timeout: 4500ms]
 └──► E. SAE J1850 Group       : AT SP 1 (PWM - Ford) ──► 0100 (Başarısızsa AT SP 2 -> VPW - GM)

[4. FAZ 3: OEM DIAGNOSTIC FALLBACK] (Standart OBD2 0100 yanıt vermediğinde)
 ├──► CAN OEM Header Fallback  : AT SH 740 (veya Marka Header'ı) ──► 22 F1 90 (VIN Sorgusu)
 └──► KWP OEM Header Fallback  : AT SH 81 10 F1 ──► 22 F1 90 (VIN Sorgusu) [NRC 0x78 için 5000ms bekleme]
```

---

## 5. ⚙️ Dört Temel Keşif Motoru & Doğrulanmış ECU Adres Matrisi

### 1️⃣ Protocol Discovery Engine
- Araç markasına göre önceliklendirilir (Örn: Dacia/Renault -> KWP5/KWP4 ilk sırada; VAG/BMW -> CAN6/CAN7 ilk sırada).

### 2️⃣ ECU Discovery Engine (`veriokuma.md` İle %100 Uyumlu)
- İletişim sağlandıktan sonra otobüsteki modüller doğrulanmış gerçek adresleriyle taranır:
  * **Motor (ECM):** `7E0 / 7E8`
  * **Şanzıman (TCM):** `7E1 / 7E9`
  * **Fren / ABS / ESC:** `7D0 / 7D8` *(Güvenlik Hard-Block korumalı)*
  * **Hava Yastığı / SRS:** `770 / 778` *(Güvenlik Hard-Block korumalı)*
  * **Gövde / BCM:** `720 / 728`

### 3️⃣ Capability Discovery Engine
- Desteklenen modları (`Mode 01-09`), UDS servislerini (`0x10`, `0x22`, `0x19`, `0x27`, `0x31`) ve PID maskelerini haritalandırır.

### 4️⃣ Adapter Reputation & Fingerprint Engine
- ATI ve RTT ile sınıflandırma: `Genuine STN/OBDLink` (95-100), `Vgate` (85-94), `Clone v1.5` (65-84), `Low-Grade Clone v2.1` (40-64).

---

## 6. 🏗️ İleri Mimari Katmanları

1. **Transport Abstraction Layer (`ITransportAdapter`):** Bluetooth Classic, BLE, Wi-Fi, USB ve gelecekteki DoIP sürücüleri tek bir soyut haberleşme arayüzü arkasında toplanır.
2. **ISO-TP Multi-Frame Engine:** UDS çoklu çerçeve mesajları (`First Frame` -> `Flow Control` -> `Consecutive Frame`) bağımsız bir parser modülünde işlenir.
3. **OTA Data Poisoning Koruması:** Supabase bulut kural motoruna gönderilen saha verilerinde `App Attest` doğrulaması ve `Adaptör Skoru > 85` şartı aranır.

---

## 7. 🚀 Sertleştirilmiş 4 Fazlı Yol Haritası & Test Planı

### 🔹 FAZ 1: Temel Temizlik & Tam Görünürlük (Hemen)
1. `ATWS` çağrılarının temizlenmesi.
2. `BT_WRITE` yanına milisaniyelik **`BT_READ` / `BT_RESPONSE`** ham log kanalı eklenmesi.
3. Her `AT SP X` sonrasında `AT SH 7E0` + `0100` tetiklemesi konulması.

### 🔹 FAZ 2: Protokol Matrisi, K-Line Latch-Up & Zamanlama (Kısa Vadeli)
1. Zincire **`AT SP 4`** ve **`AT SP 8 / AT SP 9`** eklenmesi.
2. KWP/ISO9141 zaman aşımının **4500ms** yapılması.
3. `BUS INIT ERROR` durumunda **`AT BI`** ile hat resetleme ve 1 retry.
4. NRC `0x78` yanıtında **5000ms** sabırlı bekleme.

### 🔹 FAZ 3: Modül ve Yetenek Keşfi (Orta Vadeli)
1. Doğrulanmış adreslerle (`7D0`, `770`, `720`, `7E0`) `ECU Discovery Engine` entegrasyonu.
2. `Capability Discovery Engine` entegrasyonu.

### 🔹 FAZ 4: Bulut Öğrenme & Regresyon Testleri (Uzun Vadeli)
1. App Attest korumalı `Compatibility Knowledge Graph` & `OTA Rule Engine`.
2. `Jest` ile ATWS yokluğu, 0100 tetiklemesi ve KWP zaman aşımı için otomatik regresyon test suite'inin çalıştırılması.
