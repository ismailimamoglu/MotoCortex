v5.3 Plan İncelemesi - Satır Satır Rapor
Genel Gözlem
Bu plan, önceki turlardaki tartışmadan tamamen farklı bir eksene kaymış durumda. Önceki "nihai" planın 13 maddesi (FSM, modüler ayrım, Shadow Parser, Tier profilleri, GATT shield, lag multiplier, vb.) bu planda hiç yok — sanki sıfırdan, dar kapsamlı bir "hotfix" planı yazılmış. Bu iki şekilde okunabilir: (a) önceki plan zaten tamamlandı ve bu üstüne bir patch, ya da (b) konu tamamen değişti ve önceki 13 madde rafa kalktı. Hangisi olduğu belirtilmemiş — bu, raporun en büyük yapısal sorunu.
Maddelerin kendisi teknik olarak iyi, içlerinde bir de gerçek bir mantık hatası var. Detaylar aşağıda.

Madde 1: Zustand Persist İzolasyonu
Analiz: Sorun tanımı doğru ve gerçek — senkron AsyncStorage parse'ı 1.5MB veri için ana thread'i bloklayabilir, bu bilinen bir React Native anti-pattern'i. Çözüm (queue'yu ayrı key'e taşıma, lazy async load) standart ve doğru bir yaklaşım.
Eksikler:

Race condition riski: "Hydration tamamlandıktan sonra arka planda kuyruk yüklenecek" — bu süre zarfında (uygulama açılır açılmaz birkaç yüz ms içinde) enqueueTelemetry çağrılırsa ne olur? Queue henüz yüklenmemişken yeni veri gelirse, ya kayıp olur ya da yükleme tamamlandığında üzerine yazılır (overwrite). Bu senaryo plan içinde ele alınmamış.
saveQueueAsync sıklığı: "her enqueue/dequeue işleminde asenkron kaydet" deniyor — yüksek frekanslı telemetride (20Hz potansiyel) bu, AsyncStorage'a sürekli yazma anlamına gelir. Debounce/throttle mekanizması yok mu? Bu, çözülmeye çalışılan "ana thread bloklanması" sorununu, daha düşük şiddette ama sürekli bir I/O baskısına dönüştürebilir.
Migration: Mevcut kullanıcılarda telemetry_queue zaten eski persist key'inin içinde duruyor. Yeni mimariye geçişte bu veri nasıl taşınacak/temizlenecek? Belirtilmemiş — önceki turlarda da gündeme gelen migration sorunu burada tekrar karşımıza çıkıyor.


Madde 2: Jitter Sıfır Kilitleme Koruması - ⚠️ KRİTİK MANTIK HATASI
Sorun tanımı doğru: elapsedMs=0 → allowedJump=0 → her değişiklik reddedilir → sinyal donar. Bu gerçek bir bug, iyi yakalanmış.
Ancak çözüm önceki onaylanmış planla DOĞRUDAN ÇELİŞİYOR:
Önceki turlarda onaylanan "nihai" planda iki ayrı mekanizma vardı:

Layer üstü (OBDCommandQueue/useBluetooth): elapsedMs < 30ms ise paketi tamamen skip et, store'u güncelleme, zaman damgasını ilerletme (accumulate).
PidRegistry içi: calcElapsed = Math.min(60, elapsedMs) — sadece üst sınır.

Bu planda ise:

elapsedMs <= 0 early-exit kontrolü kaldırılıyor — yani artık 0/negatif zamanlar PidRegistry'ye kadar geliyor.
calcElapsed = Math.max(10, Math.min(60, elapsedMs)) — alt taban ekleniyor.

Çelişki şu: Eğer üst katmandaki "30ms altı paketleri skip et" mekanizması hâlâ yerindeyse, PidRegistry'ye zaten 0/negatif elapsedMs hiç ulaşmamalı — bu paketler üst katmanda elenmiş olmalı. O zaman bu madde 2 ya:

(a) üst katman skip mekanizmasının kaldırıldığını/değiştirildiğini ima ediyor (belirtilmeden), ya da
(b) üst katman mekanizması varlığını sürdürüyor ve bu PidRegistry değişikliği fiilen hiçbir zaman tetiklenmeyecek dead code oluyor.

Ayrıca elapsedMs <= 0 early-exit'in kaldırılması başlı başına risklidir: Bu kontrol muhtemelen "aynı timestamp'le gelen duplicate paket" veya "saat geri sarması" gibi durumlarda erken bir güvenlik valfiydi. Kaldırılıp yerine Math.max(10,...) floor'u koymak, negatif elapsedMs durumunda (saat 100ms geri sarmışsa) bunu sessizce "10ms gibi davran" şeklinde maskeliyor — bu, NTP kayması sorununu çözmüyor, gizliyor. Sistem saati 5 dakika geri sarsa bile calcElapsed=10ms olacak ve allowedJump küçük bir pozitif değer üretecek; veri akışı durmayacak ama zaman tutarlılığı (lastRpmUpdateTime vb. ile ilişkisi) bozulmuş olacak — bu yan etkinin analizi yok.
Sonuç: Bu madde, üst katman skip mekanizmasıyla birlikte mi yoksa onun yerine mi çalışacak açıklanmadan onaylanamaz. İki mekanizma aynı anda varsa biri gereksiz/ölü kod; sadece biri varsa hangisi olduğu ve neden değiştiği belirtilmeli.

Madde 3: Payload Limit 8KB→2KB
Önceki turda zaten önerilmiş ve incelenmişti, burada tekrar ediliyor — tekrar dışında yeni bir şey yok. Hâlâ "neden 2KB" sorusunun cevabı (tipik paket boyutu analizi) eksik, ama düşürme yönü makul.

Madde 4: Edge Case Testleri
jest.useFakeTimers + jest.setSystemTime ile elapsedMs=0 ve elapsedMs=-100 testleri — bu doğru ve gerekli testler, doğru araçlar seçilmiş. Ancak madde 2'deki çelişki çözülmeden bu testler neyi doğruladığı belirsiz kalır: test "calcElapsed=10 oluyor" diyecek, ama bu paket gerçekten store'a mı yazılacak, yoksa üst katmanda zaten mi elenecekti — testin "doğru" davranışı tanımlamasının önkoşulu, madde 2'nin netleşmesidir.

Open Questions Bölümü Hakkında
"Herhangi bir açık soru bulunmamaktadır" ifadesi, yukarıdaki madde 2 çelişkisi ve kapsam/süreklilik belirsizliği (önceki 13 maddelik planla ilişki) göz önüne alındığında gerçeği yansıtmıyor. En az iki açık, kritik soru var.

Sonuç ve Tavsiye
MaddeDurum1. Persist İzolasyonu✅ Doğru yönde, race condition + migration netleştirilmeli2. Jitter Zero Guard🔴 Onaylanmaz — üst katman skip mekanizmasıyla çelişki var, açıklanmadan kabul edilemez3. Payload 2KB✅ Kabul edilebilir, gerekçe zayıf ama zararsız4. Edge case testleri⚠️ Doğru araçlar ama madde 2 netleşmeden hedefi belirsiz
Bu planı onaylamadan önce agent'tan şunu isteyin: Madde 2'nin, önceki onaylanan plandaki "30ms altı paketleri skip et" mekanizmasıyla ilişkisini açıkça tanımlasın — ikisi birlikte mi çalışıyor, biri diğerinin yerini mi alıyor? Bu netleşmeden madde 2 ve buna bağlı testler (madde 4'ün PidRegistry kısmı) onaylanmamalı. Madde 1, 3 ve 4'ün useTelemetryStore kısmı bağımsız olarak ilerleyebilir.