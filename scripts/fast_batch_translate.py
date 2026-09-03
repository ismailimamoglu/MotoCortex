import json
import os
import re
import time
import urllib.request
import urllib.parse

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

def translate_batch(chunk, target_lang):
    # Mask variables
    masked_chunk = []
    chunk_var_maps = []
    
    for text in chunk:
        placeholders = re.findall(r'\{\{[^}]+\}\}', text)
        temp = text.replace('\n', ' ')
        v_map = {}
        for idx, ph in enumerate(placeholders):
            token = f'QQV{idx}QQ'
            temp = temp.replace(ph, token)
            v_map[token] = ph
        masked_chunk.append(temp)
        chunk_var_maps.append(v_map)
        
    lines = [f'{i}>>> {t}' for i, t in enumerate(masked_chunk)]
    combined = '\n'.join(lines)
    
    api_lang = 'zh-CN' if target_lang == 'zh' else target_lang
    url = f'https://translate.googleapis.com/translate_a/single?client=dict-chrome-ex&sl=en&tl={api_lang}&dt=t&q=' + urllib.parse.quote(combined)
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=12) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                full_trans = ''.join([part[0] for part in data[0] if part[0]])
            
            matches = dict(re.findall(r'(\d+)\s*>>>\s*(.*)', full_trans))
            translated_chunk = []
            
            for i, orig_text in enumerate(chunk):
                raw_t = matches.get(str(i), '').strip()
                if not raw_t:
                    raw_t = orig_text
                
                # Unmask variables
                v_map = chunk_var_maps[i]
                for token, ph in v_map.items():
                    raw_t = re.sub(re.escape(token), ph, raw_t, flags=re.IGNORECASE)
                
                # Verify variables preserved
                orig_vars = set(re.findall(r'\{\{[^}]+\}\}', orig_text))
                trans_vars = set(re.findall(r'\{\{[^}]+\}\}', raw_t))
                if orig_vars != trans_vars:
                    raw_t = orig_text
                
                translated_chunk.append(raw_t)
            return translated_chunk
        except Exception:
            time.sleep(0.5)
            
    return chunk

def process_lang(lang):
    lang_file = os.path.join(locales_dir, f'{lang}.json')
    print(f'\n--- Processing [{lang.upper()}] ---')
    
    with open(lang_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
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
        # 2. Hybrid string in features.items
        elif k.startswith('features.items.'):
            words = latin_word_re.findall(v_str)
            non_tech = [w for w in words if w.upper() not in tech_whitelist and w not in tech_whitelist]
            if len(non_tech) >= 1:
                keys_to_update.append(k)
                
    print(f'[{lang.upper()}]: Found {len(keys_to_update)} keys to update.')
    if not keys_to_update:
        print(f'[{lang.upper()}]: Nothing to update!')
        return
        
    unique_texts = list(set(en_flat[k] for k in keys_to_update))
    print(f'[{lang.upper()}]: Translating {len(unique_texts)} unique texts in batches of 20...')
    
    translations = {}
    batch_size = 20
    start_t = time.time()
    
    for i in range(0, len(unique_texts), batch_size):
        chunk = unique_texts[i:i+batch_size]
        translated_chunk = translate_batch(chunk, lang)
        for orig, trans in zip(chunk, translated_chunk):
            translations[orig] = trans
        time.sleep(0.15)
        if (i // batch_size) % 10 == 0:
            print(f'  Progress: {min(i+batch_size, len(unique_texts))}/{len(unique_texts)} texts...')
            
    print(f'[{lang.upper()}]: Translations completed in {time.time()-start_t:.2f}s.')
    
    # Apply to data
    for k in keys_to_update:
        orig = en_flat[k]
        trans = translations.get(orig, orig)
        parts = k.split('.')
        set_deep(data, parts, trans)
        
    with open(lang_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        
    print(f'[{lang.upper()}]: Saved successfully.')

if __name__ == '__main__':
    langs = ['uk', 'th', 'ar', 'ja', 'ko', 'zh']
    print(f'Starting fast batch translation for: {langs}')
    overall_start = time.time()
    for l in langs:
        process_lang(l)
    print(f'\nALL COMPLETED IN {time.time()-overall_start:.2f}s!')
