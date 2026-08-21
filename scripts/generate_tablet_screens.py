import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = 2048, 2732
tab_w, tab_h = 1500, 2000
tab_x = (W - tab_w) // 2
tab_y = 540

screen_pad = 18
screen_w = tab_w - screen_pad * 2
screen_h = tab_h - screen_pad * 2
screen_radius = 48

font_title = ImageFont.truetype('/System/Library/Fonts/HelveticaNeue.ttc', 110, index=1)
font_sub = ImageFont.truetype('/System/Library/Fonts/HelveticaNeue.ttc', 50, index=10)

brain_dir = '/Users/ismailimamoglu/.gemini/antigravity-ide/brain/310d1ff2-8b41-4c6b-b589-14c6d8d7296a/.user_uploaded'

items = [
    {
        'file': '01_hero_bento_hub.jpg',
        'title_lines': ['ALL IN ONE', 'OBD2 CONTROL HUB'],
        'subtitle': 'Diagnostics, Live Gauges, ECU Coding and Performance',
        'src': os.path.join(brain_dir, 'media_1787313506921.png')
    },
    {
        'file': '02_dtc_diagnostics.jpg',
        'title_lines': ['READ AND CLEAR', 'FAULT CODES'],
        'subtitle': 'OE Level Diagnostics with AI Doctor and Freeze Frame',
        'src': os.path.join(brain_dir, 'media_1787313528991.png')
    },
    {
        'file': '03_live_sensor_gauges.jpg',
        'title_lines': ['REAL TIME', 'LIVE GAUGES'],
        'subtitle': 'Live RPM, Vehicle Speed, Coolant and Battery Voltage',
        'src': os.path.join(brain_dir, 'media_1787313539988.png')
    },
    {
        'file': '04_one_click_ecu_coding.jpg',
        'title_lines': ['UNLOCK HIDDEN', 'CAR FEATURES'],
        'subtitle': 'One Click Pre Programmed Apps for VAG, BMW, Ford and More',
        'src': os.path.join(brain_dir, 'media_1787313552896.png')
    },
    {
        'file': '05_expert_long_coding.jpg',
        'title_lines': ['EXPERT LONG CODING', 'AND BYTES'],
        'subtitle': 'Direct Byte and Bit Editor with Safety Rollback',
        'src': os.path.join(brain_dir, 'media_1787313559377.png')
    },
    {
        'file': '06_fuel_trim_gasoline.jpg',
        'title_lines': ['ADVANCED FUEL TRIM', 'AND AFR'],
        'subtitle': 'Short and Long Term Fuel Trims, O2 Sensors and Lambda',
        'src': os.path.join(brain_dir, 'media_1787313652690.png')
    },
    {
        'file': '07_diesel_common_rail.jpg',
        'title_lines': ['DIESEL COMMON RAIL', 'INJECTION'],
        'subtitle': 'Injector Correction Balances, DPF Soot Load and Rail Pressure',
        'src': os.path.join(brain_dir, 'media_1787313658339.png')
    },
    {
        'file': '08_dct_transmission_adapt.jpg',
        'title_lines': ['DCT AND DSG', 'TRANSMISSION RESET'],
        'subtitle': 'Dual Clutch Adaptation, Touch Point Calibration and Solenoids',
        'src': os.path.join(brain_dir, 'media_1787313669340.png')
    },
    {
        'file': '09_manual_gearbox_sensors.jpg',
        'title_lines': ['MANUAL TRANSMISSION', 'AUDIT'],
        'subtitle': 'Clutch Pedal Switch, Neutral Gear Sensor and Telemetry',
        'src': os.path.join(brain_dir, 'media_1787313673180.png')
    },
    {
        'file': '10_technical_support_feedback.jpg',
        'title_lines': ['DIRECT DEVELOPER', 'SUPPORT'],
        'subtitle': 'In App Diagnostic Ticket Submission with Protocol Logs',
        'src': os.path.join(brain_dir, 'media_1787313679721.png')
    }
]

def main():
    print('Generating 10 Real 13-inch iPad Pro Showcase Screenshots (2048x2732)...')
    os.makedirs('marketing/tablet_screenshots', exist_ok=True)

    for idx, item in enumerate(items, 1):
        target_filename = item['file']
        
        # 1. Electric Cobalt Aurora Canvas Background
        canvas = Image.new('RGB', (W, H), (8, 18, 37))
        draw = ImageDraw.Draw(canvas)
        
        for y in range(H):
            ratio = y / H
            if ratio < 0.4:
                sub_r = ratio / 0.4
                r = int(8 + sub_r * 5)
                g = int(18 + sub_r * 22)
                b = int(37 + sub_r * 38)
            else:
                sub_r = (ratio - 0.4) / 0.6
                r = int(13 - sub_r * 11)
                g = int(40 + sub_r * 16)
                b = int(75 + sub_r * 17)
            draw.line([(0, y), (W, y)], fill=(r, g, b))
            
        glow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        g_draw = ImageDraw.Draw(glow)
        g_draw.ellipse([W//2 - 700, -200, W//2 + 700, 950], fill=(0, 126, 255, 38))
        glow = glow.filter(ImageFilter.GaussianBlur(160))
        canvas.paste(glow, (0, 0), glow)

        # 2. Typography
        line1, line2 = item['title_lines'][0], item['title_lines'][1]
        tb1 = draw.textbbox((0, 0), line1, font=font_title)
        draw.text(((W - (tb1[2] - tb1[0])) / 2, 130), line1, font=font_title, fill=(255, 255, 255))
        tb2 = draw.textbbox((0, 0), line2, font=font_title)
        draw.text(((W - (tb2[2] - tb2[0])) / 2, 255), line2, font=font_title, fill=(255, 255, 255))
        sb = draw.textbbox((0, 0), item['subtitle'], font=font_sub)
        draw.text(((W - (sb[2] - sb[0])) / 2, 410), item['subtitle'], font=font_sub, fill=(186, 230, 253))
        
        # 3. Ambient Shadow
        shadow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        s_draw = ImageDraw.Draw(shadow)
        s_draw.rounded_rectangle([tab_x - 18, tab_y - 12, tab_x + tab_w + 18, tab_y + tab_h + 20], radius=75, fill=(0, 126, 255, 40))
        s_draw.rounded_rectangle([tab_x - 22, tab_y + 20, tab_x + tab_w + 22, tab_y + tab_h + 50], radius=75, fill=(0, 0, 0, 180))
        shadow = shadow.filter(ImageFilter.GaussianBlur(38))
        canvas.paste(shadow, (0, 0), shadow)
        
        # 4. Tablet Hardware Buttons
        btn_color, btn_border = (148, 163, 184), (71, 85, 105)
        draw.rounded_rectangle([tab_x + tab_w - 200, tab_y - 6, tab_x + tab_w - 70, tab_y + 1], radius=3, fill=btn_color, outline=btn_border, width=1)
        draw.rounded_rectangle([tab_x + tab_w - 1, tab_y + 140, tab_x + tab_w + 6, tab_y + 240], radius=3, fill=btn_color, outline=btn_border, width=1)
        draw.rounded_rectangle([tab_x + tab_w - 1, tab_y + 265, tab_x + tab_w + 6, tab_y + 365], radius=3, fill=btn_color, outline=btn_border, width=1)
        draw.rounded_rectangle([tab_x + tab_w - 2, tab_y + tab_h//2 - 160, tab_x + tab_w + 3, tab_y + tab_h//2 + 160], radius=2, fill=(71, 85, 105), outline=(51, 65, 85), width=1)
        
        # 5. Titanium Tablet Body
        chassis = Image.new('RGBA', (tab_w, tab_h), (0, 0, 0, 0))
        c_draw = ImageDraw.Draw(chassis)
        c_draw.rounded_rectangle([0, 0, tab_w, tab_h], radius=68, fill=(51, 65, 85, 255), outline=(148, 163, 184, 255), width=5)
        
        bezel_pad = 12
        c_draw.rounded_rectangle([bezel_pad, bezel_pad, tab_w - bezel_pad, tab_h - bezel_pad], radius=56, fill=(15, 23, 42, 255))
        
        cam_x = tab_w // 2
        cam_y = bezel_pad // 2 + 3
        c_draw.ellipse([cam_x - 4, cam_y - 4, cam_x + 4, cam_y + 4], fill=(30, 41, 59, 255), outline=(71, 85, 105, 255), width=1)
        
        # 6. Screen Content (Native Aspect Ratio 3:4)
        raw_img = Image.open(item['src'])
        resized_screen = raw_img.convert('RGB').resize((screen_w, screen_h), Image.Resampling.LANCZOS)
        
        screen_mask = Image.new('L', (screen_w, screen_h), 0)
        sm_draw = ImageDraw.Draw(screen_mask)
        sm_draw.rounded_rectangle([0, 0, screen_w, screen_h], radius=screen_radius, fill=255)
        
        chassis.paste(resized_screen, (screen_pad, screen_pad), screen_mask)
        canvas.paste(chassis, (tab_x, tab_y), chassis)
        
        out_path = os.path.join('marketing/tablet_screenshots', target_filename)
        canvas.save(out_path, 'JPEG', quality=95)
        print(f'Processed Real Tablet Showcase {idx}/10: {target_filename} -> OK')

    print('All 10 real iPad Pro tablet showcase screenshots completed!')

if __name__ == '__main__':
    main()
