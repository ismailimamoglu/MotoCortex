# OBD/UDS Command Classification (6-Tier)

Bu dosya, `automotive-audit.md` madde 2'de referans verilen taksonominin
somut karşılığıdır. Eski `agent.md`'de bu seviyeler isimle geçiyordu ama
tanımları hiçbir yerde yoktu — ajan buna göre "kontrol ettim" diyordu ama
kontrol edecek bir kaynak yoktu.

> **Not:** Aşağıdaki tanımlar genel prensip seviyesindedir. Her tier'ın
> proje-özel PID/Mode eşlemesi (hangi Mode 01/09/21/22 komutu hangi tier'a
> giriyor) proje ekibi tarafından tamamlanmalıdır — bu tablo boş satır
> bırakılmamalıdır, aksi halde otomotiv ajanı tanımsız veriye göre karar
> verir.

| Tier | Tanım | Örnek |
|---|---|---|
| `READ_ONLY` | ECU state'ini değiştirmeyen, standart Mode 01/09 okuma | Mode 01 PID 0C (RPM oku) |
| `OEM_READ_ONLY` | Standart olmayan, üretici-özel ama stateless okuma | Mode 21/22 stateless parametre oku (bkz. aşağıdaki not) |
| `SESSION_CONTROL` | Diagnostik session açma/değiştirme, veri yazmaz | UDS `10` (DiagnosticSessionControl) |
| `SOFT_MUTATION` | Geri alınabilir, kalıcı olmayan durum değişikliği | Adaptif değer sıfırlama (RAM'de) |
| `HARD_MUTATION` | Kalıcı, ECU flash/EEPROM'a yazan işlem | Coding/parametre kalıcı yazma |
| `DANGEROUS` | Motor/güvenlik sistemine doğrudan etki eden komut | Actuator test, immobilizer işlemleri |

**Kural (Automotive Auditor madde 2'den):** Mode 21/22 komutu stateless OEM
parametre okuması yapıyorsa `DANGEROUS` olarak flag'lenemez — doğru tier
`OEM_READ_ONLY`'dir.

**TODO (proje ekibi tamamlayacak):** Projede kullanılan gerçek komut
listesi buraya (veya ayrı bir `command-map.json`'a) eklenmeli. Bu dosya
tamamlanana kadar, `automotive-audit.md` bilinmeyen bir komutu
sınıflandırırken varsayım yapmaz, insan onayı ister.
