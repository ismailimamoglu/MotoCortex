import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TouchableWithoutFeedback,
  Modal,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useResponsive } from '../hooks/useResponsive';
import { useThemeColors } from '../theme';
import { usePurchaseStore } from '../store/usePurchaseStore';
import { useAppStore } from '../store/useAppStore';

export interface AboutViewProps {
  infoBtStatus: 'granted' | 'denied' | 'checking';
  infoLocStatus: 'granted' | 'denied' | 'checking';
  onReconfigurePermissions: () => void;
  onAccordionToggle?: (section: string | null) => void;
}

const DESCRIPTION_TRANSLATIONS: Record<string, string> = {
  en: 'Next-generation OBD2 Scanner with a high-frequency data stream (Batch Query) engine for cars and motorcycles',
  tr: 'Otomobil ve motosikletler için yüksek frekanslı veri akış (Batch Query) motoruna sahip yeni nesil OBD2 Scanner',
  de: 'OBD2-Scanner der nächsten Generation mit einer Hochfrequenz-Datenstrom-Engine (Batch-Abfrage) für Autos und Motorräder',
  es: 'Escáner OBD2 de última generación con motor de flujo de datos de alta frecuencia (Batch Query) para automóviles y motocicletas',
  fr: 'Scanner OBD2 de nouvelle génération avec un moteur de flux de données haute fréquence (Batch Query) pour voitures et motos',
  it: 'Scanner OBD2 di nuova generazione con motore di flusso dati ad alta frequenza (Batch Query) per auto e moto',
  pt: 'Scanner OBD2 de última geração com motor de fluxo de dados de alta frequência (Batch Query) para carros e motocicletas',
  nl: 'Volgende generatie OBD2-scanner met een hoogfrequente datastream (Batch Query) engine voor auto\'s en motorfietsen',
  ru: 'Сканер OBD2 нового поколения с высокочастотным движком потока данных (Batch Query) для автомобилей и мотоциклов',
  zh: '适用于汽车和摩托车的下一代 OBD2 扫描仪，配备高频数据流 (Batch Query) 引擎',
  ja: '乗用車および二輪車向けの高頻度データストリーム（Batch Query）エンジンを搭載した次世代OBD2スキャナー',
  ko: '자동차 및 오토바이용 고주파 데이터 스트림(Batch Query) 엔진을 탑재한 차세대 OBD2 스캐너',
  ar: 'جهاز فحص OBD2 من الجيل الجديد مع محرك تدفق بيانات عالي التردد (Batch Query) للسيارات والدراجات النارية',
  id: 'Pemindai OBD2 generasi baru dengan mesin aliran data frekuensi tinggi (Batch Query) untuk mobil dan sepeda motor',
  pl: 'Skaner OBD2 nowej generacji z silnikiem strumieniowym danych o wysokiej częstotliwości (Batch Query) do samochodów i motocykli',
  uk: 'Сканер OBD2 нового покоління з високочаστοтним двигуном потоку даних (Batch Query) для автомобілів і мотоциклів',
  ro: 'Scanner OBD2 de nouă generație cu motor de flux de date de înaltă frecvență (Batch Query) pentru mașini și motociclete',
  hu: 'Új generációs OBD2 szkenner nagyfrekvenciás adatfolyam (Batch Query) motorral autókhoz és motorkerékpárokhoz',
  no: 'Neste generasjons OBD2-skanner med en høyfrekvent datastrøm (Batch Query)-motor for biler og motorsykler',
  da: 'Næste generations OBD2-scanner med en høyfrekvent datastrøm (Batch Query) motor til biler og motorcykler',
  fi: 'Uuden sukupolven OBD2-skanneri korkeataajuisella tietovirtmoottorilla (Batch Query) autoille ja moottoripyörille',
  sv: 'Nästa generations OBD2-skanner med en högfrekvent dataströmmotor (Batch Query) för bilar och motorcyklar',
  cs: 'OBD2 skener nové generace s vysokofrekvenčním modulem pro přenos dat (Batch Query) pro automobily a motocykly',
  el: 'Επόμενης γενιάς OBD2 Scanner με κινητήρα ροής δεδομένων υψηλής συχνότητας (Batch Query) για αυτοκίνητα και μοτοσυκλέτες',
  th: 'เครื่องสแกน OBD2 เจเนอเรชันใหม่พร้อมเครื่องยนต์สตรีมข้อมูลความถี่สูง (Batch Query) สำหรับรถยนต์และรถจักรยานยนต์',
  hi: 'कारों और मोटरसाइकिलों के लिए उच्च आवृत्ति डेटा स्ट्रीम (Batch Query) इंजन के साथ नई पीढ़ी का OBD2 स्कैनर',
};

interface PerformanceTexts {
  title: string;
  general: string;
  klineHeader: string;
  klineDesc: string;
  canbusHeader: string;
  canbusDesc: string;
}

const PERFORMANCE_TRANSLATIONS: Record<string, PerformanceTexts> = {
  en: {
    title: 'OBD Data Stream & Performance Guide',
    general: 'Selecting fewer active sensors increases polling speed (refresh frequency) and connection stability.',
    klineHeader: 'K-Line (Legacy Protocol)',
    klineDesc: 'Recommended: Max 4 active sensors. Refresh rate is ~2-3 Hz. Selecting too many sensors causes lag or buffer overflow disconnections.',
    canbusHeader: 'CAN-Bus (Modern Protocol)',
    canbusDesc: 'Recommended: Max 8 active sensors. Refresh rate is ~10-25 Hz. Uses J1979 Batch Queries for high-speed multi-PID polling.'
  },
  tr: {
    title: 'OBD Veri Akış & Performans Rehberi',
    general: 'Daha az aktif sensör seçmek, veri sorgulama hızını (yenileme frekansını) ve bağlantı kararlılığını artırır.',
    klineHeader: 'K-Line (Eski Nesil Protokol)',
    klineDesc: 'Önerilen: En fazla 4 aktif sensör. Yenileme hızı ~2-3 Hz civarındadır. Fazla sensör seçilmesi gecikmeye veya bağlantı kopmalarına sebep olur.',
    canbusHeader: 'CAN-Bus (Yeni Nesil Protokol)',
    canbusDesc: 'Önerilen: En fazla 8 aktif sensör. Yenileme hızı ~10-25 Hz civarındadır. Batch Query (Toplu Sorgu) motoru sayesinde yüksek hızda stabil çalışır.'
  },
  de: {
    title: 'OBD-Datenstrom- & Leistungsleitfaden',
    general: 'Die Auswahl weniger aktiver Sensoren erhöht die Abfragegeschwindigkeit (Aktualisierungsfrequenz) und die Verbindungsstabilität.',
    klineHeader: 'K-Line (Altes Protokoll)',
    klineDesc: 'Empfohlen: Max. 4 aktive Sensoren. Aktualisierungsrate ca. 2-3 Hz. Zu viele Sensoren verursachen Verzögerungen oder Verbindungsabbrüche.',
    canbusHeader: 'CAN-Bus (Modernes Protokoll)',
    canbusDesc: 'Empfohlen: Max. 8 aktive Sensoren. Aktualisierungsrate ca. 10-25 Hz. Nutzt J1979 Batch Queries für schnelle Multi-PID-Abfragen.'
  },
  es: {
    title: 'Guía de flujo de datos y rendimiento de OBD',
    general: 'Seleccionar menos sensores activos aumenta la velocidad de consulta (frecuencia de actualización) y la estabilidad de la conexión.',
    klineHeader: 'K-Line (Protocolo antiguo)',
    klineDesc: 'Recomendado: Máx. 4 sensores activos. Frecuencia de actualización ~2-3 Hz. Demasiados sensores causan retrasos o desconexiones por desbordamiento de búfer.',
    canbusHeader: 'CAN-Bus (Protocolo moderno)',
    canbusDesc: 'Recomendado: Máx. 8 sensores activos. Frecuencia de actualización ~10-25 Hz. Utiliza consultas por lotes J1979 para un muestreo rápido de múltiples PID.'
  },
  fr: {
    title: 'Guide du flux de données & performances OBD',
    general: 'Sélectionner moins de capteurs actifs augmente la vitesse de rafraîchissement (fréquence) et la stabilité de la connexion.',
    klineHeader: 'K-Line (Ancien protocole)',
    klineDesc: 'Recommandé : Max 4 capteurs actifs. Fréquence ~2-3 Hz. Trop de capteurs provoquent des ralentissements ou des déconnexions par débordement de mémoire.',
    canbusHeader: 'CAN-Bus (Protocole moderne)',
    canbusDesc: 'Recommandé : Max 8 capteurs actifs. Fréquence ~10-25 Hz. Utilise des requêtes par lots J1979 pour une lecture multi-PID rapide.'
  },
  it: {
    title: 'Guida al flusso di dati & prestazioni OBD',
    general: 'Selezionare meno sensori attivi aumenta la velocità di polling (frecuenza di aggiornamento) e la stabilità della connessione.',
    klineHeader: 'K-Line (Protocollo legacy)',
    klineDesc: 'Consigliato: Max 4 sensori attivi. Frequenza di aggiornamento ~2-3 Hz. Troppi sensori causano ritardi o disconnessioni per buffer overflow.',
    canbusHeader: 'CAN-Bus (Protocollo moderno)',
    canbusDesc: 'Consigliato: Max 8 sensori attivi. Frecuenza ~10-25 Hz. Utilizza J1979 Batch Queries per polling multi-PID ad alta velocità.'
  },
  pt: {
    title: 'Guia de fluxo de dados e desempenho OBD',
    general: 'Selecionar menos sensores ativos aumenta a velocidade de varredura (frequência de atualização) e a estabilidade da conexão.',
    klineHeader: 'K-Line (Protocolo antigo)',
    klineDesc: 'Recomendado: Máx. 4 sensores ativos. Taxa de atualização ~2-3 Hz. Sensores em excesso causam atrasos ou desconexões por estouro de buffer.',
    canbusHeader: 'CAN-Bus (Protocolo moderno)',
    canbusDesc: 'Recomendado: Máx. 8 sensores ativos. Taxa de atualização ~10-25 Hz. Usa consultas em lote J1979 para polling multi-PID de alta velocidade.'
  },
  nl: {
    title: 'OBD-datastream & prestatiegids',
    general: 'Het selecteren van minder actieve sensoren verhoogt de opvraagsnelheid (verversingsfrequentie) en verbindingsstabiliteit.',
    klineHeader: 'K-Line (Verouderd protocol)',
    klineDesc: 'Aanbevolen: Max 4 actieve sensoren. Verversingssnelheid ~2-3 Hz. Te veel sensoren veroorzaken vertraging of buffer-overflow verbindingstakelingen.',
    canbusHeader: 'CAN-Bus (Modern protocol)',
    canbusDesc: 'Aanbevolen: Max 8 actieve sensoren. Verversingssnelheid ~10-25 Hz. Gebruikt J1979 Batch-query\'s voor snelle multi-PID polling.'
  },
  ru: {
    title: 'Руководство по потоку данных и производительности OBD',
    general: 'Выбор меньшего количества активных датчиков увеличивает скорость опроса (частоту обновления) и стабильность соединения.',
    klineHeader: 'K-Line (Устаревший протокол)',
    klineDesc: 'Рекомендуется: не более 4 активных датчиков. Частота обновления ~2-3 Гц. Слишком много датчиков вызывают задержки или отключения из-за переполнения буфера.',
    canbusHeader: 'CAN-Bus (Современный протокол)',
    canbusDesc: 'Рекомендуется: не более 8 активных датчиков. Частота обновления ~10-25 Гц. Использует пакетные запросы J1979 для быстрого опроса.'
  },
  id: {
    title: 'Panduan Aliran Data & Performa OBD',
    general: 'Memilih lebih sedikit sensor aktif meningkatkan kecepatan polling (frekuensi penyegaran) dan stabilitas koneksi.',
    klineHeader: 'K-Line (Protokol Lama)',
    klineDesc: 'Direkomendasikan: Maks 4 sensor aktif. Tingkat penyegaran ~2-3 Hz. Memilih terlalu banyak sensor menyebabkan jeda atau pemutusan akibat buffer overflow.',
    canbusHeader: 'CAN-Bus (Protokol Modern)',
    canbusDesc: 'Direkomendasikan: Maks 8 sensor aktif. Tingkat penyegaran ~10-25 Hz. Menggunakan Kueri Batch J1979 untuk polling multi-PID berkecepatan tinggi.'
  },
  pl: {
    title: 'Przewodnik po strumieniu danych i wydajności OBD',
    general: 'Wybór mniejszej liczby aktywnych czujników zwiększa szybkość odpytywania (częstotliwość odświeżania) i stabilność połączenia.',
    klineHeader: 'K-Line (Starszy protokół)',
    klineDesc: 'Zalecane: Maks. 4 aktywne czujniki. Odświeżanie ok. 2-3 Hz. Zbyt wiele czujników powoduje opóźnienia lub rozłączenia z powodu przepełnienia bufora.',
    canbusHeader: 'CAN-Bus (Moderny protokół)',
    canbusDesc: 'Zalecane: Maks. 8 aktywnych czujników. Odświeżanie ok. 10-25 Hz. Używa zapytań wsadowych J1979 do szybkiego odpytywania multi-PID.'
  },
  ar: {
    title: 'دليل أداء وتدفق بيانات OBD',
    general: 'تحديد عدد أقل من المستشعرات النشطة يزيد من سرعة الاستقصاء (تردد التحديث) واستقرار الاتصال.',
    klineHeader: 'K-Line (بروتوكول قديم)',
    klineDesc: 'موصى به: 4 مستشعرات نشطة كحد أقصى. معدل التحديث ~2-3 هرتز. اختيار الكثير من المستشعرات يسبب بطئًا أو انقطاعًا بسبب تجاوز سعة التخزين المؤقت.',
    canbusHeader: 'CAN-Bus (بروتوكول حديث)',
    canbusDesc: 'موصى به: 8 مستشعرات نشطة كحد أقصى. معدل التحديث ~10-25 هرتز. يستخدم استعلامات الدفعات J1979 للاستقصاء السريع.'
  },
  zh: {
    title: 'OBD 数据流与性能指南',
    general: '选择较少的活动传感器可提高轮询速度（刷新频率）和连接稳定性。',
    klineHeader: 'K-Line (传统/旧版协议)',
    klineDesc: '推荐：最多 4 个 active 传感器。刷新率约为 2-3 Hz。选择过多传感器会导致延迟或因缓冲区溢出断开连接。',
    canbusHeader: 'CAN-Bus (现代协议)',
    canbusDesc: '推荐：最多 8 个 active 传感器。刷新率约为 10-25 Hz。利用 J1979 批量查询进行高速多 PID 轮询。'
  },
  ja: {
    title: 'OBDデータストリーム＆パフォーマンスガイド',
    general: 'アクティブなセンサーの選択数を減らすことで、ポーリング速度（更新頻度）と接続の安定性が向上します。',
    klineHeader: 'K-Line (旧世代プロトコル)',
    klineDesc: '推奨：最大4つのアクティブセンサー。更新レートは約2-3 Hz。多すぎるセンサーを選択すると、遅延やバッファオーバーフローによる切断の原因になります。',
    canbusHeader: 'CAN-Bus (新世代プロトコル)',
    canbusDesc: '推奨：最大8つのアクティブセンサー。更新レートは約10-25 Hz。高速マルチPIDポーリングのためにJ1979バッチクエリを使用します。'
  },
  ko: {
    title: 'OBD 데이터 스트림 및 성능 가이드',
    general: '활성화된 센서 수를 적게 선택할수록 폴링 속도(새로고침 주기)와 연결 안정성이 향상됩니다.',
    klineHeader: 'K-Line (레거시 프로토콜)',
    klineDesc: '권장: 최대 4개 활성 센서. 새로고침 속도는 약 2-3 Hz입니다. 센서가 너무 많으면 지연이나 버퍼 오버플로우로 인한 연결 끊김이 발생할 수 있습니다.',
    canbusHeader: 'CAN-Bus (최신 프로토콜)',
    canbusDesc: '권장: 최대 8개 활성 센서. 새로고침 속도는 약 10-25 Hz입니다. 고속 멀티 PID 폴링을 위해 J1979 배치 쿼리를 사용합니다.'
  },
  uk: {
    title: 'Потік даних OBD та посібник з продуктивності',
    general: 'Вибір меншої кількості активних датчиків збільшує швидкість опитування (частоту оновлення) та стабільність з\'єднання.',
    klineHeader: 'K-Line (Застарілий протокол)',
    klineDesc: 'Рекомендовано: максимум 4 активних датчики. Частота оновлення ~2-3 Гц. Занадто багато датчиків спричиняють затримку або обрив зв\'язку через переповнення буфера.',
    canbusHeader: 'CAN-Bus (Сучасний протокол)',
    canbusDesc: 'Рекомендовано: максимум 8 активних датчиків. Частота оновлення ~10-25 Гц. Використовує пакетні запити J1979 для швидкого опитування.'
  },
  ro: {
    title: 'Ghid privind fluxul de date OBD și performanța',
    general: 'Selectarea mai multor senzori activi reduce viteza de interogare (frecvența de actualizare); selectarea mai multor puțini senzori o mărește.',
    klineHeader: 'K-Line (Protocol vechi)',
    klineDesc: 'Recomandat: Max 4 senzori activi. Rata de reîmprospătare ~2-3 Hz. Selectarea a prea mulți senzori cauzează lag sau deconectări din cauza buffer overflow.',
    canbusHeader: 'CAN-Bus (Protocol modern)',
    canbusDesc: 'Recomandat: Max 8 senzori activi. Rata de reîmprospătare ~10-25 Hz. Utilizează interogări în lot J1979 pentru citiri multi-PID rapide.'
  },
  hu: {
    title: 'OBD adatfolyam és teljesítmény-útmutató',
    general: 'Kevesebb aktív szenzor kiválasztása növeli a lekérdezési sebességet (frissítési gyakoriságot) és a kapcsolat stabilitását.',
    klineHeader: 'K-Line (Örökség protokoll)',
    klineDesc: 'Javasolt: Max 4 aktív szenzor. A frissítési sebesség ~2-3 Hz. Túl sok szenzor kiválasztása késést vagy puffer-túlcsordulás miatti szakadást okoz.',
    canbusHeader: 'CAN-Bus (Modern protokoll)',
    canbusDesc: 'Javasolt: Max 8 aktív szenzor. A frissítési sebesség ~10-25 Hz. J1979 Batch Query motorral rendelkezik a nagysebességű lekérdezéshez.'
  },
  no: {
    title: 'OBD-datastrøm og ytelsesguide',
    general: 'Ved å velge færre aktive sensorer øker oppdateringshastigheten (frekvensen) og tilkoblingsstabiliteten.',
    klineHeader: 'K-Line (Eldre protokoll)',
    klineDesc: 'Anbefalt: Maks 4 aktive sensorer. Oppdateringshastighet ~2-3 Hz. For mange sensorer fører til forsinkelser eller frakobling pga. buffer-overflow.',
    canbusHeader: 'CAN-Bus (Moderne protokoll)',
    canbusDesc: 'Anbefalt: Maks 8 aktive sensorer. Oppdateringshastighet ~10-25 Hz. Bruker J1979 Batch Queries for høyhastighets multi-PID-polling.'
  },
  da: {
    title: 'OBD-datastrøm og ydeevnevejledning',
    general: 'Valg af færre aktive sensorer øger pollinghastigheden (opdateringsfrekvens) og forbindelsesstabiliteten.',
    klineHeader: 'K-Line (Gammel protokol)',
    klineDesc: 'Anbefalet: Maks. 4 aktive sensorer. Opdateringshastighed er ~2-3 Hz. For mange sensorer forårsager forsinkelser eller buffer-overflow afbrydelser.',
    canbusHeader: 'CAN-Bus (Moderne protokol)',
    canbusDesc: 'Anbefalet: Maks. 8 aktive sensorer. Opdateringshastighed er ~10-25 Hz. Bruger J1979 Batch-forespørgsler til hurtig multi-PID-polling.'
  },
  fi: {
    title: 'OBD-tietovirta & suorituskykyopas',
    general: 'Harvempien aktiivisten anturien valitseminen lisää kyselynopeutta (päivitystaajuutta) ja yhteyden vakautta.',
    klineHeader: 'K-Line (Vanha protokolla)',
    klineDesc: 'Suositus: Maks. 4 aktiivista anturia. Päivitysnopeus ~2-3 Hz. Liian monen anturin valinta aiheuttaa viivettä tai puskurin ylivuotokatkoksia.',
    canbusHeader: 'CAN-Bus (Nykyaikainen protokolla)',
    canbusDesc: 'Suositus: Maks. 8 aktiivista anturia. Päivitysnopeus ~10-25 Hz. Käyttää J1979-eräkyselyjä nopeaan monen PID:n kyselyyn.'
  },
  sv: {
    title: 'OBD-dataström & prestandaguide',
    general: 'Att välja färre aktiva sensorer ökar sökfrekvensen (uppdateringshastigheten) och anslutningsstabiliteten.',
    klineHeader: 'K-Line (Äldre protokoll)',
    klineDesc: 'Rekommenderas: Max 4 aktiva sensorer. Uppdateringshastighet ~2-3 Hz. Att välja för många sensorer orsakar fördröjning eller buffer-overflow avbrott.',
    canbusHeader: 'CAN-Bus (Modern protokoll)',
    canbusDesc: 'Rekommenderas: Max 8 aktiva sensorer. Uppdateringshastighet ~10-25 Hz. Använder J1979 Batch-sökningar för höghastighets polling.'
  },
  cs: {
    title: 'Průvodce datovým tokem OBD a výkonem',
    general: 'Výběr méně aktivních senzorů zvyšuje rychlost dotazování (frekvenci obnovení) a stabilitu připojení.',
    klineHeader: 'K-Line (Starší protokol)',
    klineDesc: 'Doporučeno: Max 4 aktivní senzory. Obnovovací frekvence ~2-3 Hz. Výběr příliš mnoha senzorů způsobuje zpoždění nebo odpojení kvůli buffer overflow.',
    canbusHeader: 'CAN-Bus (Moderní protokol)',
    canbusDesc: 'Doporučeno: Max 8 aktivních senzorů. Obnovovací frekvence ~10-25 Hz. Využívá hromadné dotazy J1979 pro rychlé dotazování multi-PID.'
  },
  el: {
    title: 'Οδηγός ροής δεδομένων OBD & απόδοσης',
    general: 'Η επιλογή λιγότερων ενεργών αισθητήρων αυξάνει την ταχύτητα ερωτήσεων (συχνότητα ανανέωσης) και τη σταθερότητα σύνδεσης.',
    klineHeader: 'K-Line (Παλαιό πρωτόκολλο)',
    klineDesc: 'Συνιστάται: Έως 4 ενεργούς αισθητήρες. Ρυθμός ανανέωσης ~2-3 Hz. Η επιλογή πολλών αισθητήρων προκαλεί καθυστέρηση ή αποσυνδέσεις.',
    canbusHeader: 'CAN-Bus (Σύγχρονο πρωτόκολλο)',
    canbusDesc: 'Συνιστάται: Έως 8 ενεργούς αισθητήρες. Ρυθμός ανανέωσης ~10-25 Hz. Χρησιμοποιεί ομαδικές ερωτήσεις J1979 για γρήγορη λήψη.'
  },
  th: {
    title: 'คู่มือสตรีมข้อมูล OBD และประสิทธิภาพ',
    general: 'การเลือกเซ็นเซอร์ที่เปิดใช้งานน้อยลงจะช่วยเพิ่มความเร็วในการสืบค้น (ความถี่ในการรีเฟรช) และความเสถียรในการเชื่อมต่อ',
    klineHeader: 'K-Line (โปรโตคอลรุ่นเก่า)',
    klineDesc: 'แนะนำ: เซ็นเซอร์ที่เปิดใช้งานสูงสุด 4 ตัว อัตรารีเฟรชประมาณ 2-3 Hz การเลือกเซ็นเซอร์มากเกินไปอาจทำให้เกิดความล่าช้าหรือการเชื่อมต่อขาดหายเนื่องจากบัฟเฟอร์ล้น',
    canbusHeader: 'CAN-Bus (โปรโตคอลสมัยใหม่)',
    canbusDesc: 'แนะนำ: เซ็นเซอร์ที่เปิดใช้งานสูงสุด 8 ตัว อัตรารีเฟรชประมาณ 10-25 Hz ใช้ J1979 Batch Queries เพื่อความเร็วในการดึงข้อมูลหลายตัวแบบเรียลไทม์'
  },
  hi: {
    title: 'ओबीडी डेटा स्ट्रीम और प्रदर्शन गाइड',
    general: 'कम सक्रिय सेंसर चुनने से पोलिंग गति (अपडेट आवृत्ति) और कनेक्शन स्थिरता बढ़ती है।',
    klineHeader: 'K-Line (पुराना प्रोटोकॉल)',
    klineDesc: 'अनुशंसित: अधिकतम 4 सक्रिय सेंसर। अपडेट दर ~2-3 हर्ट्ज है। बहुत सारे सेंसर चुनने से विलंबता या बफर ओवरफ्लो के कारण कनेक्शन टूट सकता है।',
    canbusHeader: 'CAN-Bus (आधुनिक प्रोटोकॉल)',
    canbusDesc: 'अनुशंसित: अधिकतम 8 सक्रिय सेंसर। अपडेट दर ~10-25 हर्ट्ज है। उच्च गति मल्टी-पीआईडी पोलिंग के लिए J1979 बैच क्वेरी का उपयोग करता है।'
  }
};

export default function AboutView({
  infoBtStatus,
  infoLocStatus,
  onReconfigurePermissions,
  onAccordionToggle,
}: AboutViewProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const tc = colors;
  const { s: scaleWidth, vs: scaleHeight, ms: scaleMod, fs: scaleFont } = useResponsive();

  const [expandedInfoSection, setExpandedInfoSection] = useState<string | null>(null);

  const isPro = usePurchaseStore((state) => state.isPro);
  const language = useAppStore((state) => state.language);

  // Hidden testing backdoor (to be removed on release)
  const [logoTapCount, setLogoTapCount] = useState(0);
  const logoTapTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleLogoTap = () => {
    setLogoTapCount((prev) => {
      const nextCount = prev + 1;
      if (nextCount >= 7) {
        const nextPro = !isPro;
        useAppStore.getState().setIsBackdoorPro(nextPro);
        Alert.alert(
          "MotoCortex Dev Mode", 
          `PRO Status: ${nextPro ? 'ACTIVE' : 'INACTIVE'}`
        );
        return 0;
      }
      return nextCount;
    });

    if (logoTapTimerRef.current) {
      clearTimeout(logoTapTimerRef.current);
    }
    logoTapTimerRef.current = setTimeout(() => {
      setLogoTapCount(0);
    }, 2000);
  };

  const toggleInfoAcc = (section: string) => {
    const nextSection = expandedInfoSection === section ? null : section;
    setExpandedInfoSection(nextSection);
    if (onAccordionToggle) {
      onAccordionToggle(nextSection);
    }
  };

  const InfoAccordion = ({ id, icon, title, content }: { id: string, icon: string, title: string, content: string | React.ReactNode }) => (
    <View style={{ marginBottom: scaleHeight(8) }}>
      <TouchableOpacity
        style={{
          backgroundColor: expandedInfoSection === id ? tc.elevated : tc.card,
          borderWidth: 1,
          borderColor: tc.border,
          borderRadius: scaleMod(6),
          paddingVertical: scaleHeight(14),
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: scaleWidth(16)
        }}
        onPress={() => toggleInfoAcc(id)}
      >
        <Text style={{
          color: expandedInfoSection === id ? tc.cyan : tc.textPri,
          fontSize: scaleFont(12),
          fontFamily: tc.mono,
          fontWeight: '700'
        }}>
          {icon}  {title}
        </Text>
        <Text style={{ color: tc.textSec, fontSize: scaleFont(12) }}>{expandedInfoSection === id ? '▼' : '▶'}</Text>
      </TouchableOpacity>
      {expandedInfoSection === id && (
        <View style={{ backgroundColor: tc.bg, padding: scaleMod(16), borderWidth: 1, borderTopWidth: 0, borderColor: tc.border, borderBottomLeftRadius: 4, borderBottomRightRadius: 4 }}>
          {typeof content === 'string' ? (
            <Text style={{ color: tc.textSec, fontSize: scaleFont(11), fontFamily: tc.mono, lineHeight: scaleFont(15) }}>
              {content}
            </Text>
          ) : (
            content
          )}
        </View>
      )}
    </View>
  );

  const renderPerformanceGuide = () => {
    const texts = PERFORMANCE_TRANSLATIONS[language] || PERFORMANCE_TRANSLATIONS['en'];

    return (
      <View style={{ gap: scaleHeight(12) }}>
        <Text style={{
          color: tc.textPri,
          fontSize: scaleFont(11),
          fontFamily: tc.mono,
          lineHeight: scaleFont(15),
          fontWeight: '700',
        }}>
          💡 {texts.general}
        </Text>

        {/* K-Line Card */}
        <View style={{
          backgroundColor: `${tc.amber}0B`,
          borderWidth: 1,
          borderColor: `${tc.amber}50`,
          borderRadius: scaleMod(8),
          padding: scaleMod(12),
          gap: scaleHeight(6)
        }}>
          <Text style={{
            color: tc.amber,
            fontSize: scaleFont(11),
            fontFamily: tc.mono,
            fontWeight: '900',
            letterSpacing: 0.5
          }}>
            ⚠️ {texts.klineHeader}
          </Text>
          <Text style={{
            color: tc.textSec,
            fontSize: scaleFont(10),
            fontFamily: tc.mono,
            lineHeight: scaleFont(14)
          }}>
            {texts.klineDesc}
          </Text>
        </View>

        {/* CAN-Bus Card */}
        <View style={{
          backgroundColor: `${tc.cyan}0B`,
          borderWidth: 1,
          borderColor: `${tc.cyan}50`,
          borderRadius: scaleMod(8),
          padding: scaleMod(12),
          gap: scaleHeight(6)
        }}>
          <Text style={{
            color: tc.cyan,
            fontSize: scaleFont(11),
            fontFamily: tc.mono,
            fontWeight: '900',
            letterSpacing: 0.5
          }}>
            🚀 {texts.canbusHeader}
          </Text>
          <Text style={{
            color: tc.textSec,
            fontSize: scaleFont(10),
            fontFamily: tc.mono,
            lineHeight: scaleFont(14)
          }}>
            {texts.canbusDesc}
          </Text>
        </View>
      </View>
    );
  };

  const renderOnboardingAccordionContent = () => (
    <View style={{ gap: scaleHeight(12) }}>
      <Text style={{ color: tc.textSec, fontSize: scaleFont(11), fontFamily: tc.mono, lineHeight: scaleFont(15) }}>
        {t('permissions.cardDesc')}
      </Text>
      
      <View style={{ gap: scaleHeight(8), marginTop: scaleHeight(4) }}>
        {/* Bluetooth Status Row */}
        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          backgroundColor: `${tc.textPri}05`,
          borderWidth: 1,
          borderColor: tc.border,
          borderRadius: 6,
          paddingVertical: scaleHeight(10),
          paddingHorizontal: scaleWidth(12)
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: scaleWidth(8) }}>
            <Text style={{ fontSize: scaleFont(14) }}>⚡</Text>
            <Text style={{ color: tc.textPri, fontSize: scaleFont(11), fontFamily: tc.mono, fontWeight: '700' }}>
              {t('permissions.btLabel')}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: scaleWidth(4) }}>
            <View style={{ 
              width: 6, 
              height: 6, 
              borderRadius: 3, 
              backgroundColor: infoBtStatus === 'granted' ? tc.green : tc.red 
            }} />
            <Text style={{ 
              color: infoBtStatus === 'granted' ? tc.green : tc.red, 
              fontSize: scaleFont(10), 
              fontFamily: tc.mono,
              fontWeight: '900' 
            }}>
              {infoBtStatus === 'checking' ? '...' : (infoBtStatus === 'granted' ? t('common.active', 'ACTIVE') : t('common.disabled', 'DISABLED'))}
            </Text>
          </View>
        </View>

        {/* Location Status Row */}
        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          backgroundColor: `${tc.textPri}05`,
          borderWidth: 1,
          borderColor: tc.border,
          borderRadius: 6,
          paddingVertical: scaleHeight(10),
          paddingHorizontal: scaleWidth(12)
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: scaleWidth(8) }}>
            <Text style={{ fontSize: scaleFont(14) }}>📍</Text>
            <Text style={{ color: tc.textPri, fontSize: scaleFont(11), fontFamily: tc.mono, fontWeight: '700' }}>
              {t('permissions.locLabel')}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: scaleWidth(4) }}>
            <View style={{ 
              width: 6, 
              height: 6, 
              borderRadius: 3, 
              backgroundColor: infoLocStatus === 'granted' ? tc.green : tc.red 
            }} />
            <Text style={{ 
              color: infoLocStatus === 'granted' ? tc.green : tc.red, 
              fontSize: scaleFont(10), 
              fontFamily: tc.mono,
              fontWeight: '900' 
            }}>
              {infoLocStatus === 'checking' ? '...' : (infoLocStatus === 'granted' ? t('common.active', 'ACTIVE') : t('common.disabled', 'DISABLED'))}
            </Text>
          </View>
        </View>
      </View>

      <TouchableOpacity 
        style={{ 
          marginTop: scaleHeight(6),
          backgroundColor: tc.elevated, 
          borderWidth: 1.5, 
          borderColor: tc.border, 
          borderRadius: 8, 
          paddingVertical: scaleHeight(10), 
          alignItems: 'center', 
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 8
        }}
        onPress={onReconfigurePermissions}
        activeOpacity={0.4}
      >
        <Text style={{ color: tc.cyan, fontSize: scaleFont(10), fontWeight: '900', fontFamily: tc.mono }}>
          🛡️ {t('info.reconfigurePermissions').toUpperCase()}
        </Text>
      </TouchableOpacity>
    </View>
  );



  return (
    <View style={{ flex: 1 }}>
      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ 
          paddingHorizontal: scaleWidth(16), 
          paddingBottom: scaleHeight(40), 
          gap: scaleHeight(12), 
          paddingTop: scaleHeight(12),
          alignSelf: 'center',
          width: '100%',
          maxWidth: 600,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={{
          color: tc.textSec,
          fontSize: scaleFont(11),
          fontWeight: '900',
          fontFamily: tc.mono,
          letterSpacing: 1,
          marginLeft: 4,
          marginBottom: scaleHeight(2),
        }}>
          {t('info.helpGuide').toUpperCase()}
        </Text>

        <InfoAccordion
          id="canli"
          icon="📊"
          title={t('info.sections.live.title')}
          content={t('info.sections.live.content')}
        />
        <InfoAccordion
          id="ekspertiz"
          icon="🔍"
          title={t('info.sections.expertise.title')}
          content={t('info.sections.expertise.content')}
        />
        <InfoAccordion
          id="testler"
          icon="⚡"
          title={t('info.sections.tests.title')}
          content={t('info.sections.tests.content')}
        />
        <InfoAccordion
          id="donanim"
          icon="🔌"
          title={t('info.sections.hardware.title')}
          content={t('info.sections.hardware.content')}
        />
        <InfoAccordion
          id="uyarilar"
          icon="⚠️"
          title={t('info.sections.warnings.title')}
          content={t('info.sections.warnings.content')}
        />
        <InfoAccordion
          id="performans_rehberi"
          icon="⚡"
          title={PERFORMANCE_TRANSLATIONS[language]?.title || PERFORMANCE_TRANSLATIONS['en'].title}
          content={renderPerformanceGuide()}
        />
        <InfoAccordion
          id="onboarding"
          icon="⚖️"
          title={t('info.sections.onboarding.title')}
          content={renderOnboardingAccordionContent()}
        />

        {/* App Info Card removed and moved to main dashboard page */}
      </ScrollView>
    </View>
  );
}
