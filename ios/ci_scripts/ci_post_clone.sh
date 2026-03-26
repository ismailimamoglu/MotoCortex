#!/usr/bin/env bash

# 1. Adım: Projenin ana dizinine (root) tam olarak çıkıyoruz
cd ../..

# 2. Adım: Apple sunucusuna Node.js kuruyoruz (Kritik Adım)
echo "Node.js kuruluyor..."
brew install node

# 3. Adım: Gizli anahtarı alıp doğru yere oluşturuyoruz
if [ -n "$GOOGLE_SERVICES_INFO" ]; then
    echo "GoogleService-Info.plist oluşturuluyor..."
    echo "$GOOGLE_SERVICES_INFO" > GoogleService-Info.plist
else
    echo "HATA: GOOGLE_SERVICES_INFO değişkeni bulunamadı!"
    exit 1
fi

# 4. Adım: Artık npm komutunu tanıyacağı için paketleri kurabiliriz
echo "NPM paketleri kuruluyor..."
npm install

# 5. Adım: Tekrar iOS klasörüne girip Pod'ları kuruyoruz
echo "Pod'lar kuruluyor..."
cd ios
pod install