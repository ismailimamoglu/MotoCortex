# ADR 001: App.tsx Monolith Parçalanması ve Feature-Based Mimari Geçişi

**Tarih:** 5 Ağustos 2026  
**Durum:** Kabul Edildi (Accepted)  
**Karar Verenler:** MotoCortex Core Team  

---

## 1. Bağlam ve Problem (Context & Problem Statement)

MotoCortex uygulamasının ana mantığı, ekran düzenleri, modal yönetimleri, UI state'leri ve stil tanımlamaları tek bir dosya olan `App.tsx` (~179KB, 4000+ satır) içerisinde yer almaktadır.

Bu durum aşağıdaki teknik sorunlara yol açmaktadır:
1. **Maintainability (Bakım Zorluğu):** Kod okunabilirliği düşük, yeni geliştirici onboarding süresi uzun.
2. **Merge Conflict Riski:** Paralel geliştirme süreçlerinde `App.tsx` üzerinde kaçınılmaz merge çakışmaları.
3. **Performans Kaybı:** 20Hz telemetry akışında root bileşen re-render'larının tüm UI ağacını etkilemesi.
4. **Test Edilebilirlik:** Ekranların izole unit ve snapshot testlerinin yazılamaması.

---

## 2. Karar (Decision)

`App.tsx` monolitik yapısı parçalanacak ve aşağıdaki mimari ilkeler uygulanacaktır:

### A. Feature-Based Klasör Mimarisi
Tüm iş mantığı, ekranlar ve servisler `src/features/` dizini altında modüler olarak yapılandırılacaktır:
```text
src/
├── features/
│   ├── telemetry/         # Sensor grid, gauges, 20Hz stream
│   ├── diagnostics/       # DTC scanning, clear DTC, AI doctor
│   ├── coding/            # UDS ECU coding, feature activation
│   ├── garage/            # Saved vehicles, VIN history
│   └── settings/          # App settings, language, adapter status
├── screens/               # Screen level components (MainApp.tsx)
├── styles/                # Global theme tokens & appStyles.ts
├── store/                 # Zustand global state slices
└── components/            # Reusable UI primitives
```

### B. App.tsx Dosyasının Rolü
`App.tsx` yalnızca kök sağlayıcıları (AppProviders: ErrorBoundary, Navigation, I18n, Zustand Hydration) içerecek ve ana ekran olan `src/screens/MainApp.tsx` bileşenini render edecektir.

### C. State Management & Shallow Selectors
20Hz telemetry verileri için `useBluetoothStore` ve `useTelemetryStore` selector'ları `shallow` eşitlik karşılaştırması ile çağrılacak, batched state güncellemeleri kullanılacaktır.

---

## 3. Sonuçlar (Consequences)

### Olumlu (Positive)
- Ekranlar ve modüller izole edilerek test edilebilir hale gelecek.
- Bundler (Metro) parse süreleri ve RAM harcaması azalacak.
- Paralel geliştirme süreçleri çakışmasız yürütülebilecek.

### Takip Edilmesi Gereken Riskler (Negative / Mitigation)
- Taşınan `useEffect` bağımlılıklarında (dependency arrays) eksiklik olma riski. Jest unit test takımı (`npm test`) her adımda çalıştırılarak doğrulama yapılacaktır.
