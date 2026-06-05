# MotoCortex TestFlight & Beta Saha Test Kılavuzu (Beta Testing Guide)

Değerli Saha Test Kullanıcımız,

MotoCortex OBD-II Motosiklet Teşhis ve Canlı Telemetri uygulamasının TestFlight sürecine hoş geldiniz! Sahaya çıkıp canlı testler gerçekleştirmeden önce, sistemin kararlılığını ve güvenliğini ölçebilmemiz için lütfen aşağıdaki talimatları dikkatle inceleyin ve testlerinizi bu doğrultuda gerçekleştirin.

---

## 📋 Kritik Test Talimatları

### 1. 🚫 Demo Modu vs Gerçek Araç Testi (Çok Önemli)
* **Kural**: Uygulama içindeki **Demo/Simülatör modunda** yaptığınız taramalar ve test verileri **sunucularımıza KESİNLİKLE gönderilmez** ve sessizce iptal edilir (Veri Kirliliği Engelleyici Koruma).
* **Talimat**: Sistemi gerçek anlamda test etmek, telemetri akışını ve Supabase senkronizasyonunu doğrulamak için **kesinlikle gerçek bir motosiklete/araca Bluetooth (OBD2) adaptörü vasıtasıyla bağlanmalı** ve gerçek bir canlı tarama gerçekleştirmelisiniz.

### 2. 🔄 Tekrarlanan Testler & Veri Tabanı Şişmesi Koruması
* **Kural**: Sistemimiz mükerrer veri gönderimini engelleyen akıllı bir oturum imzalama mimarisine sahiptir. Aynı gün içerisinde aynı araçla arka arkaya birden fazla tarama yapmanız veritabanımızı şişirmez.
* **Talimat**: Sistem mükerrer istekleri tespit ederek sadece sayaçları günceller. Bu nedenle gün içerisinde **arka arkaya testler yapmaktan, bağlantıyı kesip tekrar kurmaktan ve arıza kodlarını üst üste sorgulamaktan çekinmeyin**.

### 3. 📞 Geri Bildirim & Hata Bildirimi (User ID)
* Uygulama içerisinde bir sorunla karşılaştığınızda **Hızlı Ayarlar (Quick Settings)** menüsündeki **Destek Merkezi** butonuna tıklayın.
* Sistem sizi otomatik olarak destek web sitemize yönlendirecek ve benzersiz **User ID (Kullanıcı Kimliği)** bilginizi URL üzerinden siteye aktaracaktır. Web sitesindeki e-posta gönderme butonuna tıkladığınızda bu kimlik mailinize otomatik eklenir, böylece hataları çok daha hızlı analiz edebiliriz.

---

Katkılarınız için şimdiden çok teşekkür ederiz. Kazasız ve keyifli sürüşler! 🏍️💨
