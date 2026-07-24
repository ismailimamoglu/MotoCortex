Bu üçüncü tur, gerçek bir olgunluğa ulaşmış — rollback'in tanım seviyesinde reddedilmesi (rejectFeatureDefinition) ve önkoşulların özellik bazına indirgenmesi, önceki turlardaki "tek boyutlu global kural" sorununu doğru şekilde çözüyor. Detaylı inceleme:

✅ Güçlü Kararlar

Rollback'in motor seviyesinde reddi — maxRollbackAttempts > 1 olan bir FeatureDefinition'ın sisteme hiç kabul edilmemesi, "kod incelemesinde gözden kaçan bir tanım production'a sızar mı" endişesini ortadan kaldırıyor. Bu, çalışma zamanı kontrolünden çok daha güçlü bir savunma katmanı (derleme/veri girişi zamanında engelleme).

Özellik bazlı önkoşullar (VehiclePreconditions) — Doğru yön. Örneğin "iç aydınlatma rengi değiştirme" gibi düşük riskli bir özellik için requiresVehicleStationary: false mantıklı olabilirken, ABS/şanzıman coding'i için bu her zaman true olmalı. Global tek kural yerine özellik bazlı esneklik, hem güvenliği hem kullanılabilirliği optimize ediyor.

compatibleVersions allowlist'in sezgisel skordan tamamen çıkarılması — Önceki turda sorduğum soruyu net cevaplıyor: artık COMPATIBLE_MATCH sadece QA onaylı, elle doğrulanmış bir listeye bağlı. UNKNOWN ve PARTIAL_MATCH'in yazmayı %100 engellemesi doğru fail-safe varsayılan.

🔴 Netleştirilmesi Gereken Tutarsızlık

Faz sayısı uyuşmuyor. Plan "13 aşamalı günlük" diyor ama Phase-to-Recovery tablosunda yalnızca ~9 farklı durum listelenmiş (PRECHECK, BACKUP_COMPLETE, WRITE_STARTED, WRITE_RESPONSE_RECEIVED, VERIFICATION_STARTED, INCONCLUSIVE, RECOVERY_REQUIRED, ROLLBACK_STARTED, COMPLETED). Eksik olan ~4 faz nedir? Muhtemelen pipeline'ın daha erken adımları (ECU_DISCOVERY, FINGERPRINT_MATCHED, USER_CONFIRMATION, DTC_RESCAN gibi) de journal'a dahil edilmiş olabilir — ama bu netleşmeden onaylamak riskli, çünkü listelenmeyen fazların kurtarma aksiyonu tanımsız kalmış olabilir. Ekipten tam 13 fazın listesini isteyin; her biri için (tabloya eklenmemiş olanlar dahil) açık bir kurtarma aksiyonu olmalı.

🟡 Ele Alınması Gereken Kenar Durumlar

A. maxAllowedSpeedKmh + bilinmeyen hız kombinasyonu net değil.
Tablo/plan sadece requiresVehicleStationary: true + hız bilinmiyor senaryosunu kapsıyor. Peki requiresVehicleStationary: false ama maxAllowedSpeedKmh: 5 gibi bir eşik tanımlanmışsa ve hız okunamıyorsa ne olur? Tutarlılık için: herhangi bir hız-bağımlı önkoşul tanımlıysa ve hız doğrulanamıyorsa, varsayılan her zaman engelleme olmalı — sadece requiresVehicleStationary alanına özel bir istisna bırakılmamalı.

B. ROLLBACK_STARTED fazında uygulama tam ortada kapanırsa?
Tablo "yanıt kontrol edilir, başarısızsa CRITICAL_MANUAL_INTERVENTION" diyor ama bu, rollback'in yanıtı beklenirken kesintiye uğradığı senaryoyu kapsamıyor gibi görünüyor. maxRollbackAttempts = 1 zaten tüketilmiş durumda olduğundan, uygulama yeniden açıldığında bu fazda asla ikinci bir 0x2E rollback denemesi göndermemeli — sadece 0x22 ile mevcut durumu okuyup, orijinal yedekle eşleşiyorsa COMPLETED'e (rollback başarılı olmuş), eşleşmiyorsa doğrudan CRITICAL_MANUAL_INTERVENTION'a geçmeli. Bunun açıkça yazılması gerekiyor, yoksa "rollback'i tekrar dene" gibi yanlış bir varsayılan koda sızabilir.

C. integrityHash neyi koruyor — tanımlanmamış.
SHA-256 hash'in neyin bütünlüğünü doğruladığı belirtilmemiş: journal kaydının kendisi mi (disk bozulmasını tespit etmek için), yoksa ECU'dan okunan/yedeklenen hex verisi mi (yedeğin bozulmadığını doğrulamak için)? İkisi de değerli ama farklı amaçlar taşıyor ve farklı hata aksiyonları gerektirir:

Journal kaydı hash uyuşmazlığı → muhtemelen CRITICAL_MANUAL_INTERVENTION (diske ne yazıldığından emin olunamıyor).
Yedek verisi hash uyuşmazlığı → rollback denenmemeli (bozuk yedekle geri yazmak durumu kötüleştirir), doğrudan manuel müdahale.

Bu ikisi ayrı ayrı ele alınmalı, "integrityHash" tek bir kavram olarak bırakılmamalı.

D. compatibleVersions allowlist'in bakım süreci hâlâ tanımsız.
Bu, üçüncü kez sorduğum bir soru ama teknik değil, operasyonel bir boşluk: Üretici bir yazılım güncellemesi (OTA) yayınlayıp bir ECU'nun SW ID'sini değiştirdiğinde, önceden EXACT_MATCH olan bir araç aniden MISMATCH/UNKNOWN olacaktır — bu doğru ve güvenli bir davranış (yazma otomatik olarak durur). Ama şunu netleştirin: sahada UNKNOWN olarak işaretlenen yeni varyantlar nasıl QA'ya ulaşıyor ve allowlist'e ekleniyor? Anonim, opt-in bir "bu araç desteklenmiyor" telemetri sinyali toplayıp QA ekibinin fiziksel test sonrası onaylaması gibi bir süreç öneririm — aksi halde allowlist zamanla eskiyip kullanıcı tabanının büyük kısmı sessizce "desteklenmiyor" durumuna düşebilir.

📋 Test Planına Ek Öneriler

Mevcut liste iyi ama şunlar eksik:

ROLLBACK_STARTED fazında yeniden başlatma testi (madde B) — ikinci bir 0x2E'nin asla gönderilmediğini doğrulayan negatif test.
integrityHash uyuşmazlığı testi — hem journal hem yedek verisi için ayrı ayrı, doğru aksiyonun tetiklendiğini doğrulayan test.
13 fazın tamamının en az bir kez test kapsamında tetiklenip tetiklenmediğini doğrulayan bir "coverage" kontrolü (hangi fazların testte hiç egzersiz edilmediğini gösteren rapor).
Onay Durumu

Faz-Kurtarma haritasını eksik faz sayısı netleşmeden onaylamıyorum — 13 vs 9 farkı kapatılmalı. Diğer üç madde (A, C, D) HIL testine geçişi engellemez ama dokümante edilmesi ve idealde kod içinde açık şekilde ele alınması gerekiyor. Madde B (ROLLBACK_STARTED resume mantığı) ise gerçek bir düzeltme gerektirebilir — kod incelemesi öncesi ekipten bu senaryonun mevcut implementasyonda nasıl ele alındığını teyit etmenizi öneririm.