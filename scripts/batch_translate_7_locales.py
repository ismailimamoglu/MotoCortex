import json
import os
import re
import time
import urllib.request
import urllib.parse
from concurrent.futures import ThreadPoolExecutor

locales_dir = '/Users/ismailimamoglu/Desktop/MotoCortex/src/locales'
en_path = os.path.join(locales_dir, 'en.json')

with open(en_path, 'r', encoding='utf-8') as f:
    en_raw = json.load(f)

def flatten(d, prefix=''):
    items = {}
    for k, v in d.items():
        new_key = f'{prefix}.{k}' if prefix else k
        if isinstance(v, dict):
            items.update(flatten(v, new_key))
        elif isinstance(v, str):
            items[new_key] = v
        else:
            items[new_key] = str(v)
    return items

def set_deep(d, path_parts, value):
    curr = d
    for p in path_parts[:-1]:
        if p not in curr or not isinstance(curr[p], dict):
            curr[p] = {}
        curr = curr[p]
    curr[path_parts[-1]] = value

en_flat = flatten(en_raw)

skip_prefixes = ('brands.',)
skip_exact_keys = {
    '4202', '7E8', 'DEV_123', 'UU1ESD12345678901', 'JY1RN123456789012', 
    'WVWZZZ3CZWE123456', 'SHA-256', 'DEFAULT_DEV_MOCK', 'GLOBAL', 'T', 
    'item-1', '_', 'X-MotoCortex-Timestamp', 'X-MotoCortex-Signature', 
    'AI_DOCTOR_LIMIT', 'PERF_TEASER_LIMIT', 'paywall_viewed', 'purchase_initiated', 
    'purchase_success', 'purchase_failed', 'purchase_cancelled', 
    'purchase_restore_initiated', 'purchase_restore_success', 'purchase_restore_failed', 
    'app_open', 'bento.settings.pollingLow', 'bento.settings.pollingHigh', 
    'common.brandName', 'connection.logoSub', 'perf.speed', 'features.expertDidPlaceholder',
    'bento.multiEcu', 'bento.dctAdapt', 'connection.ecu', 'coding.checksum_label',
    'fuelTrim.stft', 'fuelTrim.ltft', 'fuelTrim.lambda', 'sensor.adblue', 'sensor.egt', 'sensor.nox'
}

tech_whitelist = {
    'ECU', 'ECM', 'TCM', 'ABS', 'SRS', 'BCM', 'VIN', 'OBD', 'OBD2', 'UDS',
    'CAN', 'STFT', 'LTFT', 'MAF', 'MAP', 'EGT', 'NOX', 'DPF', 'DEF', 'SCR',
    'BMS', 'EPB', 'DCT', 'DSG', 'PDC', 'HUD', 'TPMS', 'ADAS', 'LED', 'USB',
    'ISO', 'DID', 'PID', 'DTC', 'TSB', 'PRO', 'ECO', 'RPM', 'PSI', 'BAR',
    'BMW', 'VAG', 'Audi', 'Mercedes', 'Toyota', 'Ford', 'Renault', 'Xiaomi',
    'HyperOS', 'Bluetooth', 'Wi-Fi', 'WiFi', 'Cortex', 'MotoCortex'
}

latin_word_re = re.compile(r'\b[A-Za-z]{3,}\b')

def translate_text(text, target_lang):
    if not text or not text.strip():
        return text, text
    
    placeholders = re.findall(r'\{\{[^}]+\}\}', text)
    temp_text = text
    for i, ph in enumerate(placeholders):
        temp_text = temp_text.replace(ph, f'__VAR_{i}__')
    
    url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=' + target_lang + '&dt=t&q=' + urllib.parse.quote(temp_text)
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=12) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                res = ''.join([part[0] for part in data[0] if part[0]])
            for i, ph in enumerate(placeholders):
                pattern = re.compile(r'__\s*VAR\s*_\s*' + str(i) + r'\s*__', re.IGNORECASE)
                res = pattern.sub(ph, res)
                res = res.replace(f'__VAR_{i}__', ph)
            return text, res
        except Exception:
            time.sleep(0.3 * (attempt + 1))
    return text, text

def process_language(lang):
    lang_file = os.path.join(locales_dir, f'{lang}.json')
    print(f'Starting processing for: [{lang.upper()}]...')
    with open(lang_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    if '' in data:
        del data['']
    
    flat = flatten(data)
    keys_to_update = []
    
    for k, v in flat.items():
        if k not in en_flat:
            continue
        if any(k.startswith(p) for p in skip_prefixes) or k in skip_exact_keys:
            continue
        if k.startswith('features.options.') and (v.endswith('km/h') or v.endswith('s')):
            continue
        
        en_v = en_flat[k].strip()
        v_str = v.strip()
        
        # 1. 100% Identical to English
        if en_v == v_str:
            keys_to_update.append(k)
        # 2. Hybrid string in features.items (has English words)
        elif k.startswith('features.items.'):
            words = latin_word_re.findall(v_str)
            non_tech = [w for w in words if w.upper() not in tech_whitelist and w not in tech_whitelist]
            if len(non_tech) >= 1:
                keys_to_update.append(k)
    
    unique_texts = list(set(en_flat[k] for k in keys_to_update))
    print(f'[{lang.upper()}]: {len(keys_to_update)} keys to update, {len(unique_texts)} unique texts.')
    
    translations = {}
    start_t = time.time()
    with ThreadPoolExecutor(max_workers=12) as executor:
        futures = [executor.submit(translate_text, t, lang) for t in unique_texts]
        for f in futures:
            orig, trans = f.result()
            translations[orig] = trans
            
    print(f'[{lang.upper()}]: Translation completed in {time.time()-start_t:.2f}s.')
    
    # Apply translations
    for k in keys_to_update:
        orig = en_flat[k]
        trans = translations.get(orig, orig)
        
        # verify interpolation variables match
        orig_vars = set(re.findall(r'\{\{[^}]+\}\}', orig))
        trans_vars = set(re.findall(r'\{\{[^}]+\}\}', trans))
        if orig_vars != trans_vars:
            trans = orig  # keep original if variables distorted
            
        parts = k.split('.')
        set_deep(data, parts, trans)
    
    with open(lang_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        
    print(f'[{lang.upper()}]: Saved successfully.\n')

if __name__ == '__main__':
    target_languages = ['ru', 'uk', 'th', 'ar', 'ja', 'ko', 'zh']
    print(f'Starting batch translation for {len(target_languages)} languages: {target_languages}')
    overall_start = time.time()
    for lang in target_languages:
        process_language(lang)
    print(f'ALL {len(target_languages)} LANGUAGES COMPLETED IN {time.time()-overall_start:.2f}s!')
