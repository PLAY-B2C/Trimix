import os
import json

# Get nearby Wi-Fi networks
def get_wifi_networks():
    wifi_scan = os.popen("termux-wifi-scaninfo").read()
    return json.loads(wifi_scan)

# Rate security level
def rate_security(capabilities):
    if "WEP" in capabilities:
        return "⚠️ Weak (WEP - easily hackable)"
    elif "WPA2" in capabilities and "WPA3" not in capabilities:
        return "✅ Secure (WPA2)"
    elif "WPA3" in capabilities:
        return "🔒 Very Secure (WPA3)"
    elif "ESS" in capabilities and "WPA" not in capabilities:
        return "❌ Open (No password!)"
    else:
        return f"ℹ️ Unknown ({capabilities})"

# Main
if __name__ == "__main__":
    networks = get_wifi_networks()
    print("\n📡 Nearby Wi-Fi Security Report:\n")
    
    for net in networks:
        ssid = net.get("ssid", "Unknown")
        strength = net.get("level", "N/A")
        security = rate_security(net.get("capabilities", ""))
        
        print(f"SSID: {ssid}")
        print(f"  Signal: {strength} dBm")
        print(f"  Security: {security}\n")
