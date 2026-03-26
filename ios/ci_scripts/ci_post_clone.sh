#!/usr/bin/env bash

# 1. Adım: Ana dizine çık
cd ../..

# 2. Adım: Node.js kontrolü (Hızlandırma)
if ! command -v node &> /dev/null; then
    echo "Node.js bulunamadı, kuruluyor..."
    brew install node
else
    echo "Node.js zaten yüklü: $(node -v)"
fi

# 3. Adım: Plist dosyalarını yerleştir
if [ -n "$GOOGLE_SERVICES_INFO" ]; then
    echo "GoogleService-Info.plist dosyaları yerleştiriliyor..."
    echo "$GOOGLE_SERVICES_INFO" > GoogleService-Info.plist
    echo "$GOOGLE_SERVICES_INFO" > ios/GoogleService-Info.plist
    echo "$GOOGLE_SERVICES_INFO" > ios/MotoCortex/GoogleService-Info.plist
else
    echo "HATA: GOOGLE_SERVICES_INFO değişkeni bulunamadı!"
    exit 1
fi

# 4. Adım: NPM kurulumu
npm install

# 5. Adım: Pod kurulumu (Hata toleranslı/Retry mekanizmalı)
echo "Pod'lar kuruluyor..."
cd ios
n=0
until [ "$n" -ge 3 ]
do
   pod install && break
   n=$[$n+1]
   echo "Pod install başarısız oldu, tekrar deneniyor ($n/3)..."
   sleep 5
done

if [ "$n" -ge 3 ]; then
  echo "HATA: Pod install 3 denemeden sonra başarısız oldu."
  exit 1
fi