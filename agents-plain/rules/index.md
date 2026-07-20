# .agents/rules — Index & Load Order

Bu klasördeki her dosya ayrı bir ajan/persona'yı temsil eder. Eskiden hepsi tek bir
`agent.md` içindeydi; bu bölünme üç somut sorunu çözer:

1. **Faz çatışması** — "System Architect" (kod yazma, sadece spec) ile
   "Diff-First Implementation Workflow" (her değişiklik için dosya/fonksiyon
   tablosu zorunlu) aynı anda aktif olduğunda birbirini iptal ediyordu.
   Artık her dosyanın başında **"Scope / Faz"** satırı var — hangi ajan hangi
   fazda devrede, açıkça yazılı.
2. **Silolanmış cross-cutting kurallar** — i18n, secret yönetimi, SQL
   parametrizasyonu gibi kurallar sadece bir ajanda yazılıydı; UI/State
   ajanları bunlardan habersizdi. Artık bunlar `global-constraints.md`
   içinde ve **her ajan dosyasının en üstünde bu dosyaya referans var.**
   Bu dosya, hangi ajan çağrılırsa çağrılsın her zaman context'e dahil
   edilmelidir.
3. **Tanımsız taksonomiler** — "6-tier command classification", "7-layer
   error taxonomy" gibi isimler geçiyordu ama karşılığı yoktu. Artık
   `reference/` altında somut dosyalar var.

## Yükleme sırası (her görevde)

| Sıra | Dosya | Ne zaman |
|---|---|---|
| Her zaman | `global-constraints.md` | Her görevde, ajan ne olursa olsun |
| Planlama fazı | `architect-core.md` | Yeni bir feature/refactor tasarlanırken |
| Implementasyon fazı | `diff-workflow.md` | Onaylanmış bir spec kodlanırken |
| i18n dokunan her görev | `language-sync.md` | UI metni, hata mesajı, key eklenen her görev |
| OBD/ECU/transport dokunan görev | `automotive-audit.md` | Transport, protokol, komut sınıflandırma |
| UI dosyası dokunan görev | `design.md` | Ekran/modal/component değişikliği |
| State/hook/native modül dokunan görev | `state-architecture.md` | Zustand, BLE, JSI, transport hook değişikliği |
| Merge/PR öncesi (doğruluk) | `anti-hallucination.md` | Bir görev "tamamlandı" denmeden önce |
| Merge/PR öncesi (mimari uyum) | `architecture-review.md` | Bir görev "tamamlandı" denmeden önce |

**Kural:** 02 ve 03 aynı anda tek bir mesajda "aktif" olamaz — biri planlama
çıktısı, biri implementasyon çıktısı üretir. Bir görev önce 02 ile plan
üretir, plan onaylanınca 03'e geçilir.

**Kural:** 08 ve 09, görevin "bitti" ilan edilmesinden önce ikisi de mutlaka
çalıştırılır — 08 test/kanıt doğruluğuna, 09 mimari kurallara (singleton,
Zustand kullanımı, i18n hardcode, responsive layout) bakar. Biri diğerinin
yerini tutmaz.

## Referans taksonomiler (`reference/`)

- `reference/command-classification.md` — OBD komut sınıflandırma (6 seviye)
- `reference/error-layers.md` — Diagnostik hata katmanları (7 seviye)

## Plan dosyaları

Tek seferlik feature planları (örn. Vehicle Identity Engine) bu klasörde
**değil**, `.agents/plans/` altında tutulur. Kural dosyaları kalıcıdır,
plan dosyaları bir feature tamamlanınca arşivlenebilir.
