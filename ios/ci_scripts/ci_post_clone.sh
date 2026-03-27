#!/usr/bin/env bash
set -euo pipefail

# ============================================================
#  MotoCortex — Xcode Cloud ci_post_clone.sh
# ============================================================

echo "▸ ci_post_clone.sh başlatılıyor…"

# ------------------------------------------------------------------
#  Helper: retry wrapper
# ------------------------------------------------------------------
retry() {
    local max_attempts=$1
    local delay=$2
    shift 2
    local attempt=1

    while true; do
        echo "  ↳ Deneme $attempt/$max_attempts: $*"
        if "$@"; then
            return 0
        fi
        if (( attempt >= max_attempts )); then
            echo "  ✗ '$*' komutu $max_attempts denemeden sonra başarısız oldu."
            return 1
        fi
        attempt=$((attempt + 1))
        echo "  ⏳ $delay saniye bekleniyor…"
        sleep "$delay"
    done
}

# ==================================================================
#  1. ADIM — Proje kök dizinine çık
# ==================================================================
cd ../..
PROJECT_ROOT=$(pwd)
echo "▸ Proje kökü: $PROJECT_ROOT"

# ==================================================================
#  2. ADIM — Node.js kur (brew ile — Xcode Cloud'da en güvenilir yol)
# ==================================================================
echo "▸ Node.js kuruluyor (Homebrew)…"

# Homebrew'i bul
if [ -f "/opt/homebrew/bin/brew" ]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
elif [ -f "/usr/local/bin/brew" ]; then
    eval "$(/usr/local/bin/brew shellenv)"
fi

# Node yoksa brew ile kur
if ! command -v node &>/dev/null; then
    echo "  ↳ Node.js brew ile kuruluyor…"
    brew install node
fi

NODE_PATH=$(which node)
echo "  ✓ Node.js: $NODE_PATH ($($NODE_PATH -v))"
echo "  ✓ npm: $(npm -v)"

# ==================================================================
#  3. ADIM — GoogleService-Info.plist oluştur
# ==================================================================
echo "▸ GoogleService-Info.plist kontrol ediliyor…"

if [ -z "${GOOGLE_SERVICES_INFO:-}" ]; then
    echo "  ⚠ GOOGLE_SERVICES_INFO ortam değişkeni tanımsız — atlanıyor."
else
    PLIST_TARGETS=(
        "$PROJECT_ROOT/GoogleService-Info.plist"
        "$PROJECT_ROOT/ios/GoogleService-Info.plist"
        "$PROJECT_ROOT/ios/MotoCortex/GoogleService-Info.plist"
        "$PROJECT_ROOT/ios/MotoCortex/Supporting/GoogleService-Info.plist"
    )

    for target in "${PLIST_TARGETS[@]}"; do
        mkdir -p "$(dirname "$target")"
        echo "$GOOGLE_SERVICES_INFO" > "$target"
        echo "  ✓ Yazıldı: $target"
    done
fi

# ==================================================================
#  4. ADIM — npm install
# ==================================================================
echo "▸ npm paketleri kuruluyor…"
retry 3 10 npm install --prefer-offline --no-audit --no-fund

# ==================================================================
#  5. ADIM — CocoaPods install
# ==================================================================
echo "▸ Pod'lar kuruluyor…"
cd "$PROJECT_ROOT/ios"

export COCOAPODS_DISABLE_STATS=1
retry 3 10 pod install --repo-update

# ==================================================================
#  6. ADIM — NODE_BINARY'yi build phase'ler için kaydet
# ==================================================================
# pod install, .xcode.env dosyasını override edebilir.
# Bu yüzden pod install'DAN SONRA yazıyoruz.
cd "$PROJECT_ROOT"
NODE_PATH=$(which node)

echo "▸ NODE_BINARY ayarlanıyor: $NODE_PATH"

# Doğrulama
if [ ! -x "$NODE_PATH" ]; then
    echo "✗ HATA: Node bulunamadı: $NODE_PATH"
    exit 1
fi

# .xcode.env.local (öncelikli, build phase'ler bunu ilk okur)
echo "export NODE_BINARY=\"$NODE_PATH\"" > "$PROJECT_ROOT/ios/.xcode.env.local"
echo "  ✓ .xcode.env.local yazıldı"

# .xcode.env (yedek)
echo "export NODE_BINARY=\"$NODE_PATH\"" > "$PROJECT_ROOT/ios/.xcode.env"
echo "  ✓ .xcode.env yazıldı"

# Doğrulama: dosyalar gerçekten yazıldı mı?
echo "  ↳ .xcode.env.local içeriği: $(cat "$PROJECT_ROOT/ios/.xcode.env.local")"
echo "  ↳ .xcode.env içeriği: $(cat "$PROJECT_ROOT/ios/.xcode.env")"
echo "  ↳ Node test: $($NODE_PATH -e 'console.log("NODE OK")')"

# ==================================================================
#  Tamamlandı
# ==================================================================
echo ""
echo "═══════════════════════════════════════════"
echo "  ✓ ci_post_clone.sh başarıyla tamamlandı"
echo "═══════════════════════════════════════════"