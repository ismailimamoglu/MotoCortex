# UI Layout & Responsive Design Rules

**Scope:** Screen, modal veya component dokunan her görevde aktif.

> Bu ajan kullanıcıya görünen metin üretecekse `language-sync.md`
> madde 1 ve 4 otomatik olarak devreye girer — UI dosyaları hardcode string
> ihlallerinin en sık çıktığı yerdir, bu yüzden burada açıkça hatırlatılıyor.

## 1. Responsive Layout Standards
- Yapısal component'ler için absolute positioning **yasaktır**.
- **Absolute Positioning İstisna Koşulları**: Absolute pozisyonlama yalnızca yapısal olmayan katmanlar (tam ekran yükleme overlay'leri, "Önerilen/PRO" gibi köşe etiketleri, dekoratif arka plan gradyanları veya oscilloscope/canvas gibi özel çizim grafikleri) için serbesttir. Bu istisnai durumlarda `top`, `end`, `bottom`, `start` gibi koordinatlar sabit piksel değil, `useResponsive()` kancası veya `react-native-size-matters` ile ölçeklenmelidir.
- Padding, margin, gap, height için `react-native-size-matters` (`scale`,
  `verticalScale`, `moderateScale`) veya projedeki `useResponsive` kancası (`scaleWidth`, `scaleHeight`, `scaleMod`) kullanılır.
- Header veya sınırlı yükseklikteki card içindeki text component'ler
  `numberOfLines={1}` ve `ellipsizeMode="tail"` uygular (6.1" ekranlarda
  text overlap önlenir).

## 2. RTL (Right-to-Left / Sağdan Sola) Uyum Kuralları
- Arapça gibi sağdan sola (RTL) okunan dillerde yerleşim kaymalarını önlemek için yön kilitleyen stil özellikleri (`marginLeft`, `marginRight`, `paddingLeft`, `paddingRight`, `left`, `right`) yerine **RTL uyumlu** özellikler (`marginStart`, `marginEnd`, `paddingStart`, `paddingEnd`, `start`, `end`) kullanılmalıdır.
- Dil değişimi gerçekleştiğinde (`App.tsx` language useEffect) `I18nManager.allowRTL(isRTL)` ve `I18nManager.forceRTL(isRTL)` çağrıları yapılarak uygulamanın ayna yerleşimi tetiklenmeli ve arayüzün kararlı yüklenmesi için uygulama paketi (`Updates.reloadAsync()`) yeniden yüklenmelidir.

## 3. Keyboard & Input Layout Safety
- Bir modal veya half-screen sheet içine `TextInput` eklendiğinde,
  container `KeyboardAvoidingView` ile sarılır (iOS/Android için doğru
  offset behavior ile).
- Terminal Input veya SEND butonu gibi action component'ler parent card'ın
  altına flex ile dock edilir, native klavye tarafından kapatılmaz.
