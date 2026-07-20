# Global Constraints (Always Active)

**Scope:** Bu dosya her ajanda, her görevde aktiftir. Aşağıdaki hiçbir madde
tek bir persona'ya özgü değildir — bir UI görevi de, bir state-management
görevi de, bir architect görevi de bunlara uymak zorundadır.

## 1. i18n — Base Rule (Single Source of Truth)
- Kullanıcıya görünen **hiçbir metin** doğrudan bir UI component, hook veya
  modal içine hardcode edilemez. Her metin `t('key', 'English Default')`
  (veya eşdeğeri) üzerinden bağlanır.
- `t()` içindeki default literal **her zaman İngilizce** yazılır — konuşma
  dili Türkçe olsa bile. Türkçe default literal yasaktır.
- Detaylı i18n kuralları (26 dil matrisi, key senkronizasyonu, interpolation
  token'ları) için → `language-sync.md`. Bu kural burada *sadece*
  özetlenmiştir; tam kural seti oradadır. Bu maddeyi başka bir dosyada
  tekrar yazma — buraya referans ver.

## 2. Secrets & Credentials
- Supabase/Firebase key, service role, encryption salt gibi hiçbir bilgi
  `src/` içine hardcode edilemez. Tüm credential'lar `process.env` üzerinden
  akar.

## 3. Database Access
- `expo-sqlite` ile yapılan tüm sorgular parametrize edilmiş binding
  kullanır (`executeAsync('SELECT * FROM garage WHERE id = ?', [id])`).
  Raw string concatenation ile SQL üretmek yasaktır.

## 4. Context-Bound Execution
- `src/core/` veya `src/api/` altında bir dosya değiştirilmeden önce, ilgili
  `.agents/rules/` alt kümesi (bu dosya + değişikliğin dokunduğu domain'in
  ajan dosyası) okunmalıdır. Bütün rule dosyalarını her göreve yüklemek
  context şişirir — sadece dokunulan domain'in dosyasını yükle.

## 5. Language & Certainty in Output
- Kesinlik/pazarlama dili yasaktır: "world class", "production ready",
  "fully completed", "sealed", "perfected", "kusursuz", "mühürlendi",
  "eksiksiz tamamlandı" ve benzeri ifadeler — dil (EN/TR) fark etmez, genel
  prensip: **kanıtlanmamış kesinlik iddiası kurma.**
- Bunun yerine ölçülebilir, kanıta dayalı ifadeler kullan: "12 testten 12'si
  geçti, coverage %87" gibi.

## 6. Undefined References Are Not Allowed
- Bir kuralda "6-tier classification", "7-layer error taxonomy" gibi bir
  taksonomiye atıfta bulunuluyorsa, bu taksonomi `reference/` altında somut
  bir dosyada tanımlı olmalıdır. Tanımsız bir taksonomiye göre "kontrol
  ettim" demek — kanıtsız iddiadır ve Madde 5'i ihlal eder.
