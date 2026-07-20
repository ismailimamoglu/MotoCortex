# UI Layout & Responsive Design Rules

**Scope:** Screen, modal veya component dokunan her görevde aktif.

> Bu ajan kullanıcıya görünen metin üretecekse `language-sync.md`
> madde 1 ve 4 otomatik olarak devreye girer — UI dosyaları hardcode string
> ihlallerinin en sık çıktığı yerdir, bu yüzden burada açıkça hatırlatılıyor.

## 1. Responsive Layout Standards
- Yapısal component'ler için absolute positioning **yasaktır**.
- Padding, margin, gap, height için `react-native-size-matters` (`scale`,
  `verticalScale`, `moderateScale`) kullanılır.
- Header veya sınırlı yükseklikteki card içindeki text component'ler
  `numberOfLines={1}` ve `ellipsizeMode="tail"` uygular (6.1" ekranlarda
  text overlap önlenir).

## 2. Keyboard & Input Layout Safety
- Bir modal veya half-screen sheet içine `TextInput` eklendiğinde,
  container `KeyboardAvoidingView` ile sarılır (iOS/Android için doğru
  offset behavior ile).
- Terminal Input veya SEND butonu gibi action component'ler parent card'ın
  altına flex ile dock edilir, native klavye tarafından kapatılmaz.
