#!/usr/bin/env bash

# 1. Adım: Projenin ana dizinine (root) tam olarak çıkıyoruz
cd ../..

# 2. Adım: Gizli anahtarı alıp doğru yere, ana dizine oluşturuyoruz
if [ -n "$GOOGLE_SERVICES_INFO" ]; then
    echo "GoogleService-Info.plist oluşturuluyor..."
    echo "$GOOGLE_SERVICES_INFO" > GoogleService-Info.plist
else
    echo "HATA: GOOGLE_SERVICES_INFO değişkeni bulunamadı!"
    exit 1
fi

# 3. Adım: Ana dizinde olduğumuz için npm install artık sorunsuz çalışacak
echo "NPM paketleri kuruluyor..."
npm install

# 4. Adım: Tekrar iOS klasörüne girip Pod'ları kuruyoruz
echo "Pod'lar kuruluyor..."
cd ios
pod install