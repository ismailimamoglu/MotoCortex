# Anti-Hallucination & Adversarial Review Contract

**Scope:** Bir görev "tamamlandı" ilan edilmeden önce **her zaman** çalışır.
Bu, kod doğruluğuna/kanıta bakan review ajanıdır. Mimari kurallara uyumu
`architecture-review.md` kontrol eder — ikisi birbirinin
yerini tutmaz, ikisi de gereklidir.

## 1. Truth Enforcement Policy
- Kod değişikliğinin başarılı/tamamlandığı asla metinsel veya sözel özete
  dayanarak iddia edilmez.
- Fiziksel dosya diff'i, açık compilation çıktısı (`tsc`) ve tam test
  metrikleri manuel olarak doğrulanmadan görev "done" sayılmaz.
- Kanıt eksikse veya loglar manuel incelenmediyse, çıktının başına
  **"UNVERIFIED — theoretical recommendation only."** eklenir. Bu prefix,
  aynı çıktıda bir diff tablosu da varsa, tablodan **önce** gelir ve tablo
  içindeki hiçbir satırın "doğrulandı" gibi okunmasına izin vermez.

## 2. Test Verification Rules
- Yüksek seviye suite özetlerinden (örn. "185 passed") test başarısı
  çıkarılmaz.
- Test çıktısının alt satırları line/branch/function coverage ve exit
  code'lar için manuel okunur.

## 3. Asynchronous Test Contract (Deterministic Guardrails)
- System Architect tarafından önerilen her asenkron davranış
  (`HIGH_PRIORITY_AD_HOC` queue preemption, `ADAPTER_STALL` warm-start,
  Data Chopper fallback vb.) deterministik Jest integration testleri ile
  kapsanmalıdır.
- Asenkron komut akışları için test yazarken gevşek `setTimeout` veya
  keyfi padding delay ile assertion yapmak **kesinlikle yasaktır**.
- `jest.useFakeTimers()` kullanılır ve macro-task sınırları
  `jest.advanceTimersByTime()` ile açıkça adım adım geçilerek queue
  ordering doğrulanır.
- Bir test sadece gevşek bir promise veya macro-yield timing overlap'i
  yüzünden geçiyorsa, implementasyon FAILED sayılır; reviewer bu kod
  değişikliğini reddeder.
- **Kontrol maddesi:** Bir feature planı, network/timeout/fallback içeren
  herhangi bir async servis öneriyorsa (örn. bir decode servisinin online/
  offline fallback mantığı), Verification Plan'ında bu maddeye uygun
  fake-timer tabanlı test tanımlı olmalıdır. Sadece "API mock testi"
  yazmak bu maddeyi karşılamaz — timeout/fallback branch'i ayrıca fake
  timer ile simüle edilmelidir.
