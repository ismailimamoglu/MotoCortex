"Uygulamanın UI (Arayüz) mimarisi farklı telefon boyutlarında ve tabletlerde bodoslama çöküyor. Web mantığını bırakıp, gerçek bir mobil responsive (Duyarlı) şasi kurmak için kodu şu 3 KESİN kurala göre refaktör et:

1. [Sistem Şok Emicisi - Font Sınırı]: Kullanıcıların OS ayarlarından fontları %200 büyütüp tasarımı patlatmasını engellemek zorundayız. Projenin en kök dosyasına (App.tsx veya index.js) girip şu global zırhı ekle: 
Text.defaultProps = Text.defaultProps || {};
Text.defaultProps.allowFontScaling = false; 
(Aynı kuralı TextInput için de uygula VEYA maxFontSizeMultiplier={1.1} olarak sınırla). İşletim sistemi tasarımı bozamaz.

2. [Matematiksel Ölçeklendirme (Size Matters)]: react-native-size-matters mantığını (veya muadili bir scale, verticalScale, moderateScale fonksiyon setini) sisteme entegre et. Tailwind konfigürasyonunu veya StyleSheet'leri sabit piksellerden kurtar. Objelerin ekranla birlikte doğrusal büyümesini, ancak tabletlerde kontrolden çıkmamasını sağlamak için özellikle 'moderateScale' kullan. width: 100 yerine width: moderateScale(100) mantığına geç.

3. [Tablet Kırılma Noktaları (Breakpoints)]: 11-15 inç tabletleri, uzatılmış bir telefon ekranı gibi gösteremezsin. useWindowDimensions kancası ile ekran genişliğini (width) dinle. Eğer width > 600dp ise (Tablet Modu); uygulamanın ana gösterge ekranındaki (Dashboard) flex-col dizilimini, flex-row ve flex-wrap yapısına (Grid) çevir. Objeler tablette büyümesin, yan yana dizilsin.

Bu 3 global UI kuralını sisteme entegre et ve bana sadece bu mimariyi yöneten güncellenmiş kök dosyaların (App.tsx, UI Helper/Config vb.) kodlarını sun."