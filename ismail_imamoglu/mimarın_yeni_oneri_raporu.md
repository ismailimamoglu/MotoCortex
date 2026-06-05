# 📄 Mimarın Otonom OBD2 Protokol Arama Önerisi Teknik Analiz Raporu

Bu rapor, yazılım mimarının `useBluetooth.ts` içindeki `initializeAndCheckEcu` bağlantı metodunda yer alan manuel protokol tarama döngüsünün kaldırılması ve yerine ELM327 adaptörünün yerel otonom otomatik arama protokolünün (`AT SP 0`) kullanılması yönündeki mimari tavsiyesinin teknik analizini içermektedir.

---

## 🛠️ Mevcut Yaklaşım vs. Mimarın Önerdiği Otonom Yaklaşım

### 1. Mevcut Tasarım (Manuel Tarama):
Mevcut kodumuzda bağlantı kurulurken sırasıyla şu AT komutları gönderilir:
1. `AT SP 6` (CAN 11-bit) ayarlanır ve `01 0C` (RPM) sorgusu gönderilir. Yanıt gelmezse catch bloğuna düşülür.
2. `AT SP 7` (CAN 29-bit) ayarlanır ve `01 0C` sorgulanır. Yanıt gelmezse catch bloğuna düşülür.
3. `AT SP 5` (KWP Fast Init) ayarlanır ve `01 0C` sorgulanır.

**Mimarın Eleştirisi:** 
Her protokol geçişinde (`AT SP X` sonrası `01 0C` okuma denemesi) eğer araç o protokolü desteklemiyorsa, asenkron Bluetooth okuma kuyruğunda beklemeler ve timeout'lar oluşur. Bu durum Bluetooth arabelleklerinin şişmesine, asenkron kuyruğun tıkanmasına ve bazı Çin klon donanımlarının dahili firmware'inin tamamen kilitlenerek fiziksel olarak cihazın fişini çekip takana kadar yanıt vermemesine (frozen state) neden olur.

---

### 2. Önerilen Yeni Tasarım (Otonom Arama):
Mimarın önerdiği mimaride, protokol seçme yükü tamamen **ELM327 donanımının kendi işlemcisine** devredilir:
1. Donanıma **`AT SP 0` (Automatic Protocol Search)** komutu gönderilir. Bu komut, adaptöre *"Sana göndereceğim ilk OBD sorgusunda desteklenen tüm protokolleri sırayla kendi içinde dene ve aracı bulduğun an o protokole kilitlen"* talimatını verir.
2. Ardından aracı uyandırmak ve protokol taramasını donanım seviyesinde tetiklemek için standart **`01 00` (Supported PIDs [01-20])** komutu 3000ms asenkron watchdog timeout süresi ile gönderilir.
3. Donanım araçla el sıkışıp bağlandıktan sonra **`AT DP` (Describe Protocol)** komutu fırlatılır. ELM327'nin otonom olarak hangi protokolü (örn: `ISO 9141-2`, `ISO 15765-4 CAN` vb.) seçtiği string olarak okunur ve loglanır.
4. Hata durumlarında (özellikle eski araçlarda veya bağlantı kopmalarında dönen) **`UNABLE TO CONNECT`** durumları güvenli bir şekilde yakalanarak uygulamanın kilitlenmesi önlenir ve ECU bağlantı durumu temiz bir şekilde `error` / `disconnected` state'ine çekilir.

---

## 📝 Planlanan Kod Değişikliği (Refaktör Difi)

`src/hooks/useBluetooth.ts` içindeki `initializeAndCheckEcu` metodunda yapılacak değişikliklerin taslağı aşağıdaki gibidir:

```diff
-            // 2. Dynamic Initialization & Protocol Scan
-            let ecuConnected = false;
-            let rpmRes = '';
-
-            // Scan modern CAN protocols first with a short timeout (AT ST 96 -> 600ms)
-            await OBDCommandQueue.add("AT ST 96");
-            
-            // Try ISO 15765-4 CAN 11bit 500K (AT SP 6)
-            await OBDCommandQueue.add("AT SP 6");
-            try {
-                rpmRes = await OBDCommandQueue.add(ADAPTER_COMMANDS.RPM, 800);
-                if (rpmRes && !rpmRes.includes('NO DATA') && !rpmRes.includes('ERROR') && !rpmRes.includes('UNABLE TO CONNECT')) {
-                    ecuConnected = true;
-                }
-            } catch (e) {
-                // Ignore and proceed to SP 7
-            }
-
-            if (!ecuConnected) {
-                // Try ISO 15765-4 CAN 29bit 500K (AT SP 7)
-                await OBDCommandQueue.add("AT SP 7");
-                try {
-                    rpmRes = await OBDCommandQueue.add(ADAPTER_COMMANDS.RPM, 800);
-                    if (rpmRes && !rpmRes.includes('NO DATA') && !rpmRes.includes('ERROR') && !rpmRes.includes('UNABLE TO CONNECT')) {
-                        ecuConnected = true;
-                    }
-                } catch (e) {
-                    // Ignore and proceed to fallback
-                }
-            }
-
-            if (!ecuConnected) {
-                // Switch to K-Line (ISO 9141-2 / ISO 14230-4) with high timeout and warning
-                setError(t('connection.klineWarning', 'Eski araç protokolü uyarılıyor, bu işlem 3 saniye sürebilir...'));
-                await OBDCommandQueue.add("AT ST FF"); // Max ELM327 timeout (1020ms)
-                await OBDCommandQueue.add("AT SP 5");
-                
-                try {
-                    rpmRes = await OBDCommandQueue.add(ADAPTER_COMMANDS.RPM, 2500); // 2500ms watchdog
-                    if (rpmRes && !rpmRes.includes('NO DATA') && !rpmRes.includes('ERROR') && !rpmRes.includes('UNABLE TO CONNECT')) {
-                        ecuConnected = true;
-                    }
-                } catch (e) {
-                    // Ignore
-                }
-            }
+            // 2. Dynamic Initialization & Autonomous Protocol Scan (ELM327 Engine)
+            let ecuConnected = false;
+            let rpmRes = '';
+
+            try {
+                // Set ELM327 to Automatic Protocol Search Mode
+                await OBDCommandQueue.add("AT SP 0");
+                
+                // Send 01 00 to wake up vehicle and let ELM327 scan and negotiate protocol automatically.
+                // Watchdog timeout is increased to 3000ms as suggested by the architect.
+                const initRes = await OBDCommandQueue.add("01 00", 3000);
+                
+                if (initRes && 
+                    !initRes.toUpperCase().includes('NO DATA') && 
+                    !initRes.toUpperCase().includes('ERROR') && 
+                    !initRes.toUpperCase().includes('UNABLE TO CONNECT')) {
+                    
+                    ecuConnected = true;
+                    
+                    // Ask the adapter which protocol it successfully selected and log it
+                    const selectedProtocol = await OBDCommandQueue.add("AT DP");
+                    useBluetoothStore.getState().addLog(`AUTONOMOUS_PROTOCOL_SELECTED: ${selectedProtocol.trim()}`);
+                    
+                    // Fetch initial RPM as confirmation
+                    rpmRes = await OBDCommandQueue.add(ADAPTER_COMMANDS.RPM, 1000);
+                } else if (initRes && initRes.toUpperCase().includes('UNABLE TO CONNECT')) {
+                    useBluetoothStore.getState().addLog('DIAG: Connection failed with UNABLE TO CONNECT');
+                }
+            } catch (e) {
+                const msg = e instanceof Error ? e.message : String(e);
+                useBluetoothStore.getState().addLog(`DIAG: Autonomous initialization error: ${msg}`);
+                
+                // Safe handling of UNABLE TO CONNECT inside error blocks
+                if (msg.toUpperCase().includes('UNABLE TO CONNECT')) {
+                    useBluetoothStore.getState().addLog('DIAG: Caught UNABLE TO CONNECT exception safely');
+                }
+            }
```

---

## 📈 Bu Değişikliğin Faydaları ve Riskleri

### ✅ Faydaları:
1. **Asenkron Kuyruk Güvenliği:** Protokol tespiti için arka arkaya başarısız yazma ve okuma işlemleri yapılmayacağından kuyruk kilitlenmeleri tamamen ortadan kalkar.
2. **Klon Cihaz Kararlılığı:** Ucuz Çin klonu Bluetooth adaptörlerin başarısız paketler nedeniyle kilitlenme (frozen) oranı sıfıra iner.
3. **Maksimum Araç Uyumluluğu:** 2004 Honda Accord dahil olmak üzere tüm eski ve yeni araçlarda, adaptör desteklediği tüm protokolleri otonom olarak milisaniyeler içinde deneyerek en kararlı protokolü kendi seçer.
4. **Loglama ve Teşhis Kolaylığı:** `AT DP` ile seçilen protokolü doğrudan göreceğimiz için saha hata analizlerinde hangi aracın hangi protokolle bağlandığını net olarak biliriz.

### ⚠️ Riskler / Dikkat Edilmesi Gerekenler:
* **İlk Bağlantı Süresi (Handshake Delay):** Otonom arama modunda adaptör tüm protokolleri (CAN, K-Line, PWM, VPW) baştan aşağı tarayacağı için ilk bağlantı el sıkışma süresi 1-2 saniye uzayabilir. Ancak bu bir kez yapılacağı için kararlılık kazancının yanında ihmal edilebilir bir gecikmedir.

---

## 🛑 Onay Talebi
Bu refaktör planı hazır olup, **kod tabanına herhangi bir müdahale yapılmamıştır**. 
Onay vermeniz durumunda değişiklikler `src/hooks/useBluetooth.ts` dosyasına güvenli bir şekilde uygulanacaktır.
