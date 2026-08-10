MotoCortex — Statik Kod Analizi & QA Raporu

Yöntem notu: Zip'i inceledim; ancak node_modules yok ve sandbox'ın internet erişimi kapalı olduğu için npm install, tsc --noEmit, eslint, jest gibi araçları gerçekten çalıştıramadım. Aşağıdaki bulgular tamamen kaynak kodu okuma + hedefli grep taraması ile elde edildi — yani bu bir statik/manuel kod incelemesi + güvenlik denetimidir, cihaz üzerinde çalışan fonksiyonel test değildir.

🔴 1. Kritik Güvenlik Bulguları (Supabase Edge Functions)
1.1 sec-access-calculator — Kimlik doğrulama YOK
supabase/functions/sec-access-calculator/index.ts

Bu fonksiyon, VAG/BMW/FCA gibi markaların UDS 0x27 Security Access seed-key (ECU kilit açma) algoritmasını hesaplıyor. Fonksiyonda hiçbir auth kontrolü yok — authorization/apikey header'ı kontrol edilmiyor bile. Public Supabase anon key zaten eas.json'da açık (bkz. §1.4), yani bu endpoint'in URL'sini bilen herkes (uygulamanız dışındaki 3. parti araçlar dahil) sınırsız şekilde seed→key hesaplatabilir.

Risk: Proprietary çözüm algoritmanız ücretsiz bir "oracle" servisi olarak dışarıya açık; rate-limit yok → maliyet/kötüye kullanım riski; uygulamanızın iş mantığı reverse-engineer edilmeden kopyalanabilir.
Öneri: JWT doğrulaması ekle, çağrı başına rate-limit koy, ideali: bu hesaplamayı client'a hiç açmayıp sadece uygulama içi native modülde (obfuscate edilmiş) tut.
1.2 verify-entitlement — Yetkilendirme (authorization) eksik, sadece kimlik doğrulama (authentication) var
supabase/functions/verify-entitlement/index.ts

Fonksiyon authorization/apikey header'ının var olup olmadığını kontrol ediyor (satır 19-25), ama bu header'ın gerçekten userId parametresindeki kullanıcıya ait olduğunu doğrulamıyor. userId doğrudan request body'den alınıyor.

Risk: Public anon key'i bilen (yani uygulamayı indiren) herkes, keyfi bir userId (RevenueCat app_user_id) göndererek başka kullanıcıların abonelik/entitlement durumunu sorgulayabilir — bir bilgi ifşası (IDOR benzeri) açığı.
Öneri: Supabase Auth JWT'den sub claim'ini al, request'teki userId ile eşleştiğini doğrula; eşleşmiyorsa 403 dön.
1.3 ai-doctor — Rate limit yok, prompt injection riski
supabase/functions/ai-doctor/index.ts

GEMINI_API_KEY doğru şekilde Deno.env.get(...) ile okunuyor (hardcode değil, ✅). Ancak:

Auth kontrolü yok → herkes fonksiyonu çağırıp Gemini kotanızı/faturanızı tüketebilir.
vehicleMake, vehicleModel gibi kullanıcı girdileri hiç sanitize edilmeden doğrudan prompt'a ekleniyor (satır 42) → prompt injection ile modelin beklenmedik JSON dışı/zararlı çıktı üretmesi mümkün.
dtcCodes dizisinin uzunluğu sınırlanmıyor → büyük payload ile maliyet/DoS riski.
1.4 eas.json içine gömülü secret'lar (repoya commit edilmiş)
json
"EXPO_PUBLIC_RC_IOS_KEY": "appl_...",
"EXPO_PUBLIC_RC_ANDROID_KEY": "goog_...",
"EXPO_PUBLIC_SUPABASE_URL": "https://cwlmzjynqjoezgoonenz.supabase.co/...",
"EXPO_PUBLIC_SUPABASE_ANON_KEY": "eyJhbGci..."

EXPO_PUBLIC_ önekli olduğu için bu değerler zaten client bundle'a gömülüp herkese açık hale geliyor — yani "sızıntı" değiller, tasarım gereği public. Ancak build-time secret'ları git'e commit edilmiş bir JSON dosyasına yazmak kötü pratik: farklı ortamlar (staging/prod) için ayrı key yönetimini zorlaştırır, secret rotasyonunu git geçmişinde iz bırakır.

Öneri: EAS Secrets (eas secret:create) kullan, eas.json'da sadece referans bırak.
1.5 Supabase şeması — SECURITY DEFINER fonksiyonlarda açık EXECUTE izni

upsert_telemetry, get_chronic_faults, upsert_connection_telemetry fonksiyonları SECURITY DEFINER ile tanımlı ve RLS'i bypass ediyor. Şemada bu fonksiyonlara özel REVOKE/GRANT EXECUTE ifadesi yok — Postgres varsayılanı PUBLIC'e EXECUTE izni verir, yani anon rolü RLS politikalarını atlayarak doğrudan RPC çağırabiliyor. RLS INSERT-only politikaları doğru kurulmuş (✅), ama get_chronic_faults gibi bir okuma fonksiyonu keyfi target_brand ile herkese açık — anonim veri olduğu için PII riski düşük ama yine de kasıtlı olduğundan emin olunmalı.

1.6 Repoda bulunan diğer hassas dosyalar (öncekinden hatırlatma)

google-services.json, GoogleService-Info.plist, local.properties (geliştiricinin yerel /Users/ismailimamoglu/... yolunu ifşa ediyor) hâlâ repoda. .gitignore'a alınmalı.

🟠 2. Kod Kalitesi Bulguları
Bulgu	Detay
ESLint pratik olarak devre dışı	.eslintrc.js'de no-explicit-any, no-unused-vars, no-undef, no-empty, prefer-const, no-constant-condition kuralları kapatılmış. Özellikle no-undef'in kapalı olması, tanımsız değişken kullanımı gibi gerçek hataları lint'in artık yakalayamayacağı anlamına gelir.
166 adet : any kullanımı	tsconfig.json'da strict: true olmasına rağmen (✅ iyi), any kaçışları tip güvenliğini büyük ölçüde zayıflatıyor.
Devasa monolitik dosyalar	OemDatabaseProvider.ts (6710 satır), MainApp.tsx (3611 satır), ConnectionFlowScreen.tsx (1171 satır). Bu boyutta dosyalar test edilebilirliği ve bakımı zorlaştırır.
52 dosyada console.log/warn/error	Prod build'e sızabilecek debug log'ları; performans ve olası hassas veri sızıntısı açısından gözden geçirilmeli.
react-native-bluetooth-classic: ^1.73.0-rc.17	Release-candidate (kararsız) sürüm, OBD-II gibi donanım-kritik bir özellik için production'da kullanılıyor.
Kendi AUDIT_REPORT.md'nizde daha önce tespit edilmiş açık madde	"Re-render bottleneck" (App.tsx'in tüm useBluetoothStore'a subscribe olması, 4Hz polling ile 8-10 re-render/sn) sorunu belgede "önerildi" ama "yapıldı" olarak işaretlenmemiş. App.tsx artık doğrudan useBluetooth çağırmıyor (MainApp.tsx'e taşınmış görünüyor) — bu optimizasyonun gerçekten uygulanıp uygulanmadığı MainApp.tsx içinde ayrıca doğrulanmalı.

Olumlu bulgular: patch-package kullanımı gayet iyi dokümante edilmiş (patches/README.md neden/ne yamalandığını açıklıyor); ErrorBoundary + Crashlytics entegrasyonu düzgün kurulmuş; tsconfig strict: true; hardcoded API secret'ı bulunamadı (Gemini/RevenueCat secret key'leri doğru şekilde env üzerinden okunuyor); Supabase telemetri tablolarında RLS aktif ve insert-only politika mantıklı kurulmuş.

🟡 3. Test Durumu
196 kaynak .ts/.tsx dosyasına karşılık 56 test dosyası bulundu — kısmi kapsam.
npm test komutunu çalıştıramadım (bağımlılıklar yok, network kapalı), dolayısıyla testlerin şu an geçip geçmediğini doğrulayamadım. package.json'da "test": "jest --testPathIgnorePatterns=OBDCommandQueue.fakeTimers.test.ts" şeklinde bir test dosyasının varsayılan koşudan hariç tutulması dikkat çekici — muhtemelen kararsız/yavaş bir test (ayrı test:heavy komutu ile 8GB heap ayrılarak koşuluyor). Bu, o test dosyasının CI'da sessizce atlandığı ve regresyonların kaçabileceği anlamına gelir.
Öncelik Sıralı Aksiyon Listesi
#	Öncelik	Aksiyon
1	🔴 Kritik	sec-access-calculator'a auth + rate-limit ekle
2	🔴 Kritik	verify-entitlement'ta userId'nin JWT sahibiyle eşleştiğini doğrula
3	🟠 Yüksek	ai-doctor'a auth + rate-limit + input sanitizasyonu ekle
4	🟠 Yüksek	SECURITY DEFINER fonksiyonlarda EXECUTE izinlerini gözden geçir (gereksiz PUBLIC erişimi kapat)
5	🟡 Orta	eas.json secret'larını EAS Secrets'a taşı
6	🟡 Orta	.gitignore: google-services.json, GoogleService-Info.plist, local.properties
7	🟡 Orta	ESLint kurallarını (özellikle no-undef, no-unused-vars) tekrar aç
8	🟢 Düşük	OBDCommandQueue.fakeTimers.test.ts'in neden ana test koşusundan hariç tutulduğunu belgeleyip CI'a dahil et
9	🟢 Düşük	MainApp.tsx ve OemDatabaseProvider.ts'i modüllere böl
10	🟢 Düşük	react-native-bluetooth-classic'i stabil sürüme geçir