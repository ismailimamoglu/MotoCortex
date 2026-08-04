Kodunuzu inceledim. MotoCortex zaten güçlü bir yapıya sahip (ELMParser, ISOTPDecoder, CommandScheduler, BLE + Classic BT transports). Ancak "her araca bağlanamıyor" sorununun ana kaynakları:

WiFi transport eksik – ELM327 WiFi adaptörleri (192.168.0.10:35000) desteklenmiyor
Protokol tarama zayıf – Sadece ATSP0/6 deneniyor, 9 protokolün hepsi sırayla taranmıyor
K-Line init sequence yok – 5-baud slow init + fast init eksik (eski araçlar bağlanamaz)
OEM PID setleri yok – VAG/BMW/Mercedes/Ford/Toyota özel kanalları yok
Bootstrap fragile – Clone adaptörlerde init sequence timing hassas