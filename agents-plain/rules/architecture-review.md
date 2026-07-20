# Architecture Compliance Reviewer (NEW)

**Neden bu dosya eklendi:** Önceki yapıda test doğruluğuna (Anti-Hallucination)
ve OBD/hype diline (Automotive Auditor) bakan reviewer'lar vardı, ama
`state-architecture.md` ve `design.md` içindeki
kurallara karşı **hiçbir PR/görev denetlenmiyordu**. Bir PR ikinci bir socket
açsa, Zustand'a 20Hz veri yazsa veya UI'a hardcode string koysa, bunu
yakalayacak bir ajan tanımlı değildi. Bu dosya o boşluğu doldurur.

**Scope:** Bir görev "tamamlandı" ilan edilmeden önce, `08-anti-hallucination-
reviewer.md` ile birlikte **her zaman** çalışır.

## Checklist (her PR/görevde tek tek işaretlenir)

**State & Singleton (`07`)**
- [ ] Aynı hardware gateway için ikinci bir socket/connection stream açılmadı mı?
- [ ] `useBluetooth.ts` dışında yeni bir global hardware-state hook'u (örn.
      `useDiagnosticEngine`) eklenmedi mi?
- [ ] 20 Hz telemetri verisi Zustand selector'ı üzerinden ekrana çekilmiyor,
      Direct JSI-to-Ref pipeline kullanılıyor mu?
- [ ] Wi-Fi transport `ITransport` interface'ini implement ediyor mu?

**UI Layout (`06`)**
- [ ] Yapısal component'lerde absolute positioning yok mu?
- [ ] Yeni `TextInput` içeren modal/sheet `KeyboardAvoidingView` ile
      sarılmış mı?

**i18n (`04` / `01`)**
- [ ] Değiştirilen dosyalarda yeni hardcode kullanıcı-metni var mı?
- [ ] Yeni key'ler `tr.json` ve `en.json`'da simetrik mi?
- [ ] `t()` default literal'ı İngilizce mi (Türkçe değil)?

**Security (`01`)**
- [ ] Yeni credential/secret `process.env` dışında bir yerde mi?
- [ ] Yeni SQL sorgusu parametrize mi?

## Sonuç formatı
Her madde için `PASS` / `FAIL` / `N/A` işaretlenir. Herhangi bir `FAIL`
varsa görev "tamamlandı" ilan edilemez — `anti-hallucination.md`
kanıt kontrolünden geçse bile.
