import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

items = [
    {
        'file': '01_hero_bento_hub.jpg',
        'title_lines': ['ALL IN ONE', 'OBD2 CONTROL HUB'],
        'subtitle': 'Diagnostics, Live Gauges, ECU Coding and Performance',
        'src': 'scratch/pristine_sources/01_hero_bento_hub.jpg',
        'crop': True
    },
    {
        'file': '02_dtc_diagnostics.jpg',
        'title_lines': ['READ AND CLEAR', 'FAULT CODES'],
        'subtitle': 'OE Level Diagnostics with AI Doctor and Freeze Frame',
        'src': 'scratch/pristine_sources/02_dtc_diagnostics.jpg',
        'crop': True
    },
    {
        'file': '03_live_sensor_gauges.jpg',
        'title_lines': ['REAL TIME', 'LIVE GAUGES'],
        'subtitle': 'Live RPM, Vehicle Speed, Coolant and Battery Voltage',
        'src': '/Users/ismailimamoglu/.gemini/antigravity-ide/brain/310d1ff2-8b41-4c6b-b589-14c6d8d7296a/.user_uploaded/media_1787309944604.png',
        'crop': False
    },
    {
        'file': '04_one_click_ecu_coding.jpg',
        'title_lines': ['UNLOCK HIDDEN', 'CAR FEATURES'],
        'subtitle': 'One Click Pre Programmed Apps for VAG, BMW, Ford and More',
        'src': 'scratch/pristine_sources/04_one_click_ecu_coding.jpg',
        'crop': True
    },
    {
        'file': '05_expert_long_coding.jpg',
        'title_lines': ['EXPERT LONG CODING', 'AND BYTES'],
        'subtitle': 'Direct Byte and Bit Editor with Safety Rollback',
        'src': 'scratch/pristine_sources/05_expert_long_coding.jpg',
        'crop': True
    },
    {
        'file': '06_fuel_trim_gasoline.jpg',
        'title_lines': ['ADVANCED FUEL TRIM', 'AND AFR'],
        'subtitle': 'Short and Long Term Fuel Trims, O2 Sensors and Lambda',
        'src': 'scratch/pristine_sources/06_fuel_trim_gasoline.jpg',
        'crop': True
    },
    {
        'file': '07_diesel_common_rail.jpg',
        'title_lines': ['DIESEL COMMON RAIL', 'INJECTION'],
        'subtitle': 'Injector Correction Balances, DPF Soot Load and Rail Pressure',
        'src': 'scratch/pristine_sources/07_diesel_common_rail.jpg',
        'crop': True
    },
    {
        'file': '08_dct_transmission_adapt.jpg',
        'title_lines': ['DCT AND DSG', 'TRANSMISSION RESET'],
        'subtitle': 'Dual Clutch Adaptation, Touch Point Calibration and Solenoids',
        'src': 'scratch/pristine_sources/08_dct_transmission_adapt.jpg',
        'crop': True
    },
    {
        'file': '09_manual_gearbox_sensors.jpg',
        'title_lines': ['MANUAL TRANSMISSION', 'AUDIT'],
        'subtitle': 'Clutch Pedal Switch, Neutral Gear Sensor and Telemetry',
        'src': 'scratch/pristine_sources/09_manual_gearbox_sensors.jpg',
        'crop': True
    },
    {
        'file': '10_technical_support_feedback.jpg',
        'title_lines': ['DIRECT DEVELOPER', 'SUPPORT'],
        'subtitle': 'In App Diagnostic Ticket Submission with Protocol Logs',
        'src': 'scratch/pristine_sources/10_technical_support_feedback.jpg',
        'crop': True
    }
]

def generate_phone_showcases():
    print('Generating Phone Showcase (1284x2778 - Exact Apple 6.5" / 6.7" Proportions)...')
    W, H = 1284, 2778
    os.makedirs('marketing/store_screenshots', exist_ok=True)
    os.makedirs('marketing/store_screenshots_6_5', exist_ok=True)
    font_title = ImageFont.truetype('/System/Library/Fonts/HelveticaNeue.ttc', 86, index=1)
    font_sub = ImageFont.truetype('/System/Library/Fonts/HelveticaNeue.ttc', 38, index=10)

    for idx, item in enumerate(items, 1):
        target_filename = item['file']
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
        g_draw.ellipse([W//2 - 500, -150, W//2 + 500, 750], fill=(0, 126, 255, 38))
        glow = glow.filter(ImageFilter.GaussianBlur(130))
        canvas.paste(glow, (0, 0), glow)

        line1, line2 = item['title_lines'][0], item['title_lines'][1]
        tb1 = draw.textbbox((0, 0), line1, font=font_title)
        draw.text(((W - (tb1[2] - tb1[0])) / 2, 115), line1, font=font_title, fill=(255, 255, 255))
        tb2 = draw.textbbox((0, 0), line2, font=font_title)
        draw.text(((W - (tb2[2] - tb2[0])) / 2, 220), line2, font=font_title, fill=(255, 255, 255))
        sb = draw.textbbox((0, 0), item['subtitle'], font=font_sub)
        draw.text(((W - (sb[2] - sb[0])) / 2, 350), item['subtitle'], font=font_sub, fill=(186, 230, 253))
        
        # Exact iPhone Pro Max 19.5:9 proportions (880 x 1908)
        phone_w = 880
        phone_h = 1908
        phone_x, phone_y = (W - phone_w) // 2, 530
        
        shadow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        s_draw = ImageDraw.Draw(shadow)
        s_draw.rounded_rectangle([phone_x - 14, phone_y - 8, phone_x + phone_w + 14, phone_y + phone_h + 16], radius=118, fill=(0, 126, 255, 40))
        s_draw.rounded_rectangle([phone_x - 18, phone_y + 16, phone_x + phone_w + 18, phone_y + phone_h + 40], radius=118, fill=(0, 0, 0, 170))
        shadow = shadow.filter(ImageFilter.GaussianBlur(32))
        canvas.paste(shadow, (0, 0), shadow)
        
        btn_color, btn_border = (148, 163, 184), (71, 85, 105)
        draw.rounded_rectangle([phone_x - 6, phone_y + 240, phone_x + 1, phone_y + 295], radius=3, fill=btn_color, outline=btn_border, width=1)
        draw.rounded_rectangle([phone_x - 6, phone_y + 335, phone_x + 1, phone_y + 440], radius=3, fill=btn_color, outline=btn_border, width=1)
        draw.rounded_rectangle([phone_x - 6, phone_y + 470, phone_x + 1, phone_y + 575], radius=3, fill=btn_color, outline=btn_border, width=1)
        draw.rounded_rectangle([phone_x + phone_w - 1, phone_y + 355, phone_x + phone_w + 6, phone_y + 495], radius=3, fill=btn_color, outline=btn_border, width=1)
        draw.rounded_rectangle([phone_x + phone_w - 1, phone_y + 1180, phone_x + phone_w + 5, phone_y + 1285], radius=3, fill=(100, 116, 139), outline=btn_border, width=1)
        
        chassis = Image.new('RGBA', (phone_w, phone_h), (0, 0, 0, 0))
        c_draw = ImageDraw.Draw(chassis)
        c_draw.rounded_rectangle([0, 0, phone_w, phone_h], radius=115, fill=(51, 65, 85, 255), outline=(148, 163, 184, 255), width=4)
        c_draw.line([(0, 200), (4, 200)], fill=(30, 41, 59, 255), width=2)
        c_draw.line([(phone_w - 4, 200), (phone_w, 200)], fill=(30, 41, 59, 255), width=2)
        c_draw.line([(0, phone_h - 250), (4, phone_h - 250)], fill=(30, 41, 59, 255), width=2)
        c_draw.line([(phone_w - 4, phone_h - 250), (phone_w, phone_h - 250)], fill=(30, 41, 59, 255), width=2)
        
        bezel_pad = 10
        c_draw.rounded_rectangle([bezel_pad, bezel_pad, phone_w - bezel_pad, phone_h - bezel_pad], radius=105, fill=(15, 23, 42, 255))
        
        screen_pad = 16
        screen_w, screen_h = phone_w - screen_pad * 2, phone_h - screen_pad * 2
        
        raw_img = Image.open(item['src'])
        app_screen = raw_img.crop((106, 410, 1184, 2796)) if item['crop'] else raw_img
        resized_screen = app_screen.convert('RGB').resize((screen_w, screen_h), Image.Resampling.LANCZOS)
        
        screen_mask = Image.new('L', (screen_w, screen_h), 0)
        sm_draw = ImageDraw.Draw(screen_mask)
        sm_draw.rounded_rectangle([0, 0, screen_w, screen_h], radius=95, fill=255)
        
        chassis.paste(resized_screen, (screen_pad, screen_pad), screen_mask)
        canvas.paste(chassis, (phone_x, phone_y), chassis)
        
        out_path = os.path.join('marketing/store_screenshots', target_filename)
        canvas.save(out_path, 'JPEG', quality=98)
        
        # Also save to 6_5 folder for convenience
        out_path_65 = os.path.join('marketing/store_screenshots_6_5', target_filename)
        canvas.save(out_path_65, 'JPEG', quality=98)
        print(f'  Phone {idx}/10: {target_filename} -> OK')

def generate_tablet_showcases():
    print('Generating Tablet Showcase (2048x2732)...')
    W, H = 2048, 2732
    os.makedirs('marketing/tablet_screenshots', exist_ok=True)
    font_title = ImageFont.truetype('/System/Library/Fonts/HelveticaNeue.ttc', 110, index=1)
    font_sub = ImageFont.truetype('/System/Library/Fonts/HelveticaNeue.ttc', 50, index=10)

    for idx, item in enumerate(items, 1):
        target_filename = item['file']
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

        line1, line2 = item['title_lines'][0], item['title_lines'][1]
        tb1 = draw.textbbox((0, 0), line1, font=font_title)
        draw.text(((W - (tb1[2] - tb1[0])) / 2, 130), line1, font=font_title, fill=(255, 255, 255))
        tb2 = draw.textbbox((0, 0), line2, font=font_title)
        draw.text(((W - (tb2[2] - tb2[0])) / 2, 255), line2, font=font_title, fill=(255, 255, 255))
        sb = draw.textbbox((0, 0), item['subtitle'], font=font_sub)
        draw.text(((W - (sb[2] - sb[0])) / 2, 410), item['subtitle'], font=font_sub, fill=(186, 230, 253))
        
        tab_w, tab_h = 1500, 2020
        tab_x, tab_y = (W - tab_w) // 2, 540
        
        shadow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        s_draw = ImageDraw.Draw(shadow)
        s_draw.rounded_rectangle([tab_x - 18, tab_y - 12, tab_x + tab_w + 18, tab_y + tab_h + 20], radius=75, fill=(0, 126, 255, 40))
        s_draw.rounded_rectangle([tab_x - 22, tab_y + 20, tab_x + tab_w + 22, tab_y + tab_h + 50], radius=75, fill=(0, 0, 0, 180))
        shadow = shadow.filter(ImageFilter.GaussianBlur(38))
        canvas.paste(shadow, (0, 0), shadow)
        
        btn_color, btn_border = (148, 163, 184), (71, 85, 105)
        draw.rounded_rectangle([tab_x + tab_w - 200, tab_y - 6, tab_x + tab_w - 70, tab_y + 1], radius=3, fill=btn_color, outline=btn_border, width=1)
        draw.rounded_rectangle([tab_x + tab_w - 1, tab_y + 140, tab_x + tab_w + 6, tab_y + 240], radius=3, fill=btn_color, outline=btn_border, width=1)
        draw.rounded_rectangle([tab_x + tab_w - 1, tab_y + 265, tab_x + tab_w + 6, tab_y + 365], radius=3, fill=btn_color, outline=btn_border, width=1)
        draw.rounded_rectangle([tab_x + tab_w - 2, tab_y + tab_h//2 - 160, tab_x + tab_w + 3, tab_y + tab_h//2 + 160], radius=2, fill=(71, 85, 105), outline=(51, 65, 85), width=1)
        
        chassis = Image.new('RGBA', (tab_w, tab_h), (0, 0, 0, 0))
        c_draw = ImageDraw.Draw(chassis)
        c_draw.rounded_rectangle([0, 0, tab_w, tab_h], radius=68, fill=(51, 65, 85, 255), outline=(148, 163, 184, 255), width=5)
        
        bezel_pad = 14
        c_draw.rounded_rectangle([bezel_pad, bezel_pad, tab_w - bezel_pad, tab_h - bezel_pad], radius=56, fill=(15, 23, 42, 255))
        
        cam_x, cam_y = tab_w // 2, bezel_pad // 2 + 3
        c_draw.ellipse([cam_x - 4, cam_y - 4, cam_x + 4, cam_y + 4], fill=(30, 41, 59, 255), outline=(71, 85, 105, 255), width=1)
        
        screen_pad = 24
        screen_w, screen_h = tab_w - screen_pad * 2, tab_h - screen_pad * 2
        
        raw_img = Image.open(item['src'])
        app_screen = raw_img.crop((106, 410, 1184, 2796)) if item['crop'] else raw_img
        resized_screen = app_screen.convert('RGB').resize((screen_w, screen_h), Image.Resampling.LANCZOS)
        
        screen_mask = Image.new('L', (screen_w, screen_h), 0)
        sm_draw = ImageDraw.Draw(screen_mask)
        sm_draw.rounded_rectangle([0, 0, screen_w, screen_h], radius=46, fill=255)
        
        chassis.paste(resized_screen, (screen_pad, screen_pad), screen_mask)
        canvas.paste(chassis, (tab_x, tab_y), chassis)
        
        out_path = os.path.join('marketing/tablet_screenshots', target_filename)
        canvas.save(out_path, 'JPEG', quality=95)
        print(f'  Tablet {idx}/10: {target_filename} -> OK')

def main():
    generate_phone_showcases()
    generate_tablet_showcases()
    print('All phone & tablet showcase screenshots generated successfully!')

if __name__ == '__main__':
    main()
