**[Strict Role & Authority]**
Sen, siber güvenlik ve kod güvenliği (App Sec) konusunda uzmanlaşmış 15 yıllık kıdemli bir Principal Software Engineer'sın. MotoCortex projesinde yapılan QA denetiminde 5.7/10 gibi kabul edilemez bir skor alınmıştır. Yayın öncesi bu kritik zafiyetleri derhal cerrahi bir operasyonla kapatacaksın. 

Aşağıdaki 4 maddeye MİLİMETRİK olarak uyacaksın. Belirtilen dosyaların dışındaki hiçbir mimariye, özellikle `src/api/OBDCommandQueue.ts` ve `src/hooks/useBluetooth.ts` dosyalarına KESİNLİKLE DOKUNMAYACAKSIN.

**1. Gelir Kaçağı Arka Kapısının İnfazı (`AboutView.tsx`)**
*   **Açık:** Kodun içinde hardcoded olarak bırakılan 'ömerfaruk' string'i ile PRO sürümün bedava açılması sağlanıyor. Bu ticari bir intihardır.
*   **Emir:** `AboutView.tsx` içindeki bu uydurma bypass şifresini KÖKÜNDEN SİL. PRO üyelik kontrolünü sadece ve sadece RevenueCat SDK'sından gelen resmi `customerInfo.activeSubscriptions` veya mühürlü store entitlement durumuna endeksle. Kodda hiçbir "arka kapı" string'i kalmayacak.

**2. Açılışta Çökme Kilidi (`supabaseClient.ts`)**
*   **Açık:** Çevre değişkenleri (`EXPO_PUBLIC_SUPABASE_URL` vb.) eksik olduğunda `createClient` senkron hata fırlatıyor ve uygulama daha açılmadan bodoslama çöküyor (`Error: supabaseUrl is required`).
*   **Emir:** `supabaseClient.ts` içindeki başlatma mantığını güvenli hale getir. Eğer env değişkenleri eksikse uygulama senkron hata fırlatıp crash olmasın; bunun yerine `null` bir istemci dönsün veya hatayı asenkron yakalayarak uygulamanın bir "Hata Arayüzü (Fallback UI)" ile açılmasını sağla.

**3. Global Koruma Kalkanı (`App.tsx`)**
*   **Açık:** Uygulamada hiçbir Error Boundary yok. Herhangi bir alt bileşendeki render hatası tüm uygulamayı kapatıyor.
*   **Emir:** Projeye `react-error-boundary` entegrasyonunu yap. `App.tsx` içindeki kök bileşeni (Root component) bu boundary ile sarmala. Uygulama çöktüğünde kullanıcının yüzüne kapanmak yerine, şık bir "Bir hata oluştu, lütfen uygulamayı yeniden başlatın" ekranı ve bir "Yeniden Dene" butonu gösterilsin.

**4. Kriptografik Unicode Çökmesi (SHA-256 Katmanı)**
*   **Açık:** Projedeki özel SHA-256 fonksiyonu Türkçe karakterlerde (Örn: "Motosiklet", "İşletim") veya Unicode string'lerde telemetri hash'ini bozuyor ve veri tabanında mükerrer kayıtlara sebep oluyor.
*   **Emir:** Kendi yazdığımız o uydurma SHA-256 fonksiyonunu tamamen sil. Yerine Expo'nun resmi ve native kütüphanesi olan **`expo-crypto`**'yu entegre et. Tüm hash işlemlerini `Crypto.digestStringAsync` üzerinden yürüt.

Bu 4 maddeyi eksiksiz tamamla, `npm run tsc --noEmit` kontrolünden geçir ve bana sadece değişen dosyaların diff yapısını sun. Başka hiçbir şeye dokunma.

