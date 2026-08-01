# Global OBD2/UDS Nihai Mimari Planı — Son İnceleme

**İncelenen belge:** `Global_OBD2_Nihai_Mimari_Plani.md`

---

## 1. Genel Değerlendirme

Bu plan, önceki iki raporda tespit edilen tüm bulguları (ATWS sabotajı, `0100` eksikliği, eksik protokoller, RX loglama) doğru şekilde birleştirmiş ve K-Line zaman aşımı, retry mantığı, NRC `0x78` toleransı gibi önemli ek detaylarla olgunlaştırmış. Genel mimari (4 keşif motoru + bulut öğrenme grafı) tutarlı ve önceki tartışmalarımızla uyumlu. Ama **Bölüm 5'te, önceki bir belgeyle doğrudan çelişen ve önemli bir güvenlik bağlamı taşıyan bir tutarsızlık var.**

---

## 2. Kritik Bulgu: ECU Discovery Engine Header Adresleri, Uygulamanın Kendi Belgesiyle Çelişiyor

Bölüm 5, "ECU Discovery Engine" için şu adresleri listeliyor:

```
07 E2 / 07 EA  → ABS / Brake
07 E3 / 07 EB  → Airbag / SRS
07 E4 / 07 EC  → BCM / Body Controller
```

Ama bundan birkaç rapor önce incelediğimiz `veriokuma.md` belgesinde, **uygulamanızın kendi dokümante edilmiş mimarisinde** bu modüller için şu adresler vardı:

```
ABS / ESC     → 7D0 / 7D8
SRS / Airbag  → 770 / 778
BCM           → 720 / 728
```

**Bu iki belge aynı üç modül için tamamen farklı adresler veriyor.** Bu, tesadüfi bir yazım hatası olmaktan çok, dikkat çekici bir örüntü taşıyor: yeni listede adresler `7E0, 7E1, 7E2, 7E3, 7E4` şeklinde **düzenli, ardışık bir sırayla** artıyor — bu, önceki ECU veritabanı incelememde "şablon/tahmin verisi" işareti olarak işaretlediğim tam olarak aynı örüntü (hatırlarsanız, o incelemede "aşırı düzenli, ardışık numaralandırma" gerçek reverse-engineering verisinin değil, bir şablonun izi olarak değerlendirilmişti).

**Bu neden önemli:** ABS ve Airbag modülleri, konuşmamız boyunca **yazma erişiminin kesinlikle engellenmesi gereken** güvenlik-kritik modüller olarak ele alındı. Eğer "ECU Discovery Engine" bu yanlış/tahmini adresleri (`7E2`, `7E3`, `7E4`) kullanacak şekilde kodlanırsa:
- Gerçek araçlarda bu adresler farklı modüllere ait olabilir (ya da hiçbir modüle karşılık gelmeyebilir) — tarama yanlış/anlamsız sonuç döndürür.
- Daha da önemlisi, bu adresler ileride **güvenlik hard-block mantığıyla karşılaştırılacaksa**, hard-block'un koruduğu adres (muhtemelen `veriokuma.md`'deki gerçek `7D0`/`770`) ile Discovery Engine'in kullandığı adres (`7E2`/`7E3`) **eşleşmeyebilir** — bu da güvenlik kontrolünün sessizce devre dışı kalması riski taşır.

**Öneri:** Bölüm 5'teki ECU Discovery Engine adreslerini, `veriokuma.md`'de zaten dokümante edilmiş ve muhtemelen gerçek araçlarla doğrulanmış olan `7D0/7D8` (ABS), `770/778` (Airbag), `720/728` (BCM) değerleriyle **değiştirin.** Bu, kodlamaya geçmeden önce mutlaka netleştirilmesi gereken bir tutarsızlık — iki belgeden hangisinin doğru olduğu tek bir kaynağa (muhtemelen `veriokuma.md`) indirgenmeli.

---

## 3. İkinci Not: "AT TP Yerine AT SP" Kuralı — Altta Yatan Öneri Doğru, İstatistik Doğrulanmamış

Bölüm 3, Kural 1'de şu iddia var: "Piyasadaki sahte/klon ELM327 çiplerinin **%40'ı** `AT TP` komutunu desteklemez." Bu spesifik yüzde, konuşmamız boyunca birkaç kez karşılaştığımız "kaynaksız ama kesin görünen istatistik" örüntüsüne benziyor — bu rakamın nereden geldiği belirtilmemiş.

**Bunu engelleyici bulmuyorum** çünkü altta yatan mühendislik önerisi (daha yaygın desteklenen `AT SP` komutuna geçmek) kendi başına makul ve düşük riskli bir karar — `%40` rakamı doğru olsun ya da olmasın, `AT SP`'ye geçmenin bir zararı yok. Ama bu rakamı bir "ölçülmüş veri" gibi belgelere/sunumlara taşımaktan kaçının; sadece "daha geniş uyumluluk için AT SP tercih edildi" şeklinde ifade etmeniz, ileride birinin bu spesifik yüzdeyi doğrulamaya çalışıp bulamaması durumunu önler.

---

## 4. Planın Geri Kalanı — Onaylıyorum

- K-Line zaman aşımı genişletmesi (4000-5000ms), `BUS INIT ERROR` sonrası 500ms quiet time + 1 retry, NRC `0x78` için 5000ms sabır toleransı — hepsi teknik olarak tutarlı ve önceki tartışmalarımızla uyumlu.
- State-machine akış şeması (Bölüm 4) doğru sıralanmış: önce auto-detect, sonra ATWS'siz fallback matrisi, sonra OEM UDS fallback.
- Dört keşif motoru (Protocol/ECU/Capability/Adapter) mantıklı bir katmanlama; Adapter Reputation Engine'in skor bantları (Genuine/Vgate/Clone/Low-Grade) makul bir kategorilendirme.
- Bulut tabanlı öğrenme grafı ve OTA kural motoru, önceki telemetri planlarımızla tutarlı; burada tekrar etmiyorum çünkü o planlarda zaten minimum örneklem eşiği ve insan onayı gibi güvenlik önlemlerini ayrıca ele almıştık.

---

## 5. Sonuç

Bu plan genel olarak sağlam ve kodlamaya geçmeye hazır — tek düzeltmem, **Bölüm 5'teki ECU Discovery Engine adreslerinin (`7E2/7E3/7E4`) `veriokuma.md`'de zaten dokümante edilmiş gerçek adreslerle (`7D0/770/720`) değiştirilmesi.** Bu, hem tarama doğruluğu hem de ABS/Airbag güvenlik hard-block'unun doğru adresi hedeflediğinden emin olmak için önemli. Bu tek değişiklik dışında plan kodlamaya geçmek için hazır.
