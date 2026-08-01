Genel olarak plan sağlam ve önceki bulguları doğru birleştirmiş. Ama Bölüm 5'te önemli bir tutarsızlık var:

ECU Discovery Engine adresleri, uygulamanızın kendi belgesiyle çelişiyor. Bu plan ABS için 07E2/07EA, Airbag için 07E3/07EB, BCM için 07E4/07EC veriyor. Ama birkaç rapor önce incelediğimiz veriokuma.md'de (uygulamanızın kendi dokümante edilmiş mimarisi) bu modüller için 7D0/7D8 (ABS), 770/778 (Airbag), 720/728 (BCM) yazıyordu — tamamen farklı adresler.

Bunu tesadüf olarak görmüyorum çünkü yeni listedeki adresler (7E0, 7E1, 7E2, 7E3, 7E4) düzenli, ardışık bir sırayla artıyor — bu, önceki ECU veritabanı incelememde "şablon/tahmin verisi" işareti olarak işaretlediğim tam olarak aynı örüntü. Bu önemli çünkü ABS/Airbag, yazma erişiminin kesinlikle engellenmesi gereken güvenlik-kritik modüller olarak ele alınıyordu — eğer Discovery Engine yanlış adresi kullanırsa ve güvenlik hard-block'u gerçek adresi (7D0/770) koruyorsa, bu iki adres eşleşmeyebilir ve güvenlik kontrolü sessizce devre dışı kalabilir. Önerim: Bölüm 5'teki adresleri veriokuma.md'de zaten dokümante edilmiş gerçek değerlerle değiştirin.

Küçük bir not daha: "klon çiplerin %40'ı AT TP desteklemiyor" istatistiği, konuşmamız boyunca birkaç kez karşılaştığımız kaynaksız-ama-kesin-görünen rakam örüntüsüne benziyor. Altta yatan öneri (AT SP'ye geçmek) zararsız ve makul, o yüzden engelleyici değil — sadece bu rakamı "ölçülmüş veri" gibi sunmaktan kaçının.

Bu tek adres düzeltmesi dışında plan kodlamaya geçmek için hazır.