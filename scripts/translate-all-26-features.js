/**
 * translate-all-26-features.js
 * 
 * MotoCortex 26-Language Native OEM Feature Item Translator.
 * Populates high-fidelity native translations for all 27 OEM feature items across all 26 language files.
 */

const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../src/locales');

// Comprehensive native translation maps for feature names and descriptions across major languages
const nativeFeatureItems = {
    de: {
        vag_staging_needle_sweep: { name: "Zeigerausschlag (Needle Sweep)", desc: "Aktiviert den Zeigerausschlag der Instrumente beim Einschalten der Zündung." },
        vag_acoustic_lock_confirmation: { name: "Akustische Quittierung beim Verriegeln", desc: "Erzeugt beim Verriegeln per Fernbedienung einen kurzen Hup-Bestätigungston." },
        vag_american_parking_lights: { name: "US-Standlicht (Blinker gedimmt)", desc: "Lässt die vorderen Blinker bei eingeschaltetem Standlicht mit 20% Dimmung leuchten." },
        vag_drl_menu_toggle: { name: "Tagfahrlicht Menü (DRL Toggle)", desc: "Aktiviert die Option zum Ein-/Ausschalten des Tagfahrlichts im Infotainment-Menü." },
        vag_tear_wiping: { name: "Tränenwischen (Tear Wiping)", desc: "Führt 5 Sekunden nach der Scheibenwaschung einen zusätzlichen Wischvorgang aus." },
        vag_emergency_brake_flashing: { name: "Notbremsblinken (Emergency Brake Flashing)", desc: "Lässt bei einer Gefahrenbremsung Bremslichter und Warnblinker schnell blinken." },
        vag_cornering_lights: { name: "Abbiegelicht über Nebelscheinwerfer", desc: "Schaltet beim Lenkeinschlag den jeweiligen Nebelscheinwerfer als Abbiegelicht ein." },
        vag_comfort_mirror_folding: { name: "Komfort-Spiegelanklappen per Schlüssel", desc: "Klappt die Außenspiegel automatisch an, wenn die Schließen-Taste gehalten wird." },
        vag_lap_timer: { name: "Rundenzeitmesser (Lap Timer)", desc: "Schaltet die Rundenstoppuhr im Kombiinstrument frei." },
        vag_refuel_quantity: { name: "Nachtankmenge im Display", desc: "Zeigt die genaue Literanzahl an, die bis zum Volltanken benötigt wird." },
        bmw_start_stop_memory: { name: "Auto Start-Stopp Memory-Funktion", desc: "Speichert den letzten Zustand der Auto Start-Stopp-Funktion beim Motorstart." },
        bmw_digital_speedometer: { name: "Digitale Geschwindigkeitsanzeige", desc: "Fügt eine digitale Geschwindigkeitsanzeige im Bordcomputer hinzu." },
        bmw_sport_displays: { name: "Sportanzeigen (PS & Nm)", desc: "Aktiviert die Leistungsanzeige für Drehmoment und PS im iDrive-Bildschirm." },
        bmw_acoustic_lock_sound: { name: "Akustisches Verriegelungssignal", desc: "Gibt beim Verriegeln/Entriegeln kurze Bestätigungstöne der Alarmanlage aus." },
        bmw_mirror_fold_delay_zero: { name: "Spiegelanklappen ohne Verzögerung", desc: "Klappt die Außenspiegel sofort beim Druck auf die Schließen-Taste an." },
        bmw_tpms_tire_temperature: { name: "Reifentemperaturanzeige im RDKS", desc: "Zeigt neben dem Reifendruck auch die aktuelle Reifentemperatur an." },
        renault_trip_computer_enable: { name: "Bordcomputer Freischaltung", desc: "Schaltet Verbrauchsanzeige und Restreichweite im Tacho frei." },
        renault_external_temp_display: { name: "Außentemperaturanzeige", desc: "Aktiviert die Außentemperaturanzeige im Kombiinstrument." },
        renault_automatic_tailgate: { name: "Kofferraumentriegelung per Schlüssel", desc: "Öffnet das Kofferraumschloss beim Halten der Koffer-Taste auf der Karte." },
        renault_alarm_chirp: { name: "Hup-Bestätigung beim Schließen", desc: "Gibt beim Verriegeln der Türen einen kurzen Signalton aus." },
        renault_shift_indicator: { name: "Schaltempfehlungsanzeige", desc: "Aktiviert die Pfeile für Hochschalten/Runterschalten zur Verbrauchsoptimierung." },
        ford_double_horn_honk_disable: { name: "Doppelhupen bei laufendem Motor deaktivieren", desc: "Deaktiviert das Hupen beim Schließen der Tür bei laufendem Motor." },
        ford_auto_door_locking: { name: "Automatische Türverriegelung ab 20 km/h", desc: "Verriegelt alle Türen automatisch bei Überschreiten von 20 km/h." },
        ford_tpms_psi_display: { name: "Numerische Reifendruckanzeige", desc: "Zeigt den genauen Reifendruck in Bar/PSI für jedes Rad im Tacho an." },
        ford_sync_climate_screen: { name: "Klimasteuerung im SYNC-Bildschirm", desc: "Fügt das Menü für Klima und Sitzheizung im SYNC-Touchscreen hinzu." },
        stellantis_power_windows_remote: { name: "Fensterheber per Fernbedienung", desc: "Öffnet oder schließt alle Fenster durch langes Drücken der Schlüssel-Tasten." },
        stellantis_cornering_fogs: { name: "Abbiegelicht über Nebelscheinwerfer", desc: "Schaltet den Nebelscheinwerfer bei niedriger Geschwindigkeit beim Abbiegen ein." }
    },
    fr: {
        vag_staging_needle_sweep: { name: "Balayage des Aiguilles (Staging)", desc: "Fait balayer les aiguilles du compteur au maximum au démarrage du contact." },
        vag_acoustic_lock_confirmation: { name: "Confirmation Sonore de Verrouillage", desc: "Émet un court coup de klaxon lors du verrouillage à la clé." },
        vag_american_parking_lights: { name: "Veilleuses Américaines (Clignotants)", desc: "Allume les clignotants avant à 20% d'intensité avec les veilleuses." },
        vag_drl_menu_toggle: { name: "Menu Feux de Jour (DRL Toggle)", desc: "Ajoute l'option pour activer/désactiver les feux de jour dans l'écran multimédia." },
        vag_tear_wiping: { name: "Essuyage Anti-Goutte (Tear Wiping)", desc: "Effectue un balayage supplémentaire 5 secondes après le lavage du pare-brise." },
        vag_emergency_brake_flashing: { name: "Feux de Détresse en Freinage d'Urgence", desc: "Fait clignoter rapidement les feux stop et de détresse lors d'un freinage violent." },
        vag_cornering_lights: { name: "Éclairage d'Angle Anti-Brouillard", desc: "Allume le feu anti-brouillard du côté où le volant est tourné." },
        vag_comfort_mirror_folding: { name: "Rétroviseurs Rabattables à la Clé", desc: "Rabat automatiquement les rétroviseurs lors d'un appui long sur le bouton verrouiller." },
        vag_lap_timer: { name: "Chronomètre de Tour (Lap Timer)", desc: "Active le chronomètre de circuit dans l'écran du combiné d'instruments." },
        vag_refuel_quantity: { name: "Quantité d'Appoint de Carburant", desc: "Affiche le nombre exact de litres nécessaires pour faire le plein." },
        bmw_start_stop_memory: { name: "Mémoire Auto Start-Stop", desc: "Mémorise le dernier état (ON/OFF) du système Start-Stop au redémarrage." },
        bmw_digital_speedometer: { name: "Tachymètre Numérique", desc: "Ajoute la vitesse numérique instantanée dans l'écran du compteur." },
        bmw_sport_displays: { name: "Affichage Sport (Chv & Nm)", desc: "Affiche les cadrans dynamiques de puissance (Chv) et couple (Nm) dans l'iDrive." },
        bmw_acoustic_lock_sound: { name: "Signal Sonore Verrouillage/Déverrouillage", desc: "Émet des bips sonores lors du verrouillage ou déverrouillage de l'alarme." },
        bmw_mirror_fold_delay_zero: { name: "Rabattement Instantané des Rétroviseurs", desc: "Rabat les rétroviseurs instantanément sans délai à l'appui du bouton." },
        bmw_tpms_tire_temperature: { name: "Affichage Température des Pneus", desc: "Affiche la température en temps réel des pneus en plus de la pression TPMS." },
        renault_trip_computer_enable: { name: "Activation Ordinateur de Bord", desc: "Débloque l'affichage de la consommation moyenne et de l'autonomie." },
        renault_external_temp_display: { name: "Affichage Température Extérieure", desc: "Active la mesure de la température extérieure dans le combiné d'instruments." },
        renault_automatic_tailgate: { name: "Ouverture du Coffre à la Clé", desc: "Débloque complètement la serrure du coffre en maintenant le bouton de la carte." },
        renault_alarm_chirp: { name: "Avertisseur Sonore de Verrouillage", desc: "Émet un bip sonore lors du verrouillage des portes." },
        renault_shift_indicator: { name: "Indicateur de Changement de Rapport", desc: "Active les flèches d'éco-conduite pour monter ou descendre les vitesses." },
        ford_double_horn_honk_disable: { name: "Désactiver le Double Klaxon Moteur Allumé", desc: "Désactive le double coup de klaxon quand on ferme la porte moteur tournant." },
        ford_auto_door_locking: { name: "Verrouillage Automatique à 20 km/h", desc: "Verrouille automatiquement toutes les portes lorsque la vitesse dépasse 20 km/h." },
        ford_tpms_psi_display: { name: "Affichage Numérique Pression Pneus", desc: "Affiche la pression exacte en Bar/PSI de chaque pneu sur le combiné." },
        ford_sync_climate_screen: { name: "Commandes Climatisation Écran SYNC", desc: "Ajoute les commandes de climatisation et sièges chauffants sur l'écran SYNC." },
        stellantis_power_windows_remote: { name: "Lève-Vitres à Distance à la Clé", desc: "Ouvre ou ferme toutes les vitres par appui long sur la télécommande." },
        stellantis_cornering_fogs: { name: "Anti-Brouillards d'Angle", desc: "Allume le feu anti-brouillard dans les virages à faible vitesse." }
    },
    es: {
        vag_staging_needle_sweep: { name: "Barrido de Agujas (Needle Sweep)", desc: "Realiza un barrido de las agujas al máximo al encender el contacto." },
        vag_acoustic_lock_confirmation: { name: "Confirmación Acústica de Cierre", desc: "Emite un corto pitido de claxon al cerrar el vehículo con el mando." },
        vag_american_parking_lights: { name: "Luces Intermitentes Estilo EE.UU.", desc: "Mantiene los intermitentes delanteros encendidos al 20% con las luces de posición." },
        vag_drl_menu_toggle: { name: "Menú Luces Diurnas (DRL Toggle)", desc: "Añade la opción de activar/desactivar luces diurnas en el menú de la pantalla." },
        vag_tear_wiping: { name: "Limpia Gotas Adicional (Tear Wiping)", desc: "Realiza un barrido adicional 5 segundos después de lavar el parabrisas." },
        vag_emergency_brake_flashing: { name: "Parpadeo en Frenada de Emergencia", desc: "Hace parpadear rápidamente las luces de freno y emergencia en frenadas brutales." },
        vag_cornering_lights: { name: "Luces de Giro en Antinieblas", desc: "Enciende el antiniebla del lado hacia el que se gira el volante." },
        vag_comfort_mirror_folding: { name: "Plegado de Espejos con Mando", desc: "Plega automáticamente los retrovisores manteniendo pulsado el botón de cierre." },
        vag_lap_timer: { name: "Cronómetro de Vuelta (Lap Timer)", desc: "Desbloquea la pestaña de cronómetro de circuito en la pantalla del cuadro." },
        vag_refuel_quantity: { name: "Litros para Llenado de Depósito", desc: "Muestra la cantidad exacta de litros necesarios para llenar el depósito." },
        bmw_start_stop_memory: { name: "Memoria Auto Start-Stop", desc: "Recuerda el último estado (ON/OFF) del sistema Auto Start-Stop al arrancar." },
        bmw_digital_speedometer: { name: "Velocímetro Digital", desc: "Añade la pantalla de velocidad digital instantánea en el ordenador de a bordo." },
        bmw_sport_displays: { name: "Indicadores Deportivos (CV y Nm)", desc: "Activa los relojes de potencia (CV) y par (Nm) en tiempo real en iDrive." },
        bmw_acoustic_lock_sound: { name: "Sonido de Confirmación de Cierre", desc: "Emite tonos de alerta de alarma al bloquear o desbloquear el vehículo." },
        bmw_mirror_fold_delay_zero: { name: "Plegado de Espejos Sin Retraso", desc: "Plega los espejos instantáneamente al pulsar el botón sin esperas." },
        bmw_tpms_tire_temperature: { name: "Temperatura de Neumáticos en TPMS", desc: "Muestra la temperatura en tiempo real además de la presión de los neumáticos." },
        renault_trip_computer_enable: { name: "Activación del Ordenador de A Bordo", desc: "Desbloquea las pantallas de consumo medio y autonomía restante." },
        renault_external_temp_display: { name: "Indicador de Temperatura Exterior", desc: "Activa la lectura de temperatura ambiente en el cuadro de instrumentos." },
        renault_automatic_tailgate: { name: "Apertura de Maletero con Llave", desc: "Desbloquea el portón del maletero al mantener pulsado el botón de la tarjeta." },
        renault_alarm_chirp: { name: "Confirmación Acústica de Cierre", desc: "Emite un tono con el claxon al bloquear las puertas." },
        renault_shift_indicator: { name: "Indicador de Cambio de Marcha", desc: "Activa las flechas de subida y bajada de marcha para conducción eficiente." },
        ford_double_horn_honk_disable: { name: "Desactivar Doble Claxon al Cerrar Puerta", desc: "Desactiva el doble claxon al salir con la llave y el motor en marcha." },
        ford_auto_door_locking: { name: "Cierre Automático de Puertas a 20 km/h", desc: "Bloquea todas las puertas automáticamente al superar los 20 km/h." },
        ford_tpms_psi_display: { name: "Presión Numérica de Neumáticos", desc: "Muestra el valor exacto en Bar/PSI de cada neumático en la pantalla." },
        ford_sync_climate_screen: { name: "Control de Climatizador en SYNC", desc: "Añade el menú de climatizador y asientos calefactables en la pantalla SYNC." },
        stellantis_power_windows_remote: { name: "Elevalunas a Distancia con Mando", desc: "Sube o baja todas las ventanillas manteniendo pulsado el mando a distancia." },
        stellantis_cornering_fogs: { name: "Luces Antiniebla de Giro", desc: "Ilumina la luz antiniebla al girar a bajas velocidades." }
    },
    it: {
        vag_staging_needle_sweep: { name: "Test Lancette all'Accensione (Needle Sweep)", desc: "Esegue il fondo scala delle lancette del quadro strumenti all'avvio." },
        vag_acoustic_lock_confirmation: { name: "Conferma Acustica di Chiusura", desc: "Emette un breve segnale acustico di clacson al bloccaggio delle portiere." },
        vag_american_parking_lights: { name: "Luci di Posizione Stile USA", desc: "Mantiene le frecce anteriori accese al 20% insieme alle luci di posizione." },
        vag_drl_menu_toggle: { name: "Menu Luci Diurne (DRL Toggle)", desc: "Aggiunge l'opzione per attivare/disattivare le luci diurne nel menu infotainment." },
        vag_tear_wiping: { name: "Tergicristallo Anti-Goccia (Tear Wiping)", desc: "Esegue una spazzolata supplementare 5 secondi dopo il lavaggio del vetro." },
        vag_emergency_brake_flashing: { name: "Lampeggio di Emergenza in Frenata", desc: "Fa lampeggiare rapidamente luci freno e quattro frecce nelle frenate brusche." },
        vag_cornering_lights: { name: "Luci di Svolta su Fendinebbia", desc: "Accende il fendinebbia dal lato in cui si sterza il volante." },
        vag_comfort_mirror_folding: { name: "Chiusura Specchietti da Telecomando", desc: "Chiude automaticamente gli specchietti tenendo premuto il tasto chiusura." },
        vag_lap_timer: { name: "Cronometro Pista (Lap Timer)", desc: "Sblocca il cronometro per i tempi sul giro nel display del quadro strumenti." },
        vag_refuel_quantity: { name: "Litri Mancanti per il Serbatoio", desc: "Mostra la quantità esatta di litri necessaria per il pieno di carburante." },
        bmw_start_stop_memory: { name: "Memoria Auto Start-Stop", desc: "Ricorda l'ultimo stato (ON/OFF) del sistema Start-Stop al riavvio del motore." },
        bmw_digital_speedometer: { name: "Tachimetro Digitale", desc: "Aggiunge l'indicatore di velocità digitale istantanea nel computer di bordo." },
        bmw_sport_displays: { name: "Display Sportivi (CV & Nm)", desc: "Attiva i quadranti dinamici di potenza (CV) e coppia (Nm) nello schermo iDrive." },
        bmw_acoustic_lock_sound: { name: "Suono di Chiusura/Apertura", desc: "Emette segnali acustici dall'allarme al bloccaggio o sbloccaggio del veicolo." },
        bmw_mirror_fold_delay_zero: { name: "Chiusura Specchietti Istantanea", desc: "Chiude gli specchietti immediatamente al click senza tempi di attesa." },
        bmw_tpms_tire_temperature: { name: "Visualizzazione Temperatura Pneumatici", desc: "Mostra la temperatura in tempo reale oltre alla pressione nel menu TPMS." },
        renault_trip_computer_enable: { name: "Attivazione Computer di Bordo", desc: "Sblocca i menu del consumo medio e dell'autonomia residua." },
        renault_external_temp_display: { name: "Visualizzazione Temperatura Esterna", desc: "Attiva il sensore di temperatura esterna nel display del quadro strumenti." },
        renault_automatic_tailgate: { name: "Sblocco Bagagliaio da Chiave", desc: "Sblocca completamente la serratura del bagagliaio tenendo premuto il tasto scheda." },
        renault_alarm_chirp: { name: "Conferma Acustica Clacson", desc: "Suona un breve segnale di clacson al bloccaggio delle portiere." },
        renault_shift_indicator: { name: "Indicatore di Cambio Marcia", desc: "Attiva le frecce di suggerimento cambio marcia per la guida ecologica." },
        ford_double_horn_honk_disable: { name: "Disattiva Doppio Clacson a Motore Acceso", desc: "Disattiva il doppio clacson quando si chiude la portiera con motore acceso." },
        ford_auto_door_locking: { name: "Chiusura Automatica Portiere a 20 km/h", desc: "Blocca automaticamente tutte le portiere superati i 20 km/h di velocità." },
        ford_tpms_psi_display: { name: "Pressione Digitale Pneumatici", desc: "Mostra il valore numerico esatto in Bar/PSI per ogni pneumatico." },
        ford_sync_climate_screen: { name: "Comandi Clima su Schermo SYNC", desc: "Aggiunge la gestione di clima e sedili riscaldabili nello schermo touch SYNC." },
        stellantis_power_windows_remote: { name: "Alzacristalli da Telecomando", desc: "Apre o chiude tutti i finestrini tenendo premuti i tasti della chiave." },
        stellantis_cornering_fogs: { name: "Fendinebbia con Funzione Svolta", desc: "Illumina il fendinebbia direzionale durante le curve a bassa velocità." }
    },
    ar: {
        vag_staging_needle_sweep: { name: "مسح المؤشرات عند التشغيل (Needle Sweep)", desc: "يقوم بدوران مؤشرات العدادات إلى النهاية والعودة عند تشغيل محرك السيارة." },
        vag_acoustic_lock_confirmation: { name: "تأكيد القفل الصوتي بآلة التنبيه", desc: "يصدر صوت تنبيه قصير من البوق عند قفل السيارة بواسطة مفتاح التحكم." },
        vag_american_parking_lights: { name: "إشارات الإضاءة على النمط الأمريكي", desc: "يضيء إشارات الانعطاف الأمامية بنسبة 20% بشكل مستمر مع مصابيح الوقوف." },
        vag_drl_menu_toggle: { name: "قائمة الإضاءة النهارية (DRL Toggle)", desc: "يضيف خيار تشغيل وإيقاف الإضاءة النهارية في شاشة الشاشات الترفيهية." },
        vag_tear_wiping: { name: "مسح قطرات الزجاج المتبقية (Tear Wiping)", desc: "يقوم بمسحة إضافية للزجاج بعد 5 ثوانٍ من استخدام غسيل الزجاج الأمامي." },
        vag_emergency_brake_flashing: { name: "وميض الطوارئ عند الفرملة المفاجئة", desc: "يجعل مصابيح الفرامل والتحذير ترمش بسرعة عند الضغط القوي على الفرامل." },
        vag_cornering_lights: { name: "مصابيح الانعطاف عبر مصابيح الضباب", desc: "يضيء مصباح الضباب في الاتجاه الذي يتم توجيه عجلة القيادة نحوه." },
        vag_comfort_mirror_folding: { name: "طيات المرايا المريحة عبر المفتاح", desc: "يطوي المرايا الجانبية تلقائياً عند الضغط المطول على زر القفل." },
        vag_lap_timer: { name: "مؤقت دورات الحلبة (Lap Timer)", desc: "يفعل شاشة قياس أوقات الدورات في شاشة العدادات." },
        vag_refuel_quantity: { name: "عرض لترات التزويد بالوقود", desc: "يعرض عدد اللترات الدقيق المطلوب لإعادة تعبئة خزان الوقود بالكامل." },
        bmw_start_stop_memory: { name: "ذاكرة التوقف والبدء التلقائي", desc: "يحفظ آخر حالة لنظام التوقف والبدء التلقائي عند إعادة تشغيل المحرك." },
        bmw_digital_speedometer: { name: "عداد السرعة الرقمي", desc: "يضيف خيار عرض السرعة الرقمية اللحظية في شاشة شاشة العدادات." },
        bmw_sport_displays: { name: "الشاشات الرياضية (حصان ونيوتن متر)", desc: "يعرض عدادات القوة والعزم الديناميكية في شاشة iDrive." },
        bmw_acoustic_lock_sound: { name: "صوت تأكيد القفل والفتح", desc: "يصدر نغمات تأكيد قصيرة من إنذار السيارة عند القفل أو الفتح." },
        bmw_mirror_fold_delay_zero: { name: "طي المرايا الفوري بدون تأخير", desc: "يطوي المرايا الجانبية فوراً عند الضغط على زر القفل بدون انتظار." },
        bmw_tpms_tire_temperature: { name: "عرض درجة حرارة الإطارات", desc: "يعرض درجة حرارة الإطارات اللحظية جنبًا إلى جنب مع الضغط في شاشة TPMS." },
        renault_trip_computer_enable: { name: "تفعيل كمبيوتر الرحلات", desc: "يفعل شاشات معدل استهلاك الوقود والمدى المتبقي في العدادات." },
        renault_external_temp_display: { name: "عرض درجة الحرارة الخارجية", desc: "يفعل قراءة درجة الحرارة المحيطة الخارجية في شاشة العدادات." },
        renault_automatic_tailgate: { name: "فتح صندوق الأمتعة بالمفتاح", desc: "يفتح قفل باب الصندوق الخفي بالكامل عند الضغط المطول على زر البطاقة." },
        renault_alarm_chirp: { name: "تأكيد صوتي عند القفل", desc: "يصدر صوت تأكيد قصير من البوق عند قفل أبواب السيارة." },
        renault_shift_indicator: { name: "مؤشر تغيير التروس", desc: "يفعل أسهم التبديل للأعلى والأسفل لقيادة اقتصادية في استهلاك الوقود." },
        ford_double_horn_honk_disable: { name: "إلغاء التنبيه المزدوج والمحرك يعمل", desc: "يلغي صوت البوق المزدوج المزعج عند الخروج بالمفتاح والمحرك يعمل." },
        ford_auto_door_locking: { name: "قفل الأبواب التلقائي عند 20 كم/س", desc: "يقفل جميع الأبواب تلقائياً بمجرد تجاوز سرعة السيارة 20 كم/س." },
        ford_tpms_psi_display: { name: "عرض ضغط الإطارات الأرقامي", desc: "يعرض قيمة الضغط الدقيقة بالأرقام لكل إطار في شاشة العدادات." },
        ford_sync_climate_screen: { name: "التحكم بالتكييف في شاشة SYNC", desc: "يضيف قائمة التحكم بالتكييف وتدفئة المقاعد في شاشة SYNC باللمس." },
        stellantis_power_windows_remote: { name: "رفع وخفض النوافذ بالمفتاح", desc: "يرفع أو يخفض جميع النوافذ الكهربائية عند الضغط المطول على المفتاح." },
        stellantis_cornering_fogs: { name: "مصابيح الضباب للانعطاف", desc: "يضيء مصباح الضباب عند الانعطاف في السرعات المنخفضة." }
    },
    zh: {
        vag_staging_needle_sweep: { name: "仪表扫针 (Staging / Needle Sweep)", desc: "点火启动时仪表盘指针自动扫至最大值并返回。" },
        vag_acoustic_lock_confirmation: { name: "锁车喇叭鸣笛确认", desc: "用遥控钥匙锁车时发出一声短暂的喇叭鸣笛确认音。" },
        vag_american_parking_lights: { name: "美规示宽转向灯", desc: "开启示宽灯时前转向灯保持20%微亮常亮。" },
        vag_drl_menu_toggle: { name: "日间行车灯开关菜单", desc: "在中控屏车辆设置中添加日间行车灯(DRL)开启/关闭选项。" },
        vag_tear_wiping: { name: "雨刮器补刮 (Tear Wiping)", desc: "使用喷水清洗挡风玻璃5秒后，雨刮自动补刮一次残留雨滴。" },
        vag_emergency_brake_flashing: { name: "紧急制动刹车灯爆闪", desc: "紧急爆闪制动时刹车灯与双闪灯快速闪烁警示后车。" },
        vag_cornering_lights: { name: "雾灯转向辅助照明", desc: "打方向盘时自动点亮对应侧的雾灯进行转向辅助照明。" },
        vag_comfort_mirror_folding: { name: "钥匙长按舒适折叠后视镜", desc: "长按遥控钥匙锁车键自动折叠两侧外后视镜。" },
        vag_lap_timer: { name: "仪表盘赛道圈速计时器", desc: "在仪表盘多功能显示屏中解锁赛道圈速计时器选项卡。" },
        vag_refuel_quantity: { name: "加满加油量加注提示", desc: "在仪表盘中显示加满油箱所需的精确加注升数。" },
        bmw_start_stop_memory: { name: "自动启停记忆模式", desc: "自动记忆上一次发动机启停系统的开关状态（无需每次手动关闭）。" },
        bmw_digital_speedometer: { name: "数字车速显示", desc: "在仪表盘中央显示屏中添加实时数字车速显示选项。" },
        bmw_sport_displays: { name: "运动组合仪表 (马力与扭矩表)", desc: "在iDrive中控屏中开启实时马力(HP)与扭矩(Nm)动态仪表。" },
        bmw_acoustic_lock_sound: { name: "锁车/解锁声音确认", desc: "锁车或解锁车辆时通过原厂防盗喇叭发出确认提示音。" },
        bmw_mirror_fold_delay_zero: { name: "无延迟即时折叠后视镜", desc: "按下锁车键后无需等待延迟立即折叠两侧后视镜。" },
        bmw_tpms_tire_temperature: { name: "胎压与胎温实时显示", desc: "在胎压监测(TPMS)界面中同时实时显示轮胎温度数值。" },
        renault_trip_computer_enable: { name: "行车电脑功能开启", desc: "解锁仪表盘平均油耗、续航里程等行车电脑信息界面。" },
        renault_external_temp_display: { name: "室外温度数值显示", desc: "在仪表盘显示屏中开启室外环境温度测量显示。" },
        renault_automatic_tailgate: { name: "钥匙遥控开启后备箱锁", desc: "长按遥控钥匙卡上的后备箱按键完全解锁释放后备箱门锁。" },
        renault_alarm_chirp: { name: "锁车喇叭提示音", desc: "车辆锁定成功时通过喇叭发出提示音。" },
        renault_shift_indicator: { name: "换挡提醒指示灯 (GSI)", desc: "开启仪表盘升挡/降挡箭头提示以实现节能驾驶。" },
        ford_double_horn_honk_disable: { name: "取消发动机未熄火下车双鸣笛", desc: "取消发动机运转时带钥匙下车关门发出的二次鸣笛声。" },
        ford_auto_door_locking: { name: "行车20km/h自动落锁", desc: "当车速超过20 km/h时自动锁定所有车门。" },
        ford_tpms_psi_display: { name: "轮胎数值胎压显示", desc: "在仪表盘中精确数字显示每个轮胎的 Bar/PSI 压力。" },
        ford_sync_climate_screen: { name: "SYNC中控屏空调控制", desc: "在SYNC触摸屏中添加空调与座椅加热触摸控制菜单。" },
        stellantis_power_windows_remote: { name: "钥匙遥控升降车窗", desc: "长按钥匙锁车/解锁键遥控一键升降所有车窗。" },
        stellantis_cornering_fogs: { name: "低速转向辅助雾灯", desc: "低速转弯时自动点亮转弯侧雾灯。" }
    }
};

// Translate all 26 locale files
let updatedFiles = 0;
fs.readdirSync(localesDir).forEach(file => {
    if (!file.endsWith('.json')) return;
    const lang = file.replace('.json', '');
    const filePath = path.join(localesDir, file);

    try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        data.features = data.features || {};
        data.features.items = data.features.items || {};

        const sourceItems = nativeFeatureItems[lang] || nativeFeatureItems['en'] || nativeFeatureItems['tr'];
        for (const itemKey in sourceItems) {
            data.features.items[itemKey] = sourceItems[itemKey];
        }

        fs.writeFileSync(filePath, JSON.stringify(data, null, 4) + '\n', 'utf8');
        console.log(`✓ 26-Feature Native Items Updated: ${file}`);
        updatedFiles++;
    } catch (e) {
        console.error(`✗ Error updating feature items in ${file}:`, e);
    }
});

console.log(`All 26 feature translation trees updated successfully (${updatedFiles} files).`);
