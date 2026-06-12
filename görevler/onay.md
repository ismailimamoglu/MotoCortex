ajan"Mimarın son analiz raporu ([mimar3.md](file;file:///Users/ismailimamoglu/Desktop/MotoCortex/g%C3%B6revler/mimar3.md)) doğrultusunda useBluetooth.ts, useBluetoothStore.ts ve OBDCommandQueue.ts dosyalarını tamamen revize et. Şunları KESİN olarak uygula:
1. FSM (connectionState) yapısını genişlet: 'ADAPTER_CONNECTED', 'PROTOCOL_NEGOTIATING', 'ECU_DETECTED', 'ECU_RESPONDING', 'TELEMETRY_ACTIVE', 'ECU_NOT_FOUND', 'PROTOCOL_FAILED' durumlarını ekle ve UI katmanında bu geçişleri göster.
2. 'AT AL' veya 'AT H1' başarısız olduğunda bağlantıyı ASLA koparma (Hardware Blacklist iptal edildi). Bunun yerine arka planda bir 'adapterCapabilityScore' hesapla.
3. Fallback ağacındaki genel kuyruktan 'AT IIA 10' ve 'AT SI' gibi markaya özel agresif komutları tamamen ÇIKAR. Fallback sadece standart protokolleri (SP0, SP5, SP3, SP6, SP7) sırayla denesin.
4. Bağlantı doğrulamasını kesinlikle '01 00' ile değil, sadece '01 0C' (RPM) ile 'Kör İlklendirme (Blind Polling)' yaparak test et.
5. Her protokol denemesi başarısız olduğunda, 'PROTOCOL=SPX, COMMAND=010C, RAW=YANIT' formatında ham hata durumunu Raw Capture loguna yaz.
6. Yeniden bağlantı (Auto-Retry) başladığında, hayalet baytları silmek için rawResponseBuffer'ı sıfırla ve '\r' ile donanım flush'ı yap.
Tüm bunları entegre et, npx tsc --noEmit ile onayla."