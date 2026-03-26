#!/usr/bin/env bash

# 1. Adım: Apple sunucusundaki gizli değişkeni alıp dosyaya yazıyoruz
if [ -n "$GOOGLE_SERVICES_INFO" ]; then
    echo "GoogleService-Info.plist oluşturuluyor..."
    echo "$GOOGLE_SERVICES_INFO" > ../GoogleService-Info.plist
else
    echo "HATA: GOOGLE_SERVICES_INFO değişkeni bulunamadı!"
    exit 1
fi

# 2. Adım: Bağımlılıkları yükle (CocoaPods vb.)
cd ..
npm install
cd ios
pod install
