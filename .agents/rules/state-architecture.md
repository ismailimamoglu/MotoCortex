# State Management & Singleton Architecture Rules

**Scope:** Zustand store, BLE/Wi-Fi transport hook'ları, native modül veya
JSI köprüsü dokunan görevlerde aktif.

Secret yönetimi ve parametrize SQL kuralları burada tekrar tanımlanmıyor →
`global-constraints.md` madde 2 ve 3.

## 1. Single Source of Truth (No Duplicate Instances)
- Aynı hardware gateway için birden fazla socket/connection stream
  instantiate edilemez.
- Global hardware durumu (Bluetooth stream, OBD queue) tek bir core
  controller (`useBluetooth.ts`) tarafından yönetilir. İkincil connection
  hook'ları (örn. `useDiagnosticEngine`) oluşturmak yasaktır.

## 2. UI Thread Isolation & Performance (Direct JSI-to-Ref Pipeline)
- Yüksek frekanslı veri (20 Hz telemetri) standart Zustand selector'ları
  veya `store.subscribe()` üzerinden ekrana **asla** çekilmez.
- Bunun yerine Expo Module native tarafında Pure JSI Listener (C++ Event
  Callback) tanımlanır; React Native tarafı bu listener'a doğrudan
  subscribe olup gelen `SharedObject`/`ByteBuffer`'ı doğrudan React Ref'e
  yazar (Direct JSI-to-Ref Pipeline), JS Event Loop ve Zustand'ı tamamen
  bypass eder.
- Zustand **sadece** düşük frekanslı connection state'leri için kullanılır
  (`CONNECTED`, `RECONNECTING`, `DISCONNECTED`).

## 3. Hardware Capability Gate & Dual-Transport Architecture (Pure TCP Focus)
- Abstract `ITransport` interface zorunlu; `useBluetooth.ts` ve
  `useWifiTransport.ts` ikisi de bunu implement eder.
- Wi-Fi bağlantısı için pure TCP socket mimarisi (`java.net.Socket` Kotlin,
  `NWConnection` TCP mode Swift). Socket initialize edilir edilmez
  `keepAlive = true` ve `noDelay = true` (Nagle's algorithm kapalı)
  uygulanır.
- Wi-Fi transport aktifken `CommandScheduler` timeout'u 500ms'den 200ms'ye
  adaptif olarak düşer (TCP packet loss'u UI'ı dondurmadan yönetmek için).
- UDS/Coding feature'ları aktif edilmeden önce adapter'ın ELM version
  benchmark'ı değerlendirilir. Hardware v1.4b üstü komutlara '?' (unknown)
  ile cevap veriyorsa, `isCodingAllowed` açıkça `false`'a kilitlenir.

## 4. Low-Level Transport Stability & GC Avoidance (JSI Zero-Allocation)
- **Zero-Allocation & Ring Buffer:** `ELMParser.ts` ve native modüller
  yüksek frekanslı telemetri frame'leri için yeni memory allocation
  üretmez. Aynı memory adresi in-place mutation veya mutated ring buffer
  ile yeniden kullanılır; her tick'te eski referanslar açıkça
  release/dispose edilir.
- **BLE MTU Negotiation:** `react-native-ble-plx` veya native Swift/Kotlin
  BLE stack ile bağlantı kurulduğunda, `ELMIdentifierGate` tetiklenmeden
  önce MTU 512 byte'a çıkacak şekilde explicit negotiation yapılır.
- **Mutex Auto-Release & Queue Flush on Cranking:** `OBDCommandQueue`
  içindeki her Mutex-locked yazma işlemi `try...finally` ile sarılır;
  transport layer low-level hardware exception fırlatırsa mutex 15ms
  içinde garantili release edilir.
- **Cranking Recovery (Queue Flush):** Marşa basma anındaki voltaj
  düşüşüyle Warm-Start tetiklendiğinde, native `OBDCommandQueue`
  kuyrukta bekleyen veya yarım kalmış tüm ad-hoc/telemetri komutlarını
  otomatik flush eder; queue sıcak yeniden başlatma sonrası clean-state
  ile başlar.

## 5. Spaghetti Kod Önleme ve Bileşen Bölme Standartları
- React bileşenleri (component, screen) ve yardımcı dosyalar en fazla **500 satır** civarında tutulmalıdır. Tek bir dosyanın aşırı büyümesi (örn: eski 1200+ satırlık `LiveEngineHero.tsx` yapısı) bakımı zorlaştırır ve re-render döngülerine sebep olur.
- Sorumluluğu artan büyük bileşenler, mantıksal alt birimlerine göre izole edilerek kendi klasörleri (örn: `src/components/live-engine/`) altında alt bileşenlere bölünmelidir.
- Alt bileşenler arası veri paylaşımı temiz `props`, `context` veya Zustand store'ları ile yapılmalı; parent container sadece koordinasyon görevini üstlenmelidir.

