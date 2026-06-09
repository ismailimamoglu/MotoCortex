#!/usr/bin/env python3
import json
import os

LOCALES_DIR = "/Users/ismailimamoglu/Desktop/MotoCortex/src/locales"

# Translations to update or insert
DATA_TO_SYNC = {
    "tr": {
        "common": {"close": "KAPAT"},
        "disconnectShort": "KES",
        "bento": {
            "settings": {
                "deviceName": "Cihaz Adı:",
                "simulationObd": "Simülasyon OBD",
                "original": "Orijinal",
                "pollingHigh": "4 Hz (Yüksek)"
            }
        }
    },
    "en": {
        "common": {"close": "CLOSE"},
        "disconnectShort": "DISC",
        "bento": {
            "settings": {
                "deviceName": "Device Name:",
                "simulationObd": "Simulation OBD",
                "original": "Original",
                "pollingHigh": "4 Hz (High)"
            }
        }
    },
    "pt": {
        "common": {"close": "FECHAR"},
        "disconnectShort": "DESC.",
        "bento": {
            "settings": {
                "deviceName": "Nome do Dispositivo:",
                "simulationObd": "Simulação OBD",
                "original": "Original",
                "pollingHigh": "4 Hz (Alto)"
            }
        }
    },
    "es": {
        "common": {"close": "CERRAR"},
        "disconnectShort": "DESC.",
        "bento": {
            "settings": {
                "deviceName": "Nombre del Dispositivo:",
                "simulationObd": "Simulación OBD",
                "original": "Original",
                "pollingHigh": "4 Hz (Alto)"
            }
        }
    },
    "de": {
        "common": {"close": "SCHLIESSEN"},
        "disconnectShort": "TREN.",
        "bento": {
            "settings": {
                "deviceName": "Gerätename:",
                "simulationObd": "Simulation OBD",
                "original": "Original",
                "pollingHigh": "4 Hz (Hoch)"
            }
        }
    },
    "fr": {
        "common": {"close": "FERMER"},
        "disconnectShort": "DÉCONN.",
        "bento": {
            "settings": {
                "deviceName": "Nom de l'appareil :",
                "simulationObd": "Simulation OBD",
                "original": "Original",
                "pollingHigh": "4 Hz (Élevé)"
            }
        }
    },
    "it": {
        "common": {"close": "CHIUDI"},
        "disconnectShort": "SCOL.",
        "bento": {
            "settings": {
                "deviceName": "Nome dispositivo:",
                "simulationObd": "Simulazione OBD",
                "original": "Originale",
                "pollingHigh": "4 Hz (Alto)"
            }
        }
    },
    "ru": {
        "common": {"close": "ЗАКРЫТЬ"},
        "disconnectShort": "ОТКЛ.",
        "bento": {
            "settings": {
                "deviceName": "Имя устройства:",
                "simulationObd": "Симуляция OBD",
                "original": "Оригинал",
                "pollingHigh": "4 Гц (Высокая)"
            }
        }
    },
    "zh": {
        "common": {"close": "关闭"},
        "disconnectShort": "断开",
        "bento": {
            "settings": {
                "deviceName": "设备名称:",
                "simulationObd": "模拟 OBD",
                "original": "原装",
                "pollingHigh": "4 赫兹（高）"
            }
        }
    },
    "nl": {
        "common": {"close": "SLUITEN"},
        "disconnectShort": "ONTK.",
        "bento": {
            "settings": {
                "deviceName": "Apparaatnaam:",
                "simulationObd": "Simulatie OBD",
                "original": "Origineel",
                "pollingHigh": "4 Hz (Hoog)"
            }
        }
    },
    "ja": {
        "common": {"close": "閉じる"},
        "disconnectShort": "切断",
        "bento": {
            "settings": {
                "deviceName": "デバイス名:",
                "simulationObd": "シミュレーション OBD",
                "original": "オリジナル",
                "pollingHigh": "4Hz（高）"
            }
        }
    },
    "ko": {
        "common": {"close": "닫기"},
        "disconnectShort": "해제",
        "bento": {
            "settings": {
                "deviceName": "기기 이름:",
                "simulationObd": "시뮬레이션 OBD",
                "original": "정품",
                "pollingHigh": "4Hz (높음)"
            }
        }
    },
    "pl": {
        "common": {"close": "ZAMKNIJ"},
        "disconnectShort": "ROZŁ.",
        "bento": {
            "settings": {
                "deviceName": "Nazwa urządzenia:",
                "simulationObd": "Symulacja OBD",
                "original": "Oryginał",
                "pollingHigh": "4 Hz (Wysoka)"
            }
        }
    },
    "id": {
        "common": {"close": "TUTUP"},
        "disconnectShort": "PUTUS",
        "bento": {
            "settings": {
                "deviceName": "Nama Perangkat:",
                "simulationObd": "Simulasi OBD",
                "original": "Asli",
                "pollingHigh": "4 Hz (Tinggi)"
            }
        }
    },
    "ar": {
        "common": {"close": "إغلاق"},
        "disconnectShort": "قطع",
        "bento": {
            "settings": {
                "deviceName": "اسم الجهاز:",
                "simulationObd": "محاكاة OBD",
                "original": "أصلي",
                "pollingHigh": "4 هرتز (مرتفع)"
            }
        }
    },
    "cs": {
        "common": {"close": "ZAVŘÍT"},
        "disconnectShort": "ODP.",
        "bento": {
            "settings": {
                "deviceName": "Název zařízení:",
                "simulationObd": "Simulace OBD",
                "original": "Originální",
                "pollingHigh": "4 Hz (Vysoká)"
            }
        }
    },
    "da": {
        "common": {"close": "LUK"},
        "disconnectShort": "AFBR.",
        "bento": {
            "settings": {
                "deviceName": "Enhedsnavn:",
                "simulationObd": "Simulering OBD",
                "original": "Original",
                "pollingHigh": "4 Hz (Høj)"
            }
        }
    },
    "el": {
        "common": {"close": "ΚΛΕΙΣΙΜΟ"},
        "disconnectShort": "ΑΠΟΣ.",
        "bento": {
            "settings": {
                "deviceName": "Όνομα συσκευής:",
                "simulationObd": "Προσομοίωση OBD",
                "original": "Γνήσιο",
                "pollingHigh": "4 Hz (Υψηλή)"
            }
        }
    },
    "fi": {
        "common": {"close": "SULJE"},
        "disconnectShort": "KATK.",
        "bento": {
            "settings": {
                "deviceName": "Laitteen nimi:",
                "simulationObd": "Simulaatio OBD",
                "original": "Alkuperäinen",
                "pollingHigh": "4 Hz (Korkea)"
            }
        }
    },
    "hu": {
        "common": {"close": "BEZÁRÁS"},
        "disconnectShort": "LEVÁL.",
        "bento": {
            "settings": {
                "deviceName": "Eszköz neve:",
                "simulationObd": "Szimulációs OBD",
                "original": "Eredeti",
                "pollingHigh": "4 Hz (Magas)"
            }
        }
    },
    "no": {
        "common": {"close": "LUKK"},
        "disconnectShort": "AVBR.",
        "bento": {
            "settings": {
                "deviceName": "Enhetsnavn:",
                "simulationObd": "Simulering OBD",
                "original": "Original",
                "pollingHigh": "4 Hz (Høy)"
            }
        }
    },
    "ro": {
        "common": {"close": "ÎNCHIDE"},
        "disconnectShort": "DECON.",
        "bento": {
            "settings": {
                "deviceName": "Nume dispozitiv:",
                "simulationObd": "Simulare OBD",
                "original": "Originală",
                "pollingHigh": "4 Hz (Ridicată)"
            }
        }
    },
    "sv": {
        "common": {"close": "STÄNG"},
        "disconnectShort": "AVBR.",
        "bento": {
            "settings": {
                "deviceName": "Enhetsnamn:",
                "simulationObd": "Simulering OBD",
                "original": "Original",
                "pollingHigh": "4 Hz (Hög)"
            }
        }
    },
    "th": {
        "common": {"close": "ปิด"},
        "disconnectShort": "เลิกเชื่อมต่อ",
        "bento": {
            "settings": {
                "deviceName": "ชื่ออุปกรณ์:",
                "simulationObd": "การจำลอง OBD",
                "original": "ต้นฉบับ",
                "pollingHigh": "4 เฮิร์ตซ์ (สูง)"
            }
        }
    },
    "uk": {
        "common": {"close": "ЗАКРИТИ"},
        "disconnectShort": "ВІДКЛ.",
        "bento": {
            "settings": {
                "deviceName": "Ім'я пристрою:",
                "simulationObd": "Симуляція OBD",
                "original": "Оригінальний",
                "pollingHigh": "4 Гц (Висока)"
            }
        }
    },
    "hi": {
        "common": {"close": "बंद करें"},
        "disconnectShort": "डिस्क.",
        "bento": {
            "settings": {
                "deviceName": "डिवाइस का नाम:",
                "simulationObd": "सिमुलेशन OBD",
                "original": "मौलिक",
                "pollingHigh": "4 हर्ट्ज (उच्च)"
            }
        }
    }
}

updated = []

for fname in sorted(os.listdir(LOCALES_DIR)):
    if not fname.endswith(".json"):
        continue
    lang = fname[:-5]
    fpath = os.path.join(LOCALES_DIR, fname)
    
    lang_translations = DATA_TO_SYNC.get(lang, DATA_TO_SYNC["en"])
    
    with open(fpath, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    changed = False
    
    # 1. Update common.close
    if "common" not in data:
        data["common"] = {}
    data["common"]["close"] = lang_translations["common"]["close"]
    changed = True
    
    # 2. Update disconnectShort (both root level and connection block)
    data["disconnectShort"] = lang_translations["disconnectShort"]
    if "connection" not in data:
        data["connection"] = {}
    data["connection"]["disconnectShort"] = lang_translations["disconnectShort"]
    changed = True
    
    # 3. Update bento.settings
    if "bento" not in data:
        data["bento"] = {}
    if "settings" not in data["bento"]:
        data["bento"]["settings"] = {}
        
    for k, v in lang_translations["bento"]["settings"].items():
        data["bento"]["settings"][k] = v
        changed = True
        
    if changed:
        with open(fpath, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
            f.write("\n")
        updated.append(lang)

print(f"Successfully updated/synced translation files for {len(updated)} languages.")
