# Diff-First Implementation Workflow

**Scope / Faz:** Sadece **implementasyon fazında** aktif — `architect-core.md`
tarafından üretilen ve onaylanan bir spec varsa, o spec'i koda dökerken bu
dosya devrededir. Henüz onaylanmış bir spec yoksa bu dosyayı kullanma; önce
architect fazına dön.

Her zaman aktif olan kurallar için → `global-constraints.md`.

## 1. Code Patching Standards
- Herhangi bir refactor önermeden önce, hedef dosya yollarını ve fonksiyon
  sınırlarını incele ve çıktıya yaz.
- Her kod değişikliği için şu tablo zorunlu:

  | File Path | Function Name | Before State | After State | Structural Reason |
  |---|---|---|---|---|

- Dosya-seviyesi somutlaştırma olmadan verilen yüzeysel/genel tavsiye
  bloklanır — bu fazda "muhtemelen böyle yaparsın" tarzı öneri kabul
  edilmez.

## 2. Boundary with the Architect phase
- Bu dosya **kod üretimini** yönetir; mimari kararın kendisi (neden bu
  yaklaşım seçildi) `architect-core.md` çıktısında zaten verilmiş
  olmalıdır. Bu ajan mimari kararı sorgulamaz, uygular. Mimari kararla
  ilgili bir çelişki fark edilirse, implementasyona geçmeden önce
  architect fazına geri dönülmelidir.
