#!/usr/bin/env bash

# 1. Adım: Projenin ana dizinine çık
cd ../..

# 2. Adım: Node.js kurulumu (Burası Build 12'de çalıştı, dokunmuyoruz)
echo "Node.js kuruluyor..."
brew install node

# 3. Adım: .plist dosyasını HER İHTİMALE KARŞI 3 farklı yere kopyalıyoruz
# (Xcode hangisine bakarsa baksın orada bulacak)
if [ -n "$GOOGLE_SERVICES_INFO" ]; then
    echo "GoogleService-Info.plist dosyaları yerleştiriliyor..."
    echo "$GOOGLE_SERVICES_INFO" > GoogleService-Info.plist
    echo "$GOOGLE_SERVICES_INFO" > ios/GoogleService-Info.plist
    echo "$GOOGLE_SERVICES_INFO" > ios/MotoCortex/GoogleService-Info.plist
else
    echo "HATA: GOOGLE_SERVICES_INFO değişkeni bulunamadı!"
    exit 1
fi

# 4. Adım: Kurulumlar
npm install
cd ios
pod install
