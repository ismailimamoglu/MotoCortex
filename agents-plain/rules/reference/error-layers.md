# Diagnostic Error Layers (7-Tier)

Bu dosya, `automotive-audit.md` madde 1'de referans verilen 7-katmanlı
hata sınıflandırmasının somut karşılığıdır.

| # | Katman | Kapsam | Tipik semptom |
|---|---|---|---|
| 1 | BLE transport | Bluetooth bağlantı/keşif/eşleşme | Bağlantı kopması, RSSI zayıflığı |
| 2 | UART integrity | Seri veri bütünlüğü, byte kayması | Checksum hatası, kısmi frame |
| 3 | ELM firmware quality | Klon/orijinal ELM327 firmware farkları | Yanlış/eksik AT komut cevabı |
| 4 | AT support | Adapter'ın desteklediği AT komut seti | '?' cevabı, timeout |
| 5 | Protocol detection | ISO9141-2 / KWP2000 / J1850 / ISO15765-4 handshake | Protokol otomatik tespit başarısız |
| 6 | ECU handshake | Araç ECU'sunun oturum açması | ECU cevap vermiyor, session reddi |
| 7 | PID telemetry | Veri okuma/parse aşaması | Yanlış PID değeri, birim hatası |

**Kullanım kuralı:** Bir hata raporlanırken önce hangi katmanda olduğu
belirlenir, sonra o katmana özel debug adımına geçilir (örn. katman 1-2
hardware/transport sorunuysa protokol tespiti (katman 5) ile vakit
kaybedilmez).
