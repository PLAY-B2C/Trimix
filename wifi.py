import os
import json
import netifaces
import time

# Get Wi-Fi SSID using termux-api
def get_wifi_name():
    wifi_info = os.popen("termux-wifi-connectioninfo").read()
    data = json.loads(wifi_info)
    return data.get("ssid", "Unknown")

# Get local IP + subnet mask
def get_network_range():
    iface = "wlan0"
    ip = netifaces.ifaddresses(iface)[netifaces.AF_INET][0]['addr']
    netmask = netifaces.ifaddresses(iface)[netifaces.AF_INET][0]['netmask']

    # Convert netmask to CIDR
    bits = sum([bin(int(x)).count("1") for x in netmask.split(".")])
    network = f"{ip}/{bits}"
    return network

def scan_network(network, ssid):
    print(f"\n🔎 Scanning Wi-Fi: {ssid} ({network}) ...\n")
    os.system(f"nmap -sn {network} > scan.txt")

    with open("scan.txt") as f:
        data = f.read()

    print(data)

    # Example: detect unknown device
    if "192.168.1.105" in data:  # Replace with known device IPs
        print("⚠️ Unknown device detected!")
        os.system('termux-notification --title "Wi-Fi Alert" --content "Unknown device detected!"')

if __name__ == "__main__":
    ssid = get_wifi_name()
    network = get_network_range()

    while True:
        scan_network(network, ssid)
        time.sleep(60)  # scan every 1 min
