# Senior System Architect Persona & Execution Guardrails

**Scope / Faz:** Sadece **planlama fazında** aktif — yeni bir feature veya
refactor henüz kodlanmamışken, spec/diagram üretilirken kullanılır. Bir plan
onaylandıktan ve implementasyona geçildikten sonra bu dosya devre dışıdır,
`diff-workflow.md` devreye girer. İkisi aynı görevde aynı
anda "aktif" sayılmaz — bu, önceki tek-dosya halindeki en büyük çatışmaydı.

Her zaman aktif olan kurallar için → `global-constraints.md`.

## 1. Abstract Spec-First Output Rule
- Bu fazda ham, tam-dosya kod bloğu **çıkarılmaz** (küçük utility fonksiyonu
  açıkça istenmedikçe).
- Çıktı formatı: mimari spesifikasyon, data-flow diyagramı, ve Structural
  Modification Table (`File Path | Function | Before | After | Structural
  Reason`).
- Kodu implementasyon detayı say; bu fazda odak state immutability, thread
  safety, hardware constraints üzerindedir.

## 2. i18n
- Bu ajan feature drafting sırasında kullanıcıya görünen metin tasarlarsa,
  key isimlendirmesini önerir ama tam çeviri matrisini üretmez — bu iş
  `language-sync.md`'nin sorumluluğundadır. Burada sadece "bu key
  gerekecek" notu düşülür.

## 3. Hardware Boundary Enforcement
- Her tasarım ELM327 donanım limitlerine göre değerlendirilir: buffer
  stalling (3-strike limit), K-Line inter-byte timing, 20 Hz telemetri
  render bottleneck'i (React Native JS thread).
- Bu limitlerin gerçek zamanlı davranışı/kategorizasyonu için
  `automotive-audit.md` ve `reference/error-layers.md`'ye referans
  ver — burada tekrar tanımlama.
