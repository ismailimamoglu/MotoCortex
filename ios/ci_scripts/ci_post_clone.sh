#!/usr/bin/env bash
set -euo pipefail

# ============================================================
#  MotoCortex — Xcode Cloud ci_post_clone.sh
#  Optimized for speed, resilience, and security.
# ============================================================

echo "▸ ci_post_clone.sh başlatılıyor…"

# ------------------------------------------------------------------
#  Helper: retry wrapper  —  retry <max> <delay_sec> <command…>
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
# ci_scripts dizini ios/ci_scripts altında;  ../../ = proje kökü
cd ../..
PROJECT_ROOT=$(pwd)
echo "▸ Proje kökü: $PROJECT_ROOT"

# ==================================================================
#  2. ADIM — Node.js / npm'i bul veya hızlıca kur
# ==================================================================
echo "▸ Node.js aranıyor…"

# Xcode Cloud makinelerinde Node.js genellikle Homebrew veya
# önceki araçlar tarafından şu yollara kurulmuş olabilir:
CANDIDATE_PATHS=(
    "/usr/local/bin"
    "/opt/homebrew/bin"
    "$HOME/.nvm/versions/node"/*/bin
    "$HOME/.nodenv/shims"
    "/usr/local/opt/node/bin"
    "/usr/local/opt/node@20/bin"
    "/usr/local/opt/node@18/bin"
)

for p in "${CANDIDATE_PATHS[@]}"; do
    if [ -x "$p/node" ]; then
        export PATH="$p:$PATH"
        echo "  ✓ Node.js bulundu: $p/node ($(node -v))"
        break
    fi
done

# Hâlâ bulunamadıysa → hızlı binary indirme (brew'den ~10× daha hızlı)
if ! command -v node &>/dev/null; then
    echo "  ⚠ Node.js bulunamadı, binary indiriliyor…"
    NODE_VERSION="20.19.0"
    ARCH=$(uname -m)

    if [ "$ARCH" = "arm64" ]; then
        NODE_DIST="node-v${NODE_VERSION}-darwin-arm64"
    else
        NODE_DIST="node-v${NODE_VERSION}-darwin-x64"
    fi

    NODE_URL="https://nodejs.org/dist/v${NODE_VERSION}/${NODE_DIST}.tar.gz"
    NODE_DIR="$PROJECT_ROOT/.node_local"
    NODE_TMP="/tmp/${NODE_DIST}.tar.gz"

    mkdir -p "$NODE_DIR"
    echo "  ↳ İndiriliyor: $NODE_URL"

    # Önce dosyayı indir, sonra aç (pipe hatalarını önlemek için)
    retry 3 5 curl -fSL --connect-timeout 30 --max-time 180 -o "$NODE_TMP" "$NODE_URL"

    echo "  ↳ Arşiv açılıyor…"
    tar xzf "$NODE_TMP" -C "$NODE_DIR" --strip-components=1
    rm -f "$NODE_TMP"

    export PATH="$NODE_DIR/bin:$PATH"

    if ! command -v node &>/dev/null; then
        echo "✗ HATA: Node.js kurulamadı!"
        exit 1
    fi
    echo "  ✓ Node.js kuruldu: $(node -v)"
fi

echo "  ✓ npm sürümü: $(npm -v)"

# ==================================================================
#  3. ADIM — GoogleService-Info.plist oluştur (güvenlik kontrolü)
# ==================================================================
echo "▸ GoogleService-Info.plist kontrol ediliyor…"

if [ -z "${GOOGLE_SERVICES_INFO:-}" ]; then
    echo "✗ HATA: GOOGLE_SERVICES_INFO ortam değişkeni boş veya tanımsız!"
    echo "  Xcode Cloud → Workflow → Environment Variables içinde tanımlayın."
    exit 1
fi

PLIST_TARGETS=(
    "$PROJECT_ROOT/GoogleService-Info.plist"
    "$PROJECT_ROOT/ios/GoogleService-Info.plist"
    "$PROJECT_ROOT/ios/MotoCortex/GoogleService-Info.plist"
)

for target in "${PLIST_TARGETS[@]}"; do
    mkdir -p "$(dirname "$target")"
    echo "$GOOGLE_SERVICES_INFO" > "$target"
    echo "  ✓ Yazıldı: $target"
done

# ==================================================================
#  4. ADIM — npm install  (retry × 3)
# ==================================================================
echo "▸ npm paketleri kuruluyor…"
retry 3 10 npm install --prefer-offline --no-audit --no-fund

# ==================================================================
#  5. ADIM — CocoaPods install  (retry × 3)
# ==================================================================
echo "▸ Pod'lar kuruluyor…"
cd "$PROJECT_ROOT/ios"

# pod repo güncellemesini atla (cdn zaten varsayılan)
export COCOAPODS_DISABLE_STATS=1

retry 3 10 pod install --repo-update

# ==================================================================
#  6. ADIM — Xcode Build Phase'leri için NODE_BINARY yolunu kaydet
# ==================================================================
# Xcode build phase scriptleri (Bundle React Native code, Expo configure)
# ci_post_clone.sh'in PATH'ini devralmaz.
# Hem .xcode.env hem .xcode.env.local dosyalarına tam node yolunu yazıyoruz.
NODE_PATH=$(command -v node)
echo "▸ NODE_BINARY ayarlanıyor: $NODE_PATH"

# Doğrulama: node gerçekten çalışıyor mu?
if [ ! -x "$NODE_PATH" ]; then
    echo "✗ HATA: Node bulunamadı veya çalıştırılabilir değil: $NODE_PATH"
    exit 1
fi
echo "  ✓ Node.js doğrulandı: $($NODE_PATH -v)"

# .xcode.env.local → build phase'ler önce bunu okur
echo "export NODE_BINARY=\"$NODE_PATH\"" > "$PROJECT_ROOT/ios/.xcode.env.local"
echo "  ✓ .xcode.env.local güncellendi"

# .xcode.env → yedek olarak bunu da güncelle (command -v yerine sabit path)
cat > "$PROJECT_ROOT/ios/.xcode.env" << XCODE_ENV_EOF
# This .xcode.env file is versioned and is used to source the environment
# used when running script phases inside Xcode.
# Auto-generated by ci_post_clone.sh — do not rely on command -v in CI.
export NODE_BINARY="$NODE_PATH"
XCODE_ENV_EOF
echo "  ✓ .xcode.env güncellendi"

# /usr/local/bin/node symlink'i yoksa oluştur (build phase'ler bazen buraya bakar)
if [ ! -e "/usr/local/bin/node" ] && [ -x "$NODE_PATH" ]; then
    echo "  ↳ /usr/local/bin/node symlink oluşturuluyor…"
    sudo ln -sf "$NODE_PATH" /usr/local/bin/node 2>/dev/null || \
    ln -sf "$NODE_PATH" /usr/local/bin/node 2>/dev/null || \
    echo "  ⚠ Symlink oluşturulamadı (izin yok), devam ediliyor…"
fi

# npm'i de aynı dizinden erişilebilir yap
NPM_PATH=$(command -v npm)
if [ -n "$NPM_PATH" ] && [ ! -e "/usr/local/bin/npm" ]; then
    sudo ln -sf "$NPM_PATH" /usr/local/bin/npm 2>/dev/null || true
fi

# ==================================================================
#  Tamamlandı
# ==================================================================
echo ""
echo "═══════════════════════════════════════════"
echo "  ✓ ci_post_clone.sh başarıyla tamamlandı"
echo "═══════════════════════════════════════════"