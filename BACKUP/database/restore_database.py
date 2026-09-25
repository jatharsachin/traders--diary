"""
TRADER'S DIARY AUTOMATED DATA RESTORATION SCRIPT
Use this script to restore all user trades, adjustments, and settings if needed.
"""
import os, json, shutil

def restore_local_storage_to_browser():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    dump_path = os.path.join(base_dir, "user_database_dump.json")
    if not os.path.exists(dump_path):
        print("ERROR: user_database_dump.json not found!")
        return
    with open(dump_path, "r", encoding="utf-8") as f:
        dump = json.load(f)
    print(f"Loaded {len(dump)} database items from backup.")
    print("To restore to your browser:")
    print("1. Open Trader's Diary (e.g. https://tradersdiary-pro.vercel.app or http://localhost:5173)")
    print("2. Open Browser Developer Tools (Press F12) -> Console")
    print("3. Run the following JavaScript command:")
    print("------------------------------------------------------------------")
    js_cmd = "const backupData = " + json.dumps(dump) + "; Object.entries(backupData).forEach(([k, v]) => localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v))); console.log('Restored ' + Object.keys(backupData).length + ' keys successfully. Reloading...'); window.location.reload();"
    print(js_cmd[:300] + "... [full script saved to restore_in_browser.js]")
    with open(os.path.join(base_dir, "restore_in_browser.js"), "w", encoding="utf-8") as fjs:
        fjs.write(js_cmd)
    print("------------------------------------------------------------------")
    print("Saved browser restore script to: restore_in_browser.js")

if __name__ == "__main__":
    restore_local_storage_to_browser()
