# MotoCortex Saha QA Test Protokolü (Field Validation Checklist)

**Tarih:** 23 Temmuz 2026  
**Doküman:** Araç Başı Saha Test Rehberi  
**Hedef Donanımlar:** ELM327 v1.5 / v2.1, vLinker MC+, OBDLink MX+  
**Hedef Araçlar:** VAG Grubu (VW/Audi/Seat/Skoda), BMW, Renault, Toyota, Ford vb.

---

## 📋 Test Adımları Kontrol Listesi

### 1. Donanım & Bağlantı Kurma Testleri (Connection & Hardware Detection)
- [ ] **Bluetooth Eşleşme & Otomatik Bağlantı Testi**:
  - Telefon Bluetooth'unu açıp adaptöre bağlandığınızda bağlantının 3 saniye içinde kurulduğunu doğrulayın.
- [ ] **Klon / Orijinal Adaptör Algılama Testi**:
  - Ucuz Çin klonu ELM327 (v1.5) taktığınızda ekranda *"⚠️ Clone OBD2 Adapter Detected"* uyarısının çıktığını ve ECU yazma butonlarının güvenli şekilde kilitlendiğini görün.
  - Orijinal vLinker / ELM327 v2.1+ taktığınızda uyarının kalktığını ve `EXCELLENT (ORIGINAL)` donanım skorunun hesaplandığını doğrulayın.
- [ ] **Protokol Algılama Testi**:
  - Aracın kontağını açtığınızda protokolün (Örn: `ISO 15765-4 CAN 11bit 500kbps`) otomatik tespit edildiğini `OBD2 Health` ekranından onaylayın.

---

### 2. Canlı Veri Akışı & Gösterge Performansı (Live Telemetry & Queue Latency)
- [ ] **Kadran Gecikme (Latency) Testi**:
  - Gaza bastığınızda ekrandaki Devir (RPM) ve Hız (Speed) ibrelerinde takılma, 1 saniyeden fazla gecikme veya donma olup olmadığını kontrol edin.
- [ ] **Arka Plan & Reconnect Testi**:
  - Canlı veri izlerken uygulamayı arka plana atın (20 saniye bekleyin) ve tekrar ön plana getirin. Bağlantının kopmadan veri akışına devam ettiğini doğrulayın.

---

### 3. Ekspertiz & Arıza Kodu Teşhisi (DTC & Multi-ECU Scan)
- [ ] **Tüm Modülleri Tarama (Multi-ECU)**:
  - `Ekspertiz & Arıza Teşhisi` ekranında taramayı başlatın. Motor (Engine), Şanzıman (TCU), ABS ve Hava Yastığı (Airbag) modüllerinin ayrı ayrı tarandığını görün.
- [ ] **Arıza Kodu Okuma & Silme (Clear DTC)**:
  - Varsa mevcut hatayı okuyun, detaylı açıklamasının göründüğünü doğrulayın.
  - "Hata Kodlarını Sil" butonuna bastığınızda ECU'dan arıza ışığının söndüğünü doğrulayın.

---

### 4. ECU Kodlama & Özellik Açma Testleri (UDS Coding & Safety Gates)
- [ ] **Akü Voltajı Güvenlik Kapısı (Voltage Safety Gate)**:
  - Araç aküsü 12.2V altındayken kodlama yapmayı deneyin. Ekranda *"⚠️ Low Battery Voltage Alert"* uyarısının çıktığını ve yazmanın engellendiğini doğrulayın.
- [ ] **Sorumluluk Reddi (DisclaimersModal) Testi**:
  - Bir gizli özellik açmak için "CODE" butonuna bastığınızda yeni eklediğimiz **Yasal Onay Modalı**'nın çıktığını görün.
  - Kutucukların ikisini de işaretlemeden "Devam Et" butonunun pasif kaldığını, ikisini işaretleyince butonun aktifleştiğini doğrulayın.
- [ ] **UDS 0x22 Read & 0x2E Write ve Read-Back Doğrulaması**:
  - Bir özelliği aktif edin (Örn: *Kilitlerken Korna Çalma* veya *Gündüz Farı Menüsü*).
  - Konsol / Ekran loglarında sırasıyla:
    1. `[1/6] Safety Check Passed`
    2. `[2/6] Backup Created`
    3. `[3/6] UDS Extended Session (0x10 0x03)`
    4. `[4/6] Bitmask Updated`
    5. `[5/6] UDS Write (0x2E)`
    6. `[6/6] Read-Back Verification: SUCCESS`
    adımlarının hatasız tamamlandığını ve özelliğin araçta aktifleştiğini test edin.
- [ ] **Fabrika Ayarlarına Dönüş (Restore Factory State)**:
  - Değiştirdiğiniz özellik için "RESTORE FACTORY" butonuna basın. Orijinal yedeğin ECU'ya geri yazıldığını ve özelliğin eski haline döndüğünü kontrol edin.

---

### 5. Edge Case & Kurtarma (Recovery) Testleri
- [ ] **İşlem Esnasında Bluetooth Kesintisi**:
  - Kodlama yazma simülasyonu / işlemi başladığı anda adaptörü OBD2 soketinden fiziki olarak çekin.
  - Uygulamayı kapatıp tekrar açtığınızda `PendingWriteStore` hash-chain günlüğünün devreye girerek *"INCONCLUSIVE_LOCKED"* uyarısı verdiğini ve güvenliği sağladığını doğrulayın.
- [ ] **İşlem Esnasında Kontak Kapatma**:
  - Kodlama adımlarında kontağı kapatıp uygulamanın sürücüyü "Kontağı ON konumuna getirin" şeklinde doğru yönlendirip yönlendirmediğini kontrol edin.

---

### 💡 Saha Test Güvenlik Kuralları
1. **Araç Durumu**: Test esnasında araç durağan, el freni çekili, motor KAPALI, kontak AÇIK olmalıdır.
2. **Akü Koruma**: Uzun süreli UDS okuma/yazma testlerinde aküye şarj takviyesi takılması tavsiye edilir.
