# MotoCortex V2 - QA Test, Otomasyon & CI/CD Raporu

---

## 1. QA Test Raporu Özeti ve Risk Matrisi

| Test Alanı | Test Edilen Senaryo | Risk Seviyesi | Tespit Edilen Kritik Boşluk / Hata Potansiyeli |
| :--- | :--- | :--- | :--- |
| **Donanım & Voltaj** | Akü / Şarj Testinde Marş Anı | **YÜKSEK (CRITICAL)** | Marş anındaki ani voltaj düşüşünde BLE bağlantısının kopması ve yetersiz durum yönetimi (State Recovery). |
| **Telemetri & Performans** | 0-100 km/s Ölçümü & Polling Latency | **YÜKSEK (MAJOR)** | 8 PID sıralı sorgulanırken BLE sorgu döngüsü gecikmesi (3-4 Hz) nedeniyle milisaniyelik hızlanma sapması. |
| **ECU Güvenliği** | Motor Çalışırken DTC Silme (Mode 04) | **YÜKSEK (CRITICAL)** | `RPM > 0` durumunda Mode `04` komutu gönderilmesi sonucu ECU koruma modu veya iletişim kilitlenmesi. |
| **Lisanslama & PRO** | 3 Ücretsiz Deneme Sayacı Güvenliği | **ORTA (MODERATE)** | Yerel depolamadaki (`SharedPreferences` / `Keychain`) sayaç verisinin istemci tarafında manipüle edilebilmesi. |
| **Protokol / Parsing** | Kötü Kalite ELM327 Klon Yanıtları | **ORTA (MODERATE)** | Düzensiz gürültülü paketlerde (`BUS ERROR`, `NO DATA`) UI/Isolate kilitlenmesi veya Regex çökmesi. |

---

## 2. Detaylı Hata Analizi ve Mantık Boşlukları

### Hata 1: Marş (Cranking) Anında Voltaj Düşüşü ve BLE Kopma Yönetimi
* **Senaryo:** 3 aşamalı akü testinde, kullanıcı marş bastığında marş motoru OBD2 portuna gelen gerilimi anlık olarak 8.5V - 9.5V seviyesine düşürür. Ucuz BLE OBD2 adaptörlerinin birçoğu (örneğin v1.5/v2.1 klonlar) bu voltaj seviyesinde kendisini resetler veya BLE bağlantısını koparır.
* **Mantık Boşluğu:** Eğer uygulama test sırasında gelen BLE bağlantı kopmasını bir "bağlantı hatası" olarak ele alıp testi tamamen iptal ediyorsa veya o andaki son voltaj değerini (0V veya son okunan düşük değer) "Akü Ölü" olarak yorumluyorsa, kullanıcıya yanlış teşhis konulur.
* **Beklenen QA Davranışı:** Uygulama marş basma anındaki kopmaları **"Beklenen Donanım Resetleme Davranışı"** olarak tanımalı, re-connection (yeniden bağlanma) mekanizmasını 2-3 saniyelik agresif polling ile başlatmalı ve kopma öncesi alınan minimum voltaj dalgasını (trough voltage) log kaydından analiz etmelidir.

### Hata 2: 0-100 km/s Performans Ölçümünde PID Polling Frekansı ve Discretization
* **Senaryo:** Uygulama canlı göstergede 8 farklı PID (RPM, Speed, Temp, TPS, MAP, Load, Battery vb.) izliyor. Standart bir ELM327 BLE adaptöründe tek bir PID için `Tx -> Rx` döngüsü ortalama **35ms - 50ms** sürer. 8 PID sıralı (sequential) istendiğinde tek bir döngü 300ms - 400ms sürer. Bu da veri tazeleme hızının **2.5 Hz - 3.3 Hz** arasında kalması demektir.
* **Mantık Boşluğu:** 3.3 Hz örnekleme frekansıyla 0-100 km/s ölçümü yapılırken, hız verisi örneğin `42 km/s` değerinden bir sonraki pakette doğrudan `58 km/s` değerine atlar. Ara değerler interpolasyon ile doldurulmazsa "milisaniye hassasiyetli performans ölçümü" iddiası teknik olarak boşa çıkar.
* **Beklenen QA Davranışı:** Performans moduna geçildiğinde diğer 7 PID sorgusu durdurulmalı/yavaşlatılmalı ve sadece `010D` (Vehicle Speed) PID'sine **Priority Mode** verilerek polling frekansı maksimuma (15-20 Hz) çıkarılmalıdır. Ayrıca telefondaki GPS ve ivmeölçer (Accelerometer) verisiyle ECU hızı **Kalman Filtresi** üzerinden birleştirilmelidir (Sensor Fusion).

### Hata 3: Motor Çalışırken `04` (Clear DTC) Komutu Gönderim Riski
* **Senaryo:** Kullanıcı sürüş esnasında veya motor çalışırken (`RPM > 500`) arıza kodlarını okur ve "Arıza Kodlarını Sil" butonuna basar.
* **Mantık Boşluğu:** Bazı EURO 4/5 ve özellikle Bosch/Delphi ECU kullanan motosikletlerde motor çalışırken `04` (Clear Diagnostic Information) komutu gönderilmesi, ECU'nun iletişim protokolünü kapatmasına, gösterge panelinin kilitlenmesine veya motorun anlık teklemesine yol açabilir.
* **Beklenen QA Davranışı:** `04` komutu tetiklenmeden önce `RPM` değeri kontrol edilmeli; eğer `RPM > 0` ise buton pasifleştirilmeli ve kullanıcıya *"Güvenlik nedeniyle arıza kodları yalnızca kontak açık ama motor çalışmıyorken silinebilir."* uyarısı gösterilmelidir.

### Hata 4: 3 Ücretsiz Kullanım Sayacının İstemci Tarafında Aşılması
* **Senaryo:** Kullanıcı 3 ücretsiz hakkını doldurur. Ardından Android'de *Uygulama Verilerini Temizle (Clear Data)* yapar veya iOS'te uygulamayı silip tekrar yükler.
* **Mantık Boşluğu:** Eğer kullanılan hak sayısı cihazın yerel depolamasında (`SharedPreferences`, `NSUserDefaults`) veya düz yazıyla tutuluyorsa, kullanıcı ödeme yapmadan uygulamayı sınırsız kez sıfırlayarak kullanabilir.
* **Beklenen QA Davranışı:** Cihaz Kimliği (`IDFV` / `Android ID`) veya Firebase/Custom backend üzerinde anonim bir hash hesabı ile kullanım sayısı sunucu tarafında tutulmalı veya en azından `KeyChain` / `EncryptedSharedPreferences` üzerinde persis edilmelidir.

### Hata 5: Kötü Kalite ELM327 Klonlarında Delimiter ve Stream Parsing Çökmesi
* **Senaryo:** Piyasadaki ucuz v2.1 ELM klonları standart dışı yanıtlar üretir (`BUS INIT: ... ERROR`, `SEARCHING...`, eksik `>` karakteri veya garip ASCII gürültüleri).
* **Mantık Boşluğu:** Stream bazlı gelen verilerde Regex parser tek bir eksik `>` karakterinde veya beklenmeyen `CAN ERROR` dizesinde buffer'ı temizlemezse sonraki tüm yanıtlar bir karakter kayar (Data Desynchronization).
* **Beklenen QA Davranışı:** Seri port okuyucu katmanında her komut öncesinde `AT CLEAR` / Buffer Flush yapılmalı, belirli bir timeout (örn. 500ms) aşıldığında komut düşürülüp `AT Z` atılmadan akış yeniden başlatılabilmelidir.

---

## 3. Mimarinin Güçlü Yönleri

1. **Simulation (Demo) Mode Entegrasyonu:** Gerçek adaptör olmadan uygulamanın mock veriyle test edilebilmesi hem uç kullanıcı deneyimini artırır hem de Apple App Store inceleme ekiplerinin (App Review) OBD donanımı olmadan uygulamayı onaylamasını sağlayan kritik bir mimari karardır.
2. **Apple BLE & Wi-Fi Ayrımı:** iOS platformunun Bluetooth Classic (v2.1) kısıtlamasını açıkça belirtip kullanıcıyı BLE 4.0 ve Wi-Fi adaptörlerine yönlendirmesi support yükünü ciddi oranda azaltır.
3. **VIN Tabanlı Dijital Garaj Yapısı:** Arıza geçmişini şasi numarasıyla (VIN) indeksleyip yerelde saklamak, çoklu araç takip eden kullanıcılar için sürdürülebilir bir veri modeli sunar.

---

## 4. Test Otomasyonu: Mock OBD2 Adaptörü & Entegrasyon Testleri

### 4.1. Mock OBD2 Response Handler (`test/mocks/mock_obd_adapter.dart`)

```dart
import 'dart:async';
import 'dart:typed_data';

enum ObdConnectionState { disconnected, connecting, connected }

class MockObdAdapter {
  final StreamController<List<int>> _incomingStreamController =
      StreamController<List<int>>.broadcast();

  ObdConnectionState _state = ObdConnectionState.disconnected;
  ObdConnectionState get state => _state;

  Stream<List<int>> get responseStream => _incomingStreamController.stream;

  // Simulated Engine State
  int currentRpm = 1750; // Engine running by default
  int currentSpeed = 65; // km/h
  double currentVoltage = 12.6;
  bool simulateVoltageDropOnCrank = false;
  bool simulatePacketChunking = false;

  Future<bool> connect() async {
    _state = ObdConnectionState.connecting;
    await Future.delayed(const Duration(milliseconds: 300));
    _state = ObdConnectionState.connected;
    return true;
  }

  void disconnect() {
    _state = ObdConnectionState.disconnected;
  }

  /// Simulates sending an AT or OBD command from the mobile app to the ELM327 device.
  Future<void> sendCommand(String command) async {
    final cleanCommand = command.trim().replaceAll(' ', '').toUpperCase();
    await Future.delayed(const Duration(milliseconds: 45)); // Latency delay

    String rawResponse = '';

    if (cleanCommand.startsWith('AT')) {
      rawResponse = _handleAtCommand(cleanCommand);
    } else if (cleanCommand.startsWith('01')) {
      rawResponse = _handleMode01Pid(cleanCommand);
    } else if (cleanCommand == '03') {
      // Mode 03: Read Stored Diagnostic Trouble Codes
      rawResponse = '43 02 01 08 03 00\r\r>'; // P0108 (MAP High input), P0300 (Random Misfire)
    } else if (cleanCommand == '04') {
      // Mode 04: Clear Diagnostic Trouble Codes
      if (currentRpm > 0) {
        rawResponse = 'BUS ERROR\r\r>'; // ECU safety refusal when engine is running
      } else {
        rawResponse = '44\r\r>'; // Success
      }
    } else {
      rawResponse = 'NO DATA\r\r>';
    }

    _emitResponse(rawResponse);
  }

  String _handleAtCommand(String command) {
    switch (command) {
      case 'ATZ':
        return 'ELM327 v1.5\r\r>';
      case 'ATE0':
      case 'ATH1':
      case 'ATSP0':
      case 'ATAL':
        return 'OK\r\r>';
      case 'ATRV':
        if (simulateVoltageDropOnCrank) {
          return '8.9V\r\r>'; // Voltaj düşüşü simülasyonu (Marş anı)
        }
        return '${currentVoltage.toStringAsFixed(1)}V\r\r>';
      default:
        return 'OK\r\r>';
    }
  }

  String _handleMode01Pid(String command) {
    final pid = command.substring(2);
    switch (pid) {
      case '00': // Supported PIDs [01-20]
        return '41 00 BE 3E A8 13\r\r>';
      case '0C': // Engine RPM -> Formula: ((A * 256) + B) / 4
        final rawRpm = currentRpm * 4;
        final a = (rawRpm ~/ 256).toRadixString(16).padLeft(2, '0');
        final b = (rawRpm % 256).toRadixString(16).padLeft(2, '0');
        return '41 0C $a $b\r\r>';
      case '0D': // Vehicle Speed -> Formula: A
        final a = currentSpeed.toRadixString(16).padLeft(2, '0');
        return '41 0D $a\r\r>';
      case '05': // Coolant Temp -> Formula: A - 40
        return '41 05 7B\r\r>'; // 83°C
      case '11': // Throttle Position -> Formula: (A * 100) / 255
        return '41 11 40\r\r>'; // ~25%
      default:
        return 'NO DATA\r\r>';
    }
  }

  void _emitResponse(String responseStr) {
    final bytes = responseStr.codeUnits;

    if (simulatePacketChunking && bytes.length > 8) {
      // Splits packets to simulate BLE MTU fragmented arrivals
      final chunk1 = bytes.sublist(0, 8);
      final chunk2 = bytes.sublist(8);

      _incomingStreamController.add(chunk1);
      Future.delayed(const Duration(milliseconds: 15), () {
        _incomingStreamController.add(chunk2);
      });
    } else {
      _incomingStreamController.add(bytes);
    }
  }

  void dispose() {
    _incomingStreamController.close();
  }
}
```

### 4.2. Flutter Integration Test Suite (`integration_test/motocortex_flow_test.dart`)

```dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

import 'package:motocortex/main.dart' as app;
import 'package:motocortex/core/di/service_locator.dart'; 
import 'package:motocortex/core/obd/obd_service.dart';

import '../test/mocks/mock_obd_adapter.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  late MockObdAdapter mockObdAdapter;

  setUp(() async {
    mockObdAdapter = MockObdAdapter();
    
    if (sl.isRegistered<ObdService>()) {
      await sl.unregister<ObdService>();
    }
    sl.registerSingleton<ObdService>(ObdService(adapter: mockObdAdapter));
  });

  tearDown(() {
    mockObdAdapter.dispose();
  });

  group('MotoCortex E2E Diagnostics Test Suite', () {
    testWidgets('1. Connect to BLE OBD2, initialize protocol, and parse RPM/Speed data',
        (WidgetTester tester) async {
      app.main();
      await tester.pumpAndSettle();

      final connectBtn = find.byKey(const Key('btn_connect_obd'));
      expect(connectBtn, findsOneWidget);
      await tester.tap(connectBtn);
      await tester.pumpAndSettle();

      await mockObdAdapter.connect();
      await tester.pump(const Duration(milliseconds: 500));

      expect(find.byKey(const Key('dashboard_view')), findsOneWidget);

      final rpmText = find.byKey(const Key('widget_rpm_value'));
      expect(rpmText, findsOneWidget);
      expect(tester.widget<Text>(rpmText).data, contains('1750'));

      final speedText = find.byKey(const Key('widget_speed_value'));
      expect(speedText, findsOneWidget);
      expect(tester.widget<Text>(speedText).data, contains('65'));
    });

    testWidgets('2. Safety Protocol Check: Block DTC clearing while engine RPM > 0',
        (WidgetTester tester) async {
      app.main();
      await tester.pumpAndSettle();
      await mockObdAdapter.connect();

      mockObdAdapter.currentRpm = 1200;

      final dtcTab = find.byKey(const Key('nav_dtc_diagnostics'));
      await tester.tap(dtcTab);
      await tester.pumpAndSettle();

      final clearDtcBtn = find.byKey(const Key('btn_clear_dtc'));
      expect(clearDtcBtn, findsOneWidget);
      await tester.tap(clearDtcBtn);
      await tester.pumpAndSettle();

      expect(find.textContaining('Cannot clear codes while engine is running'), findsOneWidget);

      mockObdAdapter.currentRpm = 0;
      await tester.tap(clearDtcBtn);
      await tester.pumpAndSettle();

      await mockObdAdapter.sendCommand('04');
      await tester.pumpAndSettle();

      expect(find.textContaining('Fault codes cleared successfully'), findsOneWidget);
    });

    testWidgets('3. Cranking Voltaj Drop & Auto-Recovery Handling',
        (WidgetTester tester) async {
      app.main();
      await tester.pumpAndSettle();
      await mockObdAdapter.connect();

      mockObdAdapter.simulateVoltageDropOnCrank = true;
      await mockObdAdapter.sendCommand('ATRV');
      await tester.pump(const Duration(milliseconds: 100));

      mockObdAdapter.disconnect();
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.textContaining('Reconnecting'), findsOneWidget);

      mockObdAdapter.simulateVoltageDropOnCrank = false;
      await mockObdAdapter.connect();
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('dashboard_view')), findsOneWidget);
    });
  });
}
```

---

## 5. CI/CD Otomasyonu: GitHub Actions Workflow (`.github/workflows/integration_test.yml`)

```yaml
name: MotoCortex Integration Tests

on:
  pull_request:
    branches:
      - main
      - develop
    paths:
      - 'lib/**'
      - 'test/**'
      - 'integration_test/**'
      - 'pubspec.yaml'
      - '.github/workflows/integration_test.yml'
  workflow_dispatch:

jobs:
  analyze-and-unit-test:
    name: 🔍 Static Analysis & Unit Tests
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Set up Java JDK
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'

      - name: Set up Flutter
        uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.24.x'
          channel: 'stable'
          cache: true
          cache-key: "flutter-:os:-:channel:-:version:-:arch:-:${{ hashFiles('**/pubspec.lock') }}"

      - name: Install Dependencies
        run: flutter pub get

      - name: Analyze Code
        run: flutter analyze

      - name: Run Unit & Widget Tests
        run: flutter test --coverage

  integration-test-android:
    name: 📱 Android Emulator Integration Test
    needs: analyze-and-unit-test
    runs-on: macos-13 # macOS runner supports hardware acceleration for Android Emulator
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Set up Java JDK
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'

      - name: Set up Flutter
        uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.24.x'
          channel: 'stable'
          cache: true

      - name: Install Dependencies
        run: flutter pub get

      - name: Run Integration Tests on Android Emulator
        uses: ReactiveCircus/android-emulator-runner@v2
        with:
          api-level: 33
          target: google_apis
          arch: x86_64
          force-avd-creation: false
          emulator-options: -no-snapshot-save -no-window -gpu swiftshader_indirect -noaudio -no-boot-anim -camera-back none
          disable-animations: true
          script: flutter test integration_test/motocortex_flow_test.dart

      - name: Upload Test Failure Artifacts
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: android-integration-test-artifacts
          path: |
            build/app/outputs/logs/
            integration_test/screenshots/
```

---

## 6. Pipeline Mimari Kritik ve Sorular

### CI/CD Pipeline Darboğazları
1. **macOS Runner Maliyeti:** `macos-13` runner kullanımı Linux runner'lara kıyasla 10 kat daha pahalıdır. Pure Dart mock kullanan bir test için emulator çalıştırmak süre ve maliyet açısından gereksizdir.
2. **Cold Boot Gecikmesi:** API 33 AVD boot süresi (3-5 dk) her PR'da toplam pipeline süresini 10+ dakikaya çıkarır.
3. **Flakiness Riskleri:** CI ortamında OOM veya ADB zaman aşımı sonucu oluşan yalancı başarısızlıkları (false positives) engelleyecek `retry` mekanizması bulunmamaktadır.

### Sorgulanması Gereken Mimari Kararlar
1. Native Bluetooth kısıtlamalarını (`MethodChannel` seviyesinde kapatılan BT) yalnızca Dart Mock katmanında nasıl izole edeceksin?
2. Test paketi büyüdüğünde Matrix Sharding ile testleri parallelize etme planın nedir?
3. Emulator üzerindeki render gecikmelerini ve `pumpAndSettle` zaman aşımlarını engellemek için ne tür bir timeout/retry stratejisi kurguladın?
