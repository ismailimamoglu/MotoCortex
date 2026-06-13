#!/usr/bin/env python3
import json
import os

LOCALES_DIR = "/Users/ismailimamoglu/Desktop/MotoCortex/src/locales"

REVOCATION_DATA = {
    "en": {
        "revocationTitle": "Subscription Cancelled",
        "revocationMsg": "Your access to PRO features has been terminated because your subscription was cancelled or refunded."
    },
    "tr": {
        "revocationTitle": "Abonelik Sonlandırıldı",
        "revocationMsg": "Aboneliğiniz iptal edildiği veya iade edildiği için PRO özelliklerine erişiminiz sonlandırılmıştır."
    },
    "de": {
        "revocationTitle": "Abonnement beendet",
        "revocationMsg": "Ihr Zugriff auf PRO-Funktionen wurde beendet, da Ihr Abonnement gekündigt oder erstattet wurde."
    },
    "es": {
        "revocationTitle": "Suscripción Finalizada",
        "revocationMsg": "Su acceso a las funciones PRO ha finalizado debido a que su suscripción fue cancelada o reembolsada."
    },
    "fr": {
        "revocationTitle": "Abonnement Résilié",
        "revocationMsg": "Votre accès aux fonctionnalités PRO a été résilié car votre abonnement a été annulé ou remboursé."
    },
    "it": {
        "revocationTitle": "Abbonamento Terminato",
        "revocationMsg": "Il tuo accesso alle funzionalità PRO è stato interrotto perché il tuo abbonamento è stato annullato o rimborsato."
    },
    "pt": {
        "revocationTitle": "Assinatura Cancelada",
        "revocationMsg": "O seu acesso aos recursos PRO foi encerrado porque a sua assinatura foi cancelada ou reembolsada."
    },
    "ru": {
        "revocationTitle": "Подписка отменена",
        "revocationMsg": "Ваш доступ к функциям PRO был прекращен, так как ваша подписка была отменена или возвращена."
    },
    "zh": {
        "revocationTitle": "订阅已取消",
        "revocationMsg": "您的 PRO 功能使用权已终止，因为您的订阅已被取消或退款。"
    },
    "ja": {
        "revocationTitle": "サブスクリプション終了",
        "revocationMsg": "サブスクリプションがキャンセルまたは払い戻しされたため、PRO機能へのアクセスは終了しました。"
    },
    "ko": {
        "revocationTitle": "구독 종료됨",
        "revocationMsg": "구독이 취소되거나 환불되어 PRO 기능에 대한 액세스가 종료되었습니다."
    }
}

updated = []

for fname in sorted(os.listdir(LOCALES_DIR)):
    if not fname.endswith(".json"):
        continue
    lang = fname[:-5]
    fpath = os.path.join(LOCALES_DIR, fname)
    
    # Fallback to English if language is not defined in translation dict
    translation = REVOCATION_DATA.get(lang, REVOCATION_DATA["en"])
    
    with open(fpath, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    if "common" not in data:
        data["common"] = {}
        
    data["common"]["revocationTitle"] = translation["revocationTitle"]
    data["common"]["revocationMsg"] = translation["revocationMsg"]
    
    with open(fpath, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=4)
        f.write("\n")
    updated.append(lang)

print(f"Successfully added/updated revocation keys in {len(updated)} languages.")
