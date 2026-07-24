MotoCortex — Full UI/UX & Functional QA Audit ve Düzeltme Emri
ROLÜN

Sen yalnızca kod yazan bir geliştirici değilsin.

Senior Mobile QA Engineer + UI/UX Designer + React Native/Expo Specialist + Automotive Diagnostic App Tester olarak hareket edeceksin.

MotoCortex uygulamasının tüm ekranlarını, tüm navigasyon akışlarını, tüm butonlarını, tüm modal ve form bileşenlerini, bağlantı durumlarını ve kullanıcı etkileşimlerini uçtan uca test edeceksin.

Amacın:

Uygulamadaki hiçbir ekran, buton, link, modal, tab, gesture veya navigasyon akışı çalışmadan ya da görsel olarak bozuk halde kalmayacak.

❗ KESİN KURAL

Sadece kodu okumak test değildir.

Her özellik için aşağıdaki soruların tamamına cevap ver:

Kullanıcı bu butona basabiliyor mu?
Buton gerçekten doğru fonksiyonu çağırıyor mu?
Fonksiyon doğru ekranı açıyor mu?
İşlem sırasında loading state var mı?
İşlem başarısız olursa hata gösteriliyor mu?
İşlem başarılı olursa kullanıcıya feedback veriliyor mu?
Bağlantı yokken doğru şekilde kilitleniyor mu?
Kullanıcı işlemi tekrar tetiklerse duplicate işlem oluşuyor mu?
Ekrandan çıkınca timer/listener/polling temizleniyor mu?
Geri tuşuna basınca uygulama doğru state'e dönüyor mu?
Farklı ekran boyutlarında tasarım bozuluyor mu?
Uzun çeviri metinlerinde layout bozuluyor mu?
Türkçe dışındaki dillerde text overflow oluşuyor mu?
Dark/Light theme'de okunabilirlik korunuyor mu?
Disabled buton gerçekten disabled mı?
Loading sırasında kullanıcı işlemi tekrar başlatabiliyor mu?
1. TÜM EKRANLARIN ENVANTERİNİ ÇIKAR

Önce projeyi tarayarak bütün ekranları listele.

Şu formatta rapor oluştur:

Screen ID:
Screen Name:
File:
Route:
Parent Navigation:
Accessible From:
Main Purpose:
Interactive Elements:
API/OBD Dependency:
Connection Dependency:
Potential Issues:

Şunlar dahil olmak üzere hiçbir ekranı atlama:

Dashboard
Connection / Bluetooth
Vehicle Detection
VIN Identification
Vehicle Profile
Live Data
Gauges
DTC Scan
DTC Details
DTC Clear
Multi-ECU Scan
Engine ECU
ABS ECU
Airbag ECU
Transmission ECU
DPF
Fuel Trim
STFT / LTFT
Performance / Horsepower
ECU Health
Hidden Features / Ek Özellik Açma
UDS
Feature Activation
Backup
Rollback
Recovery
Adapter Benchmark
Settings
Language
Theme
Subscription / PRO
Help
About
Legal / Disclaimer
Onboarding
Error Screens
Empty States
Loading States

Kodda olup navigasyonda görünmeyen ekranları ayrıca tespit et.

Navigasyonda görünen fakat gerçek ekranı olmayan route'ları da tespit et.

2. EKRAN EKRAN GÖRSEL UI AUDIT YAP

Her ekranı görsel olarak incele.

Aşağıdaki kriterleri kontrol et:

Layout
Ekran taşması var mı?
Safe Area doğru mu?
iPhone Dynamic Island altında içerik kalıyor mu?
Android navigation bar ile çakışma var mı?
Küçük ekranlarda içerik kesiliyor mu?
Tablet görünümü bozuluyor mu?
Yatay modda layout kırılıyor mu?
Spacing
Padding tutarlı mı?
Card'lar arasında mesafe tutarlı mı?
Butonlar birbirine çok yakın mı?
Başlıklar içeriklere fazla mı uzak?
Görsel hiyerarşi doğru mu?
Typography
Başlıklar okunabilir mi?
Font boyutları tutarlı mı?
Çok uzun araç/model isimleri taşıyor mu?
Çok uzun hata kodları taşıyor mu?
Çince/Japonca/Korece karakterler kırılıyor mu?
Arapça RTL düzeni bozuluyor mu?
Buttons

Her buton için:

Button:
Visual State:
Pressable:
onPress:
Handler:
Navigation:
Loading State:
Disabled State:
Error State:
Success Feedback:
Issue:

Özellikle şu hataları ara:

onPress={() => {}}
onPress={undefined}
yalnızca görsel olarak bulunan ama işlevi olmayan butonlar
yanlış route'a giden butonlar
modal açması gereken ama hiçbir şey yapmayan butonlar
disabled görünen ama tıklanabilen butonlar
aktif görünen ama bağlantı olmadan çalışan butonlar
loading sırasında ikinci kez tetiklenebilen butonlar
3. TÜM BUTONLARI OTOMATİK OLARAK TARA

Projede bulunan tüm:

Pressable
TouchableOpacity
TouchableHighlight
Button
IconButton
Link
router.push
router.replace
navigation.navigate
navigation.goBack

kullanımlarını tarayarak bir Interactive Element Inventory oluştur.

Her element için:

Component:
File:
Line:
Action:
Target:
Implemented:
Tested:
Result:

Hiçbir interactive element "untested" bırakılmayacak.

4. NAVIGATION TESTİ

Her ekran için şu akışı test et:

Dashboard
 ↓
Screen
 ↓
Detail Screen
 ↓
Modal
 ↓
Action
 ↓
Success/Error
 ↓
Back
 ↓
Dashboard

Kontrol et:

Back çalışıyor mu?
Android back button çalışıyor mu?
iOS swipe-back çalışıyor mu?
Modal kapatma çalışıyor mu?
Modal dışına basınca kapanması gerekiyorsa kapanıyor mu?
Modal kapanınca state temizleniyor mu?
Ekrana tekrar girince eski loading state kalıyor mu?
Navigation stack duplicate ekran oluşturuyor mu?
5. STATE-BASED UI TESTİ

MotoCortex'te özellikle bağlantı durumları çok önemlidir.

Aşağıdaki tüm state'leri simüle et:

Connection States
DISCONNECTED
SCANNING
CONNECTING
CONNECTED
ADAPTER_READY
ECU_DISCOVERING
ECU_CONNECTED
ECU_SESSION_ACTIVE
CONNECTION_LOST
RECONNECTING
RECOVERY_REQUIRED

Her ekranı bu state'lerde kontrol et.

Örneğin:

Araç bağlı değilken
Ek Özellik Açma butonu kilitli mi?
UDS butonu kilitli mi?
Multi-ECU Scan doğru uyarıyı gösteriyor mu?
Kullanıcı yanlışlıkla ECU komutu gönderebiliyor mu?
Bağlantı kopunca
UI doğru state'e dönüyor mu?
Polling duruyor mu?
Queue temizleniyor mu?
Reconnect başlıyor mu?
Kullanıcıya doğru mesaj gösteriliyor mu?
Kontak kapanınca
ECU bağlantısı doğru şekilde kapanıyor mu?
Uygulama sonsuz retry yapıyor mu?
Kullanıcıya "Kontak ON konumuna getirin" mesajı veriliyor mu?
6. TÜM BUTONLARIN GERÇEKTEN ÇALIŞTIĞINI TEST ET

Aşağıdaki özelliklerin her biri için başarılı, başarısız, bağlantısız ve tekrar tıklama senaryolarını test et:

Connection
Scan
Connect
Disconnect
Safe Disconnect
Reconnect
Auto Reconnect
Diagnostics
Read DTC
Clear DTC
Multi-ECU Scan
ECU Selection
DTC Details
DTC Explanation
Refresh
Live Data
Add Gauge
Remove Gauge
Change PID
Start Live Data
Stop Live Data
Reset
Fullscreen
Feature Activation
Open Feature
Read Current Value
Backup
Write
Verify
Cancel
Rollback
Recovery
Retry
Settings
Language
Theme
Units
Notifications
Subscription
Privacy
Legal

Her işlem için:

PASS
FAIL
PARTIAL
NOT IMPLEMENTED

sonuçlarından birini ver.

7. GÖRSEL TUTARSIZLIK DENETİMİ

Tüm uygulama genelinde şu değerleri karşılaştır:

Border Radius
Card Radius
Button Height
Input Height
Font Sizes
Font Weights
Icon Sizes
Horizontal Padding
Vertical Spacing
Header Height
Bottom Tab Height
Modal Radius
Shadow / Elevation
Color Tokens

Aynı amaçlı bileşenler farklı görünüyorsa tek bir Design System'e taşı.

Örneğin:

PrimaryButton
SecondaryButton
DangerButton
GhostButton
IconButton
Card
SectionHeader
StatusBadge
LoadingState
EmptyState
ErrorState

oluştur.

8. RESPONSIVE TEST

En az şu cihaz boyutlarını test et:

iPhone SE
iPhone 14 / 15
iPhone Pro Max
Android Small
Android Standard
Android Large
Tablet

Aşağıdaki durumları kontrol et:

Font büyütme
Uzun araç adı
Uzun ECU adı
Uzun DTC açıklaması
Çok uzun çeviri
3 haneli RPM
4 haneli RPM
3 haneli hız
6 haneli değer
Çok büyük sayı
Null değer
N/A
--
Loading
9. GLOBAL LANGUAGE TESTİ

En az şu dillerde UI test et:

English
Turkish
German
French
Spanish
Italian
Portuguese
Russian
Arabic
Chinese Simplified
Japanese
Korean

Kontrol et:

Text overflow
Button overflow
Modal overflow
RTL layout
Navigation title overflow
Tab label overflow
DTC açıklaması
Error message
Toast
Alert
Empty State

Bir çeviri eksikse fallback dili sessizce kullanmak yerine raporla.

10. OBD / ECU FONKSİYONEL TEST

UI testinin yanında gerçek uygulama mantığını da test et.

Şu senaryoları simüle et:

Adapter connected
Adapter disconnected
ECU connected
ECU not responding
Timeout
NRC 0x78
NRC 0x33
NRC 0x35
NRC 0x36
NRC 0x37
Voltage low
Voltage critical
Ignition OFF
Vehicle moving
Speed unknown
Fingerprint mismatch
Fingerprint partial match
Unsupported protocol
Tier 3 adapter
Read-back mismatch
Verification inconclusive

Her senaryoda:

Expected UI:
Actual UI:
Expected State:
Actual State:
Expected User Message:
Actual User Message:
PASS/FAIL:
11. LOADING / ERROR / EMPTY STATE DENETİMİ

Uygulamadaki her async işlem için şu üç durum mutlaka olmalı:

LOADING
SUCCESS
ERROR

Ayrıca:

EMPTY
TIMEOUT
CANCELLED
CONNECTION_LOST
RETRY

durumlarını da kontrol et.

Özellikle şu hataları ara:

Sonsuz spinner
Spinner başladıktan sonra hiç bitmemesi
Error state'te retry olmaması
Error sonrası eski verinin ekranda kalması
Empty state yerine boş beyaz ekran
Network hatasında crash
Bluetooth bağlantısı kopunca loading'in devam etmesi
12. MEMORY LEAK & LIFECYCLE TEST

Tüm ekranlarda şunları kontrol et:

setInterval
setTimeout
addListener
Bluetooth listeners
EventEmitter
OBD polling
subscriptions
animated listeners

Her birinin cleanup'ı olmalı.

Özellikle:

useEffect(() => {
  const timer = setInterval(...);

  return () => {
    clearInterval(timer);
  };
}, []);

olmayan tüm durumları bul.

Ekrana 20 kez girip çıkıldığında:

timer sayısı artıyor mu?
listener sayısı artıyor mu?
memory kullanımı artıyor mu?
duplicate OBD command oluşuyor mu?

test et.

13. DUPLICATE ACTION TESTİ

Her kritik butona hızlıca 5-10 kez bas.

Özellikle:

Connect
Scan
Read DTC
Clear DTC
Write ECU
Rollback
Reconnect

testlerinde:

1 tap
2 taps
5 rapid taps
10 rapid taps

senaryolarını uygula.

Beklenen:

Aynı işlem duplicate başlamamalı.
Queue şişmemeli.
İkinci yazma komutu gönderilmemeli.
UI kilitlenmeli veya işlem güvenli şekilde ignore edilmeli.
14. TASARIM DÜZELTME KURALI

Bir tasarım hatası bulduğunda yalnızca o ekranı düzeltme.

Aynı problemi tüm uygulamada ara.

Örneğin:

Dashboard'da buton yüksekliği hatalıysa tüm butonları kontrol et.

Bir modalda text overflow varsa tüm modalları kontrol et.

Bir ekranın loading state'i bozuksa tüm async ekranları kontrol et.

15. HER DÜZELTME İÇİN REGRESSION TEST EKLE

Bir bug düzeltildikten sonra test ekle.

Örnek:

Bug:
DTC Refresh butonu çalışmıyordu.

Fix:
handleRefresh fonksiyonu bağlandı.

Regression Test:
DTC_REFRESH_BUTTON_TRIGGERS_SCAN

Result:
PASS
16. SON RAPORU BU FORMATTA SUN
Executive Summary
Total Screens:
Total Interactive Elements:
Total Buttons:
Total Navigation Routes:
Total Async Operations:
Total Issues:
Critical:
High:
Medium:
Low:
Critical Bugs
ID:
Screen:
File:
Line:
Problem:
Reproduction Steps:
Expected:
Actual:
Root Cause:
Fix:
Test Result:
UI/UX Issues
Screen:
Problem:
Severity:
Screenshot/Reference:
Recommended Fix:
Non-Functional Buttons
Button:
Screen:
File:
Handler:
Problem:
Fix:
Navigation Issues
Route:
From:
To:
Problem:
Fix:
Responsive Issues
Device:
Screen:
Problem:
Fix:
Localization Issues
Language:
Screen:
Problem:
Fix:
Memory / Lifecycle Issues
Component:
Leak Type:
Reproduction:
Fix:
Final Score
UI/UX:
Functional:
Navigation:
OBD:
ECU:
Performance:
Accessibility:
Localization:
Overall:
🚫 KESİNLİKLE YAPMA
Sadece TypeScript derleme testine güvenme.
Sadece Jest testlerinin başarılı olmasını yeterli kabul etme.
Sadece dosyaları okuyup "çalışıyor" deme.
onPress var diye butonu çalışıyor kabul etme.
Mock başarılı diye gerçek akışı başarılı kabul etme.
Görsel olarak güzel diye UX'i tamamlanmış kabul etme.
Bir ekranı test edip diğerlerini varsayma.
"Muhtemelen çalışıyordur" deme.
Test edilmemiş hiçbir özelliği PASS olarak işaretleme.
🎯 SON HEDEF

Bu çalışmanın sonunda MotoCortex için:

"Tüm ekranları incelendi, tüm butonları test edildi, tüm navigasyon akışları doğrulandı, tüm kritik UI/UX hataları giderildi ve regression testleri oluşturuldu."

diyebileceğimiz gerçek bir QA raporu istiyorum.

Önce analiz et. Sonra sorunları önem derecesine göre listele. Daha sonra düzeltmeleri uygula. Son olarak tüm düzeltmeleri yeniden test et.

Düzeltme yapmadan önce bana soru sorma; mevcut proje mimarisine uygun en güvenli ve tutarlı çözümü uygula.

Hiçbir test edilmemiş ekran, buton veya akışı başarılı kabul etme.