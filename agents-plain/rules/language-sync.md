# Global Multilingual Synchronization & i18n Guardrails

**Scope:** Kullanıcıya görünen metin dokunan **her** görevde aktif — UI,
State Management, Architect fazı fark etmez. Bu dosya i18n için **tek
kaynak**tır; başka hiçbir ajan dosyası i18n kuralını kendi içinde tekrar
yazmaz, buraya referans verir.

Temel kural (özet) için → `global-constraints.md` madde 1. Detaylar
aşağıda.

## 1. Absolute Prohibition of Hardcoded UI Strings
- Hiçbir kullanıcıya görünen metin (error boundary, buton label, diagnostik
  açıklama, paywall dinamik template dahil) doğrudan UI layout component,
  screen, custom hook veya modal içine yazılamaz.
- Her metin `t('key')` veya eşdeğeri i18n instance üzerinden bağlanır.

## 2. 26-Language Matrix & Retroactive Audit
- Her görevde, değiştirilen dosya context'i üzerinde retroaktif audit
  yapılır: eski hardcode string'ler veya eksik i18n key'leri tespit edilip
  çıkarılır.
- Yeni bir localization key eklendiğinde, `tr.json` ve `en.json`'da
  simetrik olarak tanımlandığı doğrulanır.
- Kalan hedef diller (otomatik pipeline ile besleniyorsa) için yapılandırılmış
  bir JSON translation template snippet üretilir.

## 3. Typed Structural Integrity (Zero Translation Drift)
- Nested object hiyerarşileri tüm lokalize kaynak dosyalarında 1:1 eşleşir.
  `locales/tr.json` içinde `paywall.dtcTeaser` altına key eklendiyse, aynı
  yapı `en.json` ve diğer tüm üretilen dil vektörlerinde de olmalı.
- Kod içinde keyfi string sabiti tanımlanmaz. Dinamik parametre gerekiyorsa
  (`{{code}}`, `{{misfireCount}}`) interpolation token'ları JSON şemasının
  içinde tutulur, logic layer'da string slicing yapılmaz.

## 4. Base Language Enforcement (English Core for 26-Language Pivot)
- `t('key', 'Default Text')` içindeki default literal **her zaman
  İngilizce** — konuşma dili Türkçe olsa bile.
- Türkçe (veya başka bir dil) default literal olarak kullanılamaz. Bir dilde
  key eksikse fallback İngilizce'ye düşer, Türkçe'ye değil.

## 5. Automated Translation Vector Output
- Yeni bir feature eklendiğinde sadece `en.json` ve `tr.json` değil, kalan
  24 hedef dil (ar, cs, da, de, el, es, fi, fr, hi, hu, id, it, ja, ko, nl,
  no, pl, pt, ro, ru, sv, th, uk, zh) için de yapılandırılmış JSON
  translation template snippet üretilir, otomatik pipeline'ın boşluksuz
  ilerlemesi için.
