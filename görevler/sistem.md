## **Adım Adım Token Diyeti ve Emergent Operasyon Planı**

Senin yerel terminal CLI araçlarını (Gemini CLI / Antigravity) kullanarak token yakacak gereksiz yükleri temizleyecek ve ardından her modülü izole oturumlarda inşa edeceğiz.

### **🛑 Adım 2: Fazla Token Yakacak Dosyaları Temizleme (Repository Pruning)**

Emergent'a reponun linkini vermeden önce, tarayıcı robotların native derleme klasörlerini, log kırıntılarını ve test raporlarını okuyarak bağlam penceresini (context window) şişirmesini engellemeliyiz.

Mac Mini terminalinde, `feature/diagnostic-core-v5` dalındayken şu komutları sırasıyla koşturarak uzak sunucu üzerindeki gereksiz yükleri temizle:

\# 1\. Yerel build kırıntılarını git indexinden temizle (Yerel dosyalarını silmez, sadece git takibinden çıkarır)  
git rm \-r \--cached android/app/build/ 2\>/dev/null  
git rm \-r \--cached ios/build/ 2\>/dev/null  
git rm \-r \--cached .expo/ 2\>/dev/null

\# 2\. Varsa devasa log ve test coverage dosyalarını index dışı bırak  
git rm \-r \--cached coverage/ 2\>/dev/null  
git rm \--cached \*.log 2\>/dev/null

\# 3\. Değişiklikleri mühürle ve izole daldan uzak sunucuya gönder  
git commit \-m "chore: prune heavy build artifacts and logs for token efficiency"  
git push origin feature/diagnostic-core-v5  
