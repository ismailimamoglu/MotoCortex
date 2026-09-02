/**
 * scripts/update_share_message_26.js
 * 
 * Updates info.shareMessageText across all 26 language files in src/locales/*.json
 * with the clean, comprehensive non-emoji feature presentation.
 */

const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../src/locales');

const IOS_LINK = 'https://apps.apple.com/app/id6764052240';
const ANDROID_LINK = 'https://play.google.com/store/apps/details?id=com.ismail.motocortexv2';
const WEB_LINK = 'https://motocortex-telemetry.vercel.app/';

const MESSAGES = {
  tr: `Cortex OBD2 Diagnostic Scanner ile aracınızın kontrolünü elinize alın!

Profesyonel arıza tespit ve araç yönetim özellikleri:
- ECU ve Motor Arıza Tespiti: Arıza kodlarını (DTC) okuyun ve tek tıkla silin
- Canlı Telemetri: Turbo basıncı, yağ/soğutma sıvısı sıcaklığı, yakıt trimleri ve 50+ sensör verisi
- 0-100 km/s Hızlanma Testi: Canlı GPS ve sensör destekli performans ölçümü
- Gizli Özellik Kodlama: Araç marka ve modeline özel konfor ve sürüş modlarını aktif edin
- Detaylı Teşhis Raporu: PDF formatında anlık araç durum raporu oluşturun

Hemen indirin ve aracınıza bağlanın:
iOS (App Store):
${IOS_LINK}

Android (Google Play):
${ANDROID_LINK}

Web Panel:
${WEB_LINK}`,

  en: `Take full control of your vehicle with Cortex OBD2 Diagnostic Scanner!

Professional diagnostic and vehicle management features:
- ECU & Engine Diagnostics: Read and clear diagnostic trouble codes (DTC) with one tap
- Live Telemetry: Turbo boost, oil/coolant temperature, fuel trims, and 50+ sensor metrics
- 0-100 km/h (0-60 mph) Acceleration Test: Live GPS and sensor-assisted performance timing
- Hidden Feature Coding: Unlock comfort and driving modes tailored to your make and model
- Detailed Diagnostic Report: Generate instant vehicle health reports in PDF format

Download now and connect to your vehicle:
iOS (App Store):
${IOS_LINK}

Android (Google Play):
${ANDROID_LINK}

Web Panel:
${WEB_LINK}`,

  de: `Übernehmen Sie die volle Kontrolle über Ihr Fahrzeug mit Cortex OBD2 Diagnostic Scanner!

Professionelle Diagnose- und Fahrzeugverwaltungsfunktionen:
- ECU- & Motordiagnose: Fehlercodes (DTC) auslesen und mit einem Klick löschen
- Live-Telemetrie: Ladedruck, Öl-/Kühlmitteltemperatur, Gemischanpassung und 50+ Sensordaten
- 0-100 km/h Beschleunigungstest: Präzise Leistungsmessung mit GPS- und Sensorunterstützung
- Versteckte Funktionen codieren: Komfort- und Fahrmodi passend für Marke und Modell freischalten
- Detaillierter Diagnosebericht: Sofortige Fahrzeugstatusberichte im PDF-Format erstellen

Jetzt herunterladen und mit Ihrem Fahrzeug verbinden:
iOS (App Store):
${IOS_LINK}

Android (Google Play):
${ANDROID_LINK}

Web-Portal:
${WEB_LINK}`,

  fr: `Prenez le contrôle total de votre véhicule avec Cortex OBD2 Diagnostic Scanner !

Fonctionnalités professionnelles de diagnostic et de gestion du véhicule :
- Diagnostic Moteur & ECU : Lisez et effacez les codes défauts (DTC) en un clic
- Télémétrie en Direct : Pression turbo, température huile/liquide, trims carburant et 50+ capteurs
- Test d'Accélération 0-100 km/h : Mesure de performance précise assistée par GPS et capteurs
- Codage des Options Cachées : Activez les fonctionnalités de confort et modes de conduite
- Rapport de Diagnostic Détaillé : Générez instantanément un bilan de santé en PDF

Téléchargez maintenant et connectez votre véhicule :
iOS (App Store):
${IOS_LINK}

Android (Google Play):
${ANDROID_LINK}

Portail Web :
${WEB_LINK}`,

  es: `¡Toma el control total de tu vehículo con Cortex OBD2 Diagnostic Scanner!

Funciones profesionales de diagnóstico y gestión del vehículo:
- Diagnóstico de Motor y ECU: Lee y borra códigos de avería (DTC) con un solo toque
- Telemetría en Vivo: Presión de turbo, temperatura de aceite/refrigerante, ajustes de combustible y 50+ sensores
- Prueba de Aceleración 0-100 km/h: Medición de rendimiento en tiempo real con GPS y sensores
- Codificación de Funciones Ocultas: Activa modos de confort y conducción según marca y modelo
- Informe de Diagnóstico Detallado: Genera al instante informes de estado del vehículo en PDF

Descarga ahora y conéctate a tu vehículo:
iOS (App Store):
${IOS_LINK}

Android (Google Play):
${ANDROID_LINK}

Panel Web:
${WEB_LINK}`,

  it: `Prendi il pieno controllo del tuo veicolo con Cortex OBD2 Diagnostic Scanner!

Funzionalità professionali di diagnosi e gestione del veicolo:
- Diagnosi ECU e Motore: Leggi e cancella i codici di errore (DTC) con un tocco
- Telemetria in Tempo Reale: Pressione turbo, temperatura olio/refrigerante, parametri carburante e 50+ sensori
- Test di Accelerazione 0-100 km/h: Misurazione delle prestazioni assistita da GPS e sensori
- Codifica Funzioni Nascoste: Sblocca impostazioni di comfort e modalità di guida
- Report Diagnostico Dettagliato: Genera istantaneamente report completi sullo stato del veicolo in PDF

Scarica ora e connettiti al tuo veicolo:
iOS (App Store):
${IOS_LINK}

Android (Google Play):
${ANDROID_LINK}

Pannello Web:
${WEB_LINK}`,

  pt: `Assuma o controlo total do seu veículo com o Cortex OBD2 Diagnostic Scanner!

Recursos profissionais de diagnóstico e gestão automóvel:
- Diagnóstico de Motor e ECU: Leia e limpe códigos de avaria (DTC) com um toque
- Telemetria em Tempo Real: Pressão do turbo, temperatura do óleo/líquido de refrigeração e 50+ sensores
- Teste de Aceleração 0-100 km/h: Medição de desempenho com precisão GPS e sensores
- Codificação de Funções Ocultas: Ative recursos de conforto e modos de condução
- Relatório de Diagnóstico Detalhado: Gere relatórios instantâneos do estado do veículo em PDF

Descarregue agora e conecte-se ao seu veículo:
iOS (App Store):
${IOS_LINK}

Android (Google Play):
${ANDROID_LINK}

Painel Web:
${WEB_LINK}`,

  nl: `Neem de volledige controle over uw voertuig met Cortex OBD2 Diagnostic Scanner!

Professionele diagnose- en voertuigbeheerfuncties:
- ECU- en Motordiagnose: Foutcodes (DTC) uitlezen en met één klik wissen
- Live Telemetrie: Turbodruk, olie-/koelvloeistoftemperatuur, brandstoftrims en 50+ sensors
- 0-100 km/u Acceleratietest: Prestatiemeting met GPS- en sensorondersteuning
- Verborgen Functies Coderen: Activeer comfortopties en rijmodi voor uw merk en model
- Uitgebreid Diagnoserapport: Genereer direct een voertuigstatusrapport in PDF-formaat

Download nu en maak verbinding met uw voertuig:
iOS (App Store):
${IOS_LINK}

Android (Google Play):
${ANDROID_LINK}

Webportaal:
${WEB_LINK}`,

  ru: `Возьмите автомобиль под полный контроль с Cortex OBD2 Diagnostic Scanner!

Профессиональная диагностика и управление функциями автомобиля:
- Диагностика ЭБУ и двигателя: считывание и сброс кодов ошибок (DTC) в один клик
- Телеметрия в реальном времени: давление турбины, температура масла/ОЖ, топливные коррекции и 50+ датчиков
- Замер разгона 0-100 км/ч: точное измерение динамики с поддержкой GPS и датчиков
- Кодирование скрытых функций: активация комфортных опций и режимов вождения
- Подробный диагностический отчет: мгновенное создание отчетов о состоянии автомобиля в PDF

Скачайте сейчас и подключитесь к автомобилю:
iOS (App Store):
${IOS_LINK}

Android (Google Play):
${ANDROID_LINK}

Веб-панель:
${WEB_LINK}`,

  zh: `使用 Cortex OBD2 Diagnostic Scanner 全面掌控您的爱车！

专业的诊断与车辆管理功能：
- ECU与发动机诊断：一键读取并清除故障码 (DTC)
- 实时遥测数据：涡轮增压、机油/防冻液温度、燃油修正及50+传感器数据
- 0-100 km/h 加速测试：结合GPS与车载传感器的精准性能计时
- 隐藏功能刷写：解锁针对特定车型的舒适配置与驾驶模式
- 详细诊断报告：即时生成PDF格式的车辆健康报告

立即下载并连接您的车辆：
iOS (App Store):
${IOS_LINK}

Android (Google Play):
${ANDROID_LINK}

网页端仪表盘:
${WEB_LINK}`,

  ja: `Cortex OBD2 Diagnostic Scanner で愛車の状態を完全コントロール！

プロ仕様の車両診断および管理機能：
- ECU・エンジン診断：トラブルコード (DTC) の読み取りとワンタップ消去
- リアルタイムテレメトリー：過給圧、オイル/冷却水温、燃料補正、50以上のセンサー値
- 0-100 km/h 加速テスト：GPSと車両センサーによる高精度な性能計測
- 隠し機能コーディング：車種に応じた快適機能や走行モードのアンロック
- 詳細な診断レポート：PDF形式で車両コンディションレポートを即座に作成

今すぐダウンロードして車両に接続：
iOS (App Store):
${IOS_LINK}

Android (Google Play):
${ANDROID_LINK}

Webパネル:
${WEB_LINK}`,

  ko: `Cortex OBD2 Diagnostic Scanner로 차량 상태를 완벽하게 제어하세요!

전문적인 차량 진단 및 관리 기능:
- ECU 및 엔진 고장 진단: 고장 코드(DTC) 실시간 조회 및 원클릭 소거
- 실시간 텔레메트리: 터보 부스트, 오일/냉각수 온도, 연료 트림 및 50여 개 센서 데이터
- 0-100 km/h 가속 성능 테스트: GPS 및 차량 센서 기반 정밀 가속도 측정
- 숨겨진 기능 코딩: 차종별 편의 기능 및 주행 모드 활성화
- 상세 진단 보고서: PDF 형식의 차량 상태 종합 리포트 즉시 생성

지금 다운로드하고 차량에 연결하세요:
iOS (App Store):
${IOS_LINK}

Android (Google Play):
${ANDROID_LINK}

웹 패널:
${WEB_LINK}`,

  ar: `تحكم بالكامل في سيارتك مع Cortex OBD2 Diagnostic Scanner!

ميزات التشخيص وإدارة المركبات الاحترافية:
- فحص المحرك ووحدة التحكم (ECU): قراءة ومسح رموز الأعطال (DTC) بنقرة واحدة
- بيانات حية ومباشرة: ضغط التيربو، حرارة الزيت/سائل التبريد، وبيانات أكثر من 50 مستشعراً
- اختبار التسارع 0-100 كم/ساعة: قياس أداء دقيق مدعوم بنظام GPS والمستشعرات
- تفعيل الميزات المخفية: تفعيل أوضاع القيادة وميزات الراحة الخاصة بسيارتك
- تقرير فحص تفصيلي: إنشاء تقارير فورية لحالة السيارة بصيغة PDF

حمّل التطبيق الآن واتصل بسيارتك:
iOS (App Store):
${IOS_LINK}

Android (Google Play):
${ANDROID_LINK}

لوحة التحكم عبر الويب:
${WEB_LINK}`,

  id: `Kendalikan penuh kendaraan Anda dengan Cortex OBD2 Diagnostic Scanner!

Fitur diagnostik dan manajemen kendaraan profesional:
- Diagnostik ECU & Mesin: Baca dan hapus kode kesalahan (DTC) dengan satu ketukan
- Telemetri Langsung: Tekanan turbo, suhu oli/radiator, trim bahan bakar, dan 50+ sensor
- Uji Akselerasi 0-100 km/jam: Pengukuran performa presisi dengan dukungan GPS & sensor
- Coding Fitur Tersembunyi: Aktifkan fitur kenyamanan dan mode berkendara sesuai model
- Laporan Diagnostik Lengkap: Buat laporan kondisi kendaraan instan dalam format PDF

Unduh sekarang dan sambungkan ke kendaraan Anda:
iOS (App Store):
${IOS_LINK}

Android (Google Play):
${ANDROID_LINK}

Panel Web:
${WEB_LINK}`,

  pl: `Przejmij pełną kontrolę nad swoim pojazdem dzięki Cortex OBD2 Diagnostic Scanner!

Profesjonalna diagnostyka i zaawansowane zarządzanie pojazdem:
- Diagnostyka ECU i silnika: Odczytuj i kasuj kody błędów (DTC) jednym kliknięciem
- Telemetria na żywo: Ciśnienie doładowania, temperatura oleju/płynu, korekty paliwa i 50+ czujników
- Test przyspieszenia 0-100 km/h: Precyzyjny pomiar osiągów z GPS i czujnikami
- Kodowanie ukrytych funkcji: Aktywuj opcje komfortu i tryby jazdy dla swojej marki i modelu
- Szczegółowy raport diagnostyczny: Generuj natychmiastowe raporty stanu pojazdu w formacie PDF

Pobierz teraz i połącz się ze swoim samochodem:
iOS (App Store):
${IOS_LINK}

Android (Google Play):
${ANDROID_LINK}

Panel Web:
${WEB_LINK}`,

  uk: `Отримайте повний контроль над автомобілем з Cortex OBD2 Diagnostic Scanner!

Професійна діагностика та керування функціями автомобіля:
- Діагностика ЕБУ та двигуна: зчитування та скидання кодів помилок (DTC) в один клік
- Телеметрія в реальному часі: тиск турбіни, температура оливи/ОР, паливні корекції та 50+ датчиків
- Замір розгону 0-100 км/год: точне вимірювання динаміки за допомогою GPS та датчиків
- Кодування прихованих функцій: активація комфортних опцій та режимів керування
- Детальний діагностичний звіт: миттєве створення звітів про стан автомобіля у PDF

Завантажуйте зараз та підключайтеся до авто:
iOS (App Store):
${IOS_LINK}

Android (Google Play):
${ANDROID_LINK}

Веб-панель:
${WEB_LINK}`,

  cs: `Mějte své vozidlo plně pod kontrolou s Cortex OBD2 Diagnostic Scanner!

Profesionální diagnostika a správa funkcí vozidla:
- Diagnostika ECU a motoru: Čtení a mazání chybových kódů (DTC) jedním kliknutím
- Živá telemetrie: Tlak turba, teplota oleje/chladicí kapaliny, korekce paliva a 50+ senzorů
- Test zrychlení 0-100 km/h: Přesné měření výkonu s podporou GPS a senzorů
- Kódování skrytých funkcí: Aktivace komfortních prvků a jízdních režimů dle modelu
- Podrobný diagnostický protokol: Okamžité generování zpráv o stavu vozidla v PDF

Stáhněte si nyní a připojte se k vozidlu:
iOS (App Store):
${IOS_LINK}

Android (Google Play):
${ANDROID_LINK}

Webový portál:
${WEB_LINK}`,

  da: `Få fuld kontrol over dit køretøj med Cortex OBD2 Diagnostic Scanner!

Professionelle diagnose- og køretøjsstyringsfunktioner:
- ECU- og motordiagnose: Læs og slet fejlkoder (DTC) med et enkelt tryk
- Live telemetri: Turbotryk, olie-/kølevæsketemperatur, brændstoftrim og 50+ sensordata
- 0-100 km/t accelerationstest: Præcis ydelsesmåling med GPS og sensorstøtte
- Kodning af skjulte funktioner: Aktiver komfort- og køretilstande til din bilmodel
- Detaljeret diagnoserapport: Opret øjeblikkelige køretøjsrapporter i PDF-format

Download nu og opret forbindelse til din bil:
iOS (App Store):
${IOS_LINK}

Android (Google Play):
${ANDROID_LINK}

Webportal:
${WEB_LINK}`,

  fi: `Ota ajoneuvosi täyteen hallintaan Cortex OBD2 Diagnostic Scannerilla!

Ammattimaiset diagnostiikka- ja ajoneuvonhallintaominaisuudet:
- ECU- ja moottoridiagnostiikka: Lue ja poista vikakoodit (DTC) yhdellä painalluksella
- Reaaliaikainen telemetria: Ahtopaine, öljyn/jäähdytysnesteen lämpötila ja 50+ anturitietoa
- 0-100 km/h kiihtyvyystesti: Tarkka suorituskykymittaus GPS- ja anturituen avulla
- Piilotettujen ominaisuuksien koodaus: Avaa mukavuus- ja ajotilat automallillesi
- Yksityiskohtainen diagnoosiraportti: Luo välittömät ajoneuvon kuntoraportit PDF-muodossa

Lataa nyt ja yhdistä ajoneuvoosi:
iOS (App Store):
${IOS_LINK}

Android (Google Play):
${ANDROID_LINK}

Web-portaali:
${WEB_LINK}`,

  hu: `Vegye át a teljes irányítást járműve felett a Cortex OBD2 Diagnostic Scanner segítségével!

Professzionális diagnosztikai és járműkezelési funkciók:
- ECU és motor diagnosztika: Hibakódok (DTC) kiolvasása és törlése egyetlen érintéssel
- Élő telemetria: Turbónyomás, olaj/hűtőfolyadék hőmérséklet, üzemanyag-korrekciók és 50+ szenzor
- 0-100 km/h gyorsulási teszt: Pontos teljesítménymérés GPS és szenzoros támogatással
- Rejtett funkciók kódolása: Kényelmi funkciók és vezetési módok aktiválása típus szerint
- Részletes diagnosztikai jelentés: Azonnali járműállapot-jelentések készítése PDF formátumban

Töltse le most és csatlakozzon járművéhez:
iOS (App Store):
${IOS_LINK}

Android (Google Play):
${ANDROID_LINK}

Webes felület:
${WEB_LINK}`,

  no: `Få full kontroll over kjøretøyet ditt med Cortex OBD2 Diagnostic Scanner!

Profesjonelle diagnose- og kjøretøystyringsfunksjoner:
- ECU- og motordiagnose: Les av og slett feilkoder (DTC) med ett trykk
- Live telemetri: Turbotrykk, olje-/kjølevæsketemperatur, drivstofftrim og 50+ sensordata
- 0-100 km/t akselerasjonstest: Nøyaktig ytelsesmåling med GPS og sensorstøtte
- Koding av skjulte funksjoner: Lås opp komfortfunksjoner og kjøremoduser tilpasset din modell
- Detaljert diagnoserapport: Generer umiddelbare tilstandsrapporter i PDF-format

Last ned nå og koble til kjøretøyet:
iOS (App Store):
${IOS_LINK}

Android (Google Play):
${ANDROID_LINK}

Nettportal:
${WEB_LINK}`,

  ro: `Preluați controlul complet al vehiculului cu Cortex OBD2 Diagnostic Scanner!

Funcții profesionale de diagnosticare și gestionare a vehiculului:
- Diagnosticare ECU și motor: Citiți și ștergeți codurile de eroare (DTC) cu o singură atingere
- Telemetrie în timp real: Presiune turbo, temperatură ulei/lichid de răcire și 50+ parametri
- Test de accelerare 0-100 km/h: Măsurare precisă a performanței asistată de GPS și senzori
- Codare funcții ascunse: Deblocați opțiuni de confort și moduri de condus pentru modelul dvs.
- Raport detaliat de diagnosticare: Generați instant rapoarte privind starea vehiculului în format PDF

Descărcați acum și conectați-vă la vehicul:
iOS (App Store):
${IOS_LINK}

Android (Google Play):
${ANDROID_LINK}

Panou Web:
${WEB_LINK}`,

  sv: `Ta full kontroll över ditt fordon med Cortex OBD2 Diagnostic Scanner!

Professionella diagnos- och fordonshanteringsfunktioner:
- ECU- och motordiagnostik: Läs och radera felkoder (DTC) med ett enkelt klick
- Livetelemetri: Laddtryck, olje-/kylarvätsketemperatur, bränsletrim och 50+ sensorvärden
- 0-100 km/h accelerationstest: Exakt prestandamätning med GPS- och sensorstöd
- Kodning av dolda funktioner: Lås upp komfort- och körlägen anpassade för din modell
- Detaljerad diagnosrapport: Skapa omedelbara fordonshälsorapporter i PDF-format

Ladda ner nu och anslut till ditt fordon:
iOS (App Store):
${IOS_LINK}

Android (Google Play):
${ANDROID_LINK}

Webbpanel:
${WEB_LINK}`,

  th: `ควบคุมยานพาหนะของคุณอย่างสมบูรณ์แบบด้วย Cortex OBD2 Diagnostic Scanner!

ฟังก์ชันการวินิจฉัยและจัดการยานพาหนะระดับมืออาชีพ:
- วินิจฉัย ECU และเครื่องยนต์: อ่านและลบรหัสข้อผิดพลาด (DTC) ได้ในคลิกเดียว
- ข้อมูลเซ็นเซอร์สด: บูสต์เทอร์โบ, อุณหภูมิน้ำมันเครื่อง/น้ำหล่อเย็น และเซ็นเซอร์กว่า 50+ รายการ
- ทดสอบอัตราเร่ง 0-100 กม./ชม.: วัดสมรรถนะอย่างแม่นยำด้วย GPS และเซ็นเซอร์
- เข้ารหัสฟังก์ชันที่ซ่อนอยู่: ปลดล็อกฟังก์ชันความสะดวกสบายและโหมดการขับขี่ตามรุ่นรถ
- รายงานการวินิจฉัยโดยละเอียด: สร้างรายงานตรวจเช็กสภาพรถยนต์เป็นไฟล์ PDF ได้ทันที

ดาวน์โหลดและเชื่อมต่อกับรถของคุณได้เลย:
iOS (App Store):
${IOS_LINK}

Android (Google Play):
${ANDROID_LINK}

แผงควบคุมบนเว็บ:
${WEB_LINK}`,

  el: `Αποκτήστε τον πλήρη έλεγχο του οχήματός σας με το Cortex OBD2 Diagnostic Scanner!

Επαγγελματικές λειτουργίες διάγνωσης και διαχείρισης οχήματος:
- Διάγνωση ECU & Κινητήρα: Διαβάστε και διαγράψτε κωδικούς βλάβης (DTC) με ένα άγγιγμα
- Ζωντανή Τηλεμετρία: Πίεση turbo, θερμοκρασία λαδιού/ψυκτικού, καύσιμο και 50+ αισθητήρες
- Δοκιμή Επιτάχυνσης 0-100 km/h: Ακριβής μέτρηση επιδόσεων με υποστήριξη GPS και αισθητήρων
- Κωδικοποίηση Κρυφών Λειτουργιών: Ενεργοποιήστε λειτουργίες άνεσης και οδήγησης για το μοντέλο σας
- Αναλυτική Αναφορά Διάγνωσης: Δημιουργήστε άμεσα αναφορές κατάστασης οχήματος σε μορφή PDF

Κατεβάστε τώρα και συνδεθείτε στο όχημά σας:
iOS (App Store):
${IOS_LINK}

Android (Google Play):
${ANDROID_LINK}

Διαδικτυακός Πίνακας:
${WEB_LINK}`,

  hi: `Cortex OBD2 Diagnostic Scanner के साथ अपने वाहन पर पूरा नियंत्रण पाएं!

पेशेवर वाहन निदान और प्रबंधन सुविधाएं:
- ईसीयू और इंजन डायग्नोस्टिक्स: एक टैप में फॉल्ट कोड (DTC) पढ़ें और रीसेट करें
- लाइव टेलीमेट्री: टर्बो बूस्ट, ऑयल/कूलेंट तापमान, फ्यूल ट्रिम्स और 50+ सेंसर डेटा
- 0-100 किमी/घंटा एक्सेलेरेशन टेस्ट: जीपीएस और सेंसर की मदद से सटीक परफॉर्मेंस टाइमिंग
- छिपे हुए फीचर्स की कोडिंग: अपनी कार के मॉडल अनुसार कम्फर्ट और ड्राइविंग मोड्स अनलॉक करें
- विस्तृत डायग्नोस्टिक रिपोर्ट: पीडीएफ प्रारूप में तत्काल वाहन स्थिति रिपोर्ट तैयार करें

अभी डाउनलोड करें और अपने वाहन से कनेक्ट करें:
iOS (App Store):
${IOS_LINK}

Android (Google Play):
${ANDROID_LINK}

वेब पोर्टल:
${WEB_LINK}`
};

let updatedCount = 0;

Object.entries(MESSAGES).forEach(([lang, text]) => {
  const filePath = path.join(localesDir, `${lang}.json`);
  if (!fs.existsSync(filePath)) {
    console.warn(`Locale file not found: ${filePath}`);
    return;
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  const json = JSON.parse(raw);

  if (!json.info) json.info = {};
  json.info.shareMessageText = text;

  fs.writeFileSync(filePath, JSON.stringify(json, null, 4), 'utf8');
  updatedCount++;
  console.log(`[OK] Updated ${lang}.json`);
});

console.log(`\nSuccessfully updated ${updatedCount} locale files!`);
