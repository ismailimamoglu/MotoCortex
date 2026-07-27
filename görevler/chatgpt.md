Evet, genel fikir doğru, fakat önemli bir ayrım var: AT WS'yi her fallback geçişinde standart bir “zorunlu reset” gibi kullanmanızı önermem. Ucuz v1.5 klonlar için bunu bir recovery katmanı olarak kullanmak daha doğru.

Kısa karar
Komut	Değerlendirme
AT ST FF	Evet, mantıklı — timeout'u artırır; ancak klonlarda FF gerçek ELM327 ile aynı yorumlanmayabilir
AT WS	Evet, recovery için kullanılabilir — fakat protokol geçişinden önce her zaman gerekli değil
AT SP 6	CAN 11-bit / 500 kbit/s için doğru
AT SP 5	KWP2000 Fast Init için doğru
AT PC	Bence eklenmeli — protokol oturumunu kapatıp temiz bir başlangıç sağlar
AT Z	Son çare recovery — tüm adaptörü yeniden başlatır
AT TP x / AT TP Ax	Fallback mimariniz için daha doğru bir alternatif olabilir

ELM327'nin resmi davranışında AT SP 0, bir sonraki OBD komutunda otomatik protokol araması başlatır ve SEARCHING... mesajı bu sürecin parçasıdır. Ancak belirli bir protokolü AT SP 5 veya AT SP 6 ile seçtiğinizde artık otomatik arama yapılmaz. AT TP ise protokolü deneyip başarısız olursa mevcut otomatik arama mantığını koruyabilen daha uygun bir mekanizmadır.

Benim önerdiğim fallback akışı
1. İlk deneme
AT SP 0
0100

Burada adaptör:

SEARCHING...

durumunda kalırsa, sizin uygulama tarafındaki transport watchdog devreye girmeli.

Örneğin:

SEARCHING... > 8-12 saniye

veya:

AT komutu gönderildi
↓
cevap yok
↓
timeout
↓
Bluetooth bağlantısı fiziksel olarak hâlâ açık

Bu durumda hemen AT WS göndermek yerine önce protokol oturumunu kapatmayı tercih ederim.

Önerilen Recovery Sequence
AT PC

Ardından:

AT ST FF

Sonra:

AT TP 6
0100

Başarısızsa:

AT PC
AT TP 5
0100

Başarısızsa:

AT PC
AT TP 7
0100

ve diğer protokoller.

Neden TP?

AT SP 6 doğrudan protokolü seçer. Bu, klonun mevcut başarısız initialization state'ini temizlemeden yeni protokole geçmeye çalışmasına neden olabilir.

AT TP 6 ise “bu protokolü dene” mantığına daha yakındır. ELM327 dokümantasyonunda TP, SP ile benzer şekilde protokol denemesi yapar; ancak başarılı protokolü kalıcı protokol olarak yazma davranışı farklıdır. Bu nedenle fallback taraması için mimari olarak daha uygundur.

AT WS nerede kullanılmalı?

Ben olsam şu şekilde kullanırım:

AT SP 0
0100
↓
SEARCHING timeout
↓
AT PC
↓
AT WS
↓
AT ST FF
↓
AT TP 6
0100

Eğer klonlarda AT PC sonrası hâlâ:

SEARCHING...

veya:

NO DATA

durumu düzgün temizlenmiyorsa:

AT WS

kullanılabilir.

Ancak burada kritik nokta şu:

AT WS, araç ECU'sunun “warm start” işlemi değildir. Adaptörün kendi protokol/OBD bağlantı durumunu yeniden başlatma mekanizmasıdır.

Dolayısıyla AT WS CAN bus üzerinde ISO 15765-4 standardının bir komutu değildir; ELM327 adaptörünün AT komutudur. Bu nedenle “otomotiv standardı gereği fallback halkasında bulunmalıdır” demek doğru olmaz. Standart uyumluluk açısından zorunlu değil, klon toleransı açısından pratik bir recovery aracıdır.

Benim daha güçlü önerim: AT PC + AT WS kombinasyonunu koşullu kullanın

MotoCortex için aşağıdaki recovery state machine'i öneririm:

┌─────────────────────────┐
│ AT SP 0                 │
└────────────┬────────────┘
             │
             ▼
        OBD Request
             │
             ▼
      SEARCHING...
             │
     ┌───────┴────────┐
     │                │
  SUCCESS          TIMEOUT
                       │
                       ▼
                   AT PC
                       │
                       ▼
                   AT WS
                       │
                       ▼
                 AT ST FF
                       │
                       ▼
                 AT TP 6
                       │
                  0100
                       │
       ┌───────────────┴──────────────┐
       │                              │
    SUCCESS                        FAIL
                                      │
                                      ▼
                                   AT PC
                                      │
                                      ▼
                                   AT TP 5
                                      │
                                    0100

Sonra:

TP 7
TP 8
TP 3
TP 4

gibi bir sıra.

Fakat burada araçtan gelen VIN, model/yıl bilgisi veya geçmişte başarıyla kullanılan protokol varsa, AT SP 0 ile başlamak yerine doğrudan:

AT TP 6

veya:

AT TP 5

ile başlamak daha iyi olur.

Bu, MotoCortex'un sizin geliştirdiğiniz Compatibility Intelligence Layer için de önemli: adaptörün her bağlantıda tüm protokol evrenini taramasını beklemek yerine, araç geçmişinden öğrenilmiş protokolü ilk sıraya alabilirsiniz.

Eklenmesini özellikle önerdiğim komut: AT DPN

Her başarılı protokol denemesinden sonra:

AT DPN

gönderin.

Örneğin:

AT TP 6
0100

başarılıysa:

AT DPN

cevabı:

A6

olmalıdır.

Bunu şu amaçlarla kullanabilirsiniz:

Detected Protocol: 6
Transport: CAN
CAN Speed: 500 kbit/s

Sonraki bağlantıda:

AT TP 6

ile başlayabilirsiniz.

Bu, AT SP 0 otomatik taramasının ucuz klonlarda oluşturduğu SEARCHING... riskini ciddi biçimde azaltabilir. ELM327 dokümantasyonunda AT DPN, aktif protokolü numarasıyla bildirmek için tanımlanmıştır.

Benim net önerim

MotoCortex için protokol keşif algoritması şu olsun:

1. Cached Protocol varsa
   ↓
   AT TP <cached>
   ↓
   0100
   ↓
   Success → AT DPN → lock protocol

2. Cached Protocol yoksa
   ↓
   AT SP 0
   ↓
   0100
   ↓
   Success → AT DPN → cache protocol

3. SEARCHING timeout
   ↓
   AT PC
   ↓
   AT WS
   ↓
   AT ST FF
   ↓
   AT TP 6
   ↓
   0100

4. Fail
   ↓
   AT PC
   ↓
   AT TP 5
   ↓
   0100

5. Fail
   ↓
   AT PC
   ↓
   AT TP 7 / 8 / 3 / 4
Son derece önemli bir ayrıntı

AT WS veya AT PC gönderildikten sonra hemen bir sonraki protokol komutunu göndermeyin. Ucuz klonlarda Bluetooth UART buffer'ı ve firmware state machine'i gecikmeli çalışabiliyor. Sizin daha önce belirlediğiniz strict sequential state machine + transport lock + guard time mimarisi burada kesinlikle korunmalı.

Ben başlangıçta şu aralıkları test ederdim:

AT PC
↓ 150–300 ms
AT WS
↓ 150–300 ms
AT ST FF
↓ 100–200 ms
AT TP 6
↓ 100–200 ms
0100

Ancak bu gecikmeleri sabit yapmak yerine adapter profile'a göre öğrenilebilir hale getirmek daha iyi olur.

Sonuç: AT WS + AT ST FF yaklaşımınız yanlış değil; hatta ucuz klonlar için faydalı bir recovery stratejisi. Fakat ben mimariyi AT WS merkezli değil, AT PC → (gerekirse AT WS) → AT ST FF → AT TP <protocol> şeklinde kurardım. Ek olarak AT DPN ile başarılı protokolü kaydedip sonraki bağlantılarda AT SP 0 aramasını mümkün olduğunca bypass etmek, MotoCortex için daha sağlam ve daha hızlı çözüm olur.