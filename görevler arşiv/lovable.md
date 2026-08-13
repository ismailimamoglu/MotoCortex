\# MotoCortex — Bağlantı Regresyonu Analiz Raporu ve Düzeltme Planı

Depoyu (\`ismailimamoglu/MotoCortex\`, main) indirip bağlantı ve ELM327 protokol katmanını statik olarak inceledim. Aşağıdaki bulguların hepsi dosya/satır kanıtına dayanıyor.

\#\# Özet teşhis

Bağlantıyı engelleyen bir paywall/lisans/cihaz beyaz listesi \*\*yok\*\*. Sorun üç katmanda birikmiş durumda:

1\. \*\*Tarama filtreleri gerçek adaptörleri gizliyor\*\* (kullanıcı cihazı listede hiç göremiyor).  
2\. \*\*BLE GATT servis/karakteristik eşleşmesi sabit UUID listesine bağlı\*\*; daha iyi yazılmış otomatik keşif motoru yazılmış ama hiç çağrılmıyor (ölü kod).  
3\. \*\*ELM327 el sıkışma katmanında bir "çöp yanıt" sezgiseli normal cevapları hatalı işaretleyip el sıkışmanın ortasında adaptörü resetliyor.\*\*

Commit geçmişi de bunu destekliyor: 5–11 Ağustos arasında SGW/CAN FD/DoIP/J1939 ve "unify Android BLE transport UUIDs" gibi büyük bağlantı refaktörleri girmiş, ardından 11 Ağustos'ta arka arkaya 5 adet \`fix(connection)\` commit'i gelmiş. Yani regresyon bu refaktör penceresinde oluşmuş ve henüz kapanmamış.

\#\# Kritik bulgular (öncelik sırasıyla)

\*\*A1 — İsim regex'i ile cihaz eleme (en yüksek etki)\*\*  
\`BluetoothService.ios.ts:190-197\` ve \`BluetoothService.android.ts:176-217\`: taramada \`/(OBD|ELM|VLINKER|MONOFE|CARLY|BIMMER)/i\` dışındaki isimler ve \`ffe0|fff0\` içermeyen servis UUID'leri atılıyor. Klonların büyük kısmı \`HC-06\`, \`JDY-08\`, \`KW902\`, \`V-LINK\`, \`BT04-A\`, MAC tabanlı isimlerle yayın yapar; çoğu reklam paketinde servis UUID yayınlamaz. Android tarafında aynı filtre \*\*eşleşmiş (bonded) cihaz listesine de\*\* uygulanıyor — zaten çiftlenmiş adaptör bile "yok" görünüyor. Car Scanner/inFocar bu yüzden bağlanıp sizin uygulamanız bağlanamıyor.

\*\*A2 — Kullanılmayan GATT otomatik keşif motoru\*\*  
\`BLEBridge.ts:6-115\` içindeki \`KNOWN\_GATT\_PROFILES\` \+ \`autoDiscoverGattProfile()\` hiçbir yerden çağrılmıyor. Gerçek bağlantı yolları 4 sabit UUID'lik (FFE0/FFF0/18F0/vLinker) dar bir kopya listeyi kullanıyor.

\*\*A3 — Notify olmadan "bağlandı" demek\*\*  
\`android.ts:479\`, \`ios.ts:338\`: sadece write karakteristiği bulunursa bağlantı başarılı sayılıyor; notify aboneliği yoksa hiç veri gelmiyor → "bağlandı ama veri yok" tablosu.

\*\*A4 — Yanlış "çöp yanıt" tespiti el sıkışmayı resetliyor\*\*  
\`OBD2ProtocolEngine.ts:799-834\`: \`ATDP\` ("AUTO, ISO 15765-4...") ve \`ATRV\` ("12.3V") gibi tamamen normal yanıtlar ile \`SEARCHING...\` önekli cevaplar regex'e uymadığı için çöp sayılıyor; 3 kez sonra kuyruk temizlenip ortada \`ATWS\` gönderiliyor. Bu iki komut neredeyse her bağlantıda çağrıldığı için sayaç rutin olarak doluyor.

\*\*A5 — \`ATL0/ATS0/ATH1\` hiç gönderilmiyor\*\*  
\`AdapterProfileRegistry.getReinitCommands()\` tanımlı ama çağrılmıyor; canlı yolda sadece \`ATE0\` var (\`ProtocolNegotiator.ts:58-64\`). Oysa çok-ECU/ISO-TP ayrıştırıcılar \`7E8\`/\`18DAF110\` başlıklarına göre yazılmış — başlıklar açılmadığı için ECU yönlendirme fiilen çalışmıyor.

\*\*A6 — Yavaş hat (ISO9141/KWP) zamanlaması yanlış anda devreye giriyor\*\*  
\`OBD2ProtocolEngine.ts:366-369\`: \`isSlowKLine\` \`store.protocol\`'e bakıyor, ama bu değer ancak el sıkışma başarılı olduktan sonra doluyor. İlk \`0100\` probu 400 ms yerine 40 ms debounce ile çalışıyor → eski araçlarda yanıt yarıda kesiliyor.

\*\*A7 — \`ATIB10\` geçersiz komut\*\* (\`useBluetooth.ts:269\`). \`ATIB\` baud değeri \`10400\`/\`4800\`/\`9600\` olmalı; \`10\` çoğu firmware'de \`?\` döndürür ve A4'teki stall sayacını besler.

\*\*A8 — Zaman aşımı ve ilk denemede retry yok\*\*  
Android connect tüm eşleşme+PIN akışını 12 sn'ye sıkıştırıyor (\`android.ts:320-325\`); ilk bağlantı denemesinde retry/backoff yok, tek bir GATT-133 hatası akışı bitiriyor. iOS'ta \`requestMTU\` hiç çağrılmıyor.

\*\*A9 — Latent riskler\*\*: \`ELMIdentifierGate\` opsiyonel AT komutları desteklemeyen gerçek adaptörleri "klon" ilan ediyor (şu an ölü kod), \`ATI\` yanıtında "v1.5" geçen \*\*orijinal\*\* cihazlar da klon etiketleniyor. İzin tarafında Android 12+ için \`neverForLocation\` ile tarama ve çalışma anında izin yeniden kontrolü yok.

\#\# Düzeltme yol haritası

\*\*Faz 1 — Cihazı tekrar görünür ve bağlanabilir kılmak\*\*  
\- İsim/UUID beyaz listesini kaldır; tüm bulunan ve eşleşmiş cihazları listele, bilinen isimleri yalnızca "önerilen" rozetiyle üste sırala.  
\- \`BLEBridge.autoDiscoverGattProfile()\`'ı gerçek bağlantı yoluna bağla; sabit UUID listesi sadece hızlı yol olsun, bulunamazsa write+notify içeren her servisi dene.  
\- Notify karakteristiği bulunamazsa bağlantıyı başarılı sayma; CCCD yazımını doğrula.  
\- Android connect zaman aşımını aşamalandır (keşif 10 sn, eşleşme 30 sn, GATT 15 sn), ilk bağlantıya 3 denemelik backoff ekle, bonded cihazlar için \`autoConnect\` seçeneğini kullan.  
\- iOS'ta MTU/veri uzunluğu davranışını Android ile hizala.

\*\*Faz 2 — El sıkışmayı stabilize etmek\*\*  
\- "Çöp yanıt" sezgiselini kaldır ya da sadece bilinen bozuk çerçevelere (ardışık zaman aşımı) indirge; \`ATDP\`, \`ATRV\`, \`SEARCHING...\`, \`BUS INIT\` beyaz listeye girsin. \`ATWS\` enjeksiyonu sadece gerçek stall'da.  
\- Init sırasını tek yerden yönet: \`ATZ\` → 500 ms → \`ATE0\` → \`ATL0\` → \`ATS0\` → \`ATH1\` → \`ATSP0\` → \`0100\`. \`getReinitCommands()\`'ı bu akışa bağla.  
\- Protokol bilinmeden önce \*\*muhafazakâr\*\* zamanlama kullan (yavaş hat varsayımı), protokol tespit edildikten sonra hızlan.  
\- \`ATIB10\` → \`ATIB 10400\`; desteklenmiyorsa sessizce geç.  
\- Klon etiketlemesini bağlantı davranışından tamamen ayır; \`ELMIdentifierGate\` yalnızca teşhis ekranında ve bilgilendirme amaçlı çalışsın.

\*\*Faz 3 — Bir daha regresyona düşmemek (globalleşme şartı)\*\*  
\- Kaydet–oynat (record/replay) test altyapısı: gerçek araçlardan alınan ham ELM327 oturum logları fixture olarak saklanıp CI'da koşulur.  
\- Sanal ELM327 sunucusu (BLE/SPP/WiFi) ile klon davranışlarını (gecikme, \`?\` dönüşleri, parçalı çerçeve, tampon taşması) simüle eden entegrasyon testleri.  
\- Adaptör uyumluluk matrisi: adaptör modeli × protokol × sonuç, her sürümde güncellenir.  
\- Uygulama içi "bağlantı teşhis logu" ekranı ve dışa aktarma — saha testinde neyin nerede koptuğunu kanıta dayandırır.  
\- Bağlantı katmanına dokunulan her PR için zorunlu saha testi kontrol listesi.

\#\# Teknik notlar

\- Analiz \`main\` dalının 11 Ağustos 2026 tarihli halinde yapıldı; depoda \`.git\` olmadığı için satır bazlı diff değil, ölü kod ve commit başlıkları üzerinden regresyon çıkarımı yapıldı.  
\- A1 ve A4 tek başına saha semptomunu ("diğer uygulamalar bağlanıyor, benimki bağlanmıyor") açıklamaya yeter; ikisi de düşük riskli, hızlı düzeltilebilir.  
\- Bu Lovable projesi boş bir şablon; düzeltmeler harici React Native deposunda yapılmalı. Onaylarsanız bir sonraki adımda hangi fazdan başlayacağımızı ve değişiklikleri nasıl teslim edeceğimizi (yama seti / PR açıklaması) netleştiririz.

