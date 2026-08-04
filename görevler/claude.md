MotoCortex QA İnceleme Raporu

Öncelikle net bir sınır çizmem gerekiyor: Bash aracımda ağ erişimi kapalı, dolayısıyla repoyu klonlayıp npm install / expo run ile gerçekten çalıştıramıyorum, gerçek bir motosiklette OBD-II/BLE bağlantısı test edemem, cihaz üzerinde UI akışlarını gezemem. Yani "gerçek bir kullanıcı gibi tıklayıp deneyen" bir fonksiyonel test yapamadım.

Yapabildiğim ve yaptığım şey: statik repo/kod incelemesi — dosya yapısı, bağımlılıklar, güvenlik pratikleri, konfigürasyon dosyaları üzerinden bir QA/kod kalite denetimi. Aşağıdaki bulgular buna dayanıyor, gerçek runtime testine değil.

Proje Profili

React Native (Expo SDK 52, RN 0.76.9) ile yazılmış bir motosiklet/hafif araç OBD-II teşhis uygulaması. BLE (react-native-ble-plx) ve klasik Bluetooth (react-native-bluetooth-classic) ile araç bağlantısı, Supabase backend, Firebase (Analytics/Crashlytics), RevenueCat (react-native-purchases) ile abonelik, i18next ile çoklu dil, Zustand state yönetimi, kendi native modülü (modules/motocortex-obd) var. Android + iOS hedefleniyor.

🔴 Kritik / Yüksek Öncelikli Bulgular

1. Hassas konfigürasyon dosyaları repoya commit edilmiş
google-services.json, GoogleService-Info.plist ve local.properties repo kökünde görünüyor, ama .gitignore dosyasında bunlar için hiçbir kural yok (sadece .env*, credentials.json, *.pem, *.key hariç tutulmuş). Bu üç dosya genelde local/secret olarak tutulur:

Firebase config dosyaları proje API anahtarlarını, App ID'lerini içerir — Firebase güvenlik kuralları düzgün kısıtlanmamışsa kötüye kullanılabilir.
local.properties genelde yerel Android SDK yolunu içerir ama bazen imzalama/anahtar bilgisi de taşıyabilir; her durumda repoya girmemesi gereken bir dosyadır.

Öneri: Bu dosyaları .gitignore'a ekleyip repodan (ve git geçmişinden) temizlemek, Firebase Console'dan ilgili anahtarları rotate etmek.

2. Kökte tarihli bir "PrivacyReport" PDF'i commit edilmiş
MotoCortex-PrivacyReport 2026-04-28 18-25-27.pdf — App Store/Play Store için üretilmiş özel bir rapor gibi duruyor, kod deposunda değil ayrı bir dokümantasyon/uyumluluk kanalında durması daha uygun olur; yanlışlıkla iç bilgi/kanal detayı sızdırma riski taşıyabilir.

🟡 Orta Öncelikli Bulgular

3. react-native-bluetooth-classic RC (release candidate) sürümde sabitlenmiş
^1.73.0-rc.17 — üretim uygulamasında bir RC bağımlılığa dayanmak, OBD-II bağlantısı gibi kritik bir işlevde stabilite riski taşır. Bu paket için son kararlı sürüm veya alternatif değerlendirilmeli.

4. patch-package kullanımı var ama patch'lerin gerekçesi görünmüyor
postinstall script'i patch-package çalıştırıyor ve bir patches/ klasörü mevcut. Hangi paketlere, neden patch uygulandığı (üçüncü parti kütüphanede bug fix mi, güvenlik yaması mı) dokümante edilmemiş görünüyor — bakım riski.

5. İki ayrı Bluetooth kütüphanesi birden kullanılıyor
Hem react-native-ble-plx (BLE) hem react-native-bluetooth-classic (Classic Bluetooth/SPP) bağımlılığı var. Farklı OBD-II adaptör tipleri (ELM327 BLE vs. SPP) için gerekliyse mantıklı, ama bu ikisinin hangi cihaz senaryosunda devreye girdiği ve aralarındaki geçiş mantığının test edilmesi kritik — kod incelemesiyle doğrulayamadım, cihaz bazlı test gerektirir.

🟢 Olumlu Bulgular
Test altyapısı kurulu: jest, @testing-library/react-native, coverage script'i mevcut.
i18n için özel bir "strict build" pipeline'ı var (sync-i18n.js + qa-i18n-audit.js + tsc --noEmit) — çeviri eksikliklerini derleme zamanında yakalamaya çalışan iyi bir pratik.
TypeScript + ESLint + Zod (runtime şema doğrulama) kullanılması, tip güvenliği ve veri doğrulama açısından olumlu.
Crashlytics entegrasyonu var — prod hata takibi düşünülmüş.
Gerçek Bir QA Testi İçin Gereken (Benim Yapamadığım) Adımlar
Kurulum/Build testi: npm install, expo prebuild, Android/iOS derleme — bağımlılık çakışması, native modül (motocortex-obd) derleme hatası olup olmadığı.
Fonksiyonel/BLE testi: Gerçek bir ELM327 OBD-II adaptörü + motosiklet (veya simülatör) ile bağlantı kurma, DTC okuma/silme, canlı veri akışı senaryoları.
Kimlik doğrulama & abonelik akışı: Supabase auth, RevenueCat satın alma akışının sandbox testi.
Regression/unit test çalıştırma: Mevcut jest testlerinin gerçekten geçip geçmediği, coverage oranı.
Statik güvenlik taraması: npm audit / Snyk gibi bir araçla bağımlılık zafiyeti taraması (ben bunu da çalıştıramadım).
Özet

Kod tabanı olgun bir mimariye sahip (TS, Zod, test altyapısı, i18n pipeline'ı), ama repoda iki net güvenlik/hijyen sorunu (Firebase config dosyalarının ve local.properties'in commit edilmesi) var ve bunlar üretim öncesi mutlaka giderilmeli. Gerçek fonksiyonel/donanım testi için repoyu bir cihazda derleyip fiziksel OBD-II adaptörüyle denemeniz gerekiyor — isterseniz bu adımlar için bir test planı/checklist de hazırlayabilirim.