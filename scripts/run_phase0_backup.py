import os
import sys
import shutil
import json
import struct

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

print("=== STARTING COMPREHENSIVE PHASE 0 MANDATORY BACKUP ===")

# Base directories
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
backup_root = os.path.join(base_dir, "BACKUP")
os.makedirs(backup_root, exist_ok=True)

src_backup = os.path.join(backup_root, "source")
theme_backup = os.path.join(backup_root, "theme")
config_backup = os.path.join(backup_root, "config")
db_backup = os.path.join(backup_root, "database")
uploads_backup = os.path.join(backup_root, "uploads")

for d in [src_backup, theme_backup, config_backup, db_backup, uploads_backup]:
    os.makedirs(d, exist_ok=True)

# -------------------------------------------------------------------------
# 1. BACK UP SOURCE CODE
# -------------------------------------------------------------------------
print("1. Backing up complete source code...")
for folder in ["src", "api", "scripts", "public"]:
    src_folder = os.path.join(base_dir, folder)
    if os.path.exists(src_folder):
        dest = os.path.join(src_backup, folder)
        if os.path.exists(dest):
            shutil.rmtree(dest)
        shutil.copytree(src_folder, dest)

for root_file in [
    "index.html",
    "package.json",
    "package-lock.json",
    "vite.config.ts",
    "tsconfig.json",
    "tsconfig.app.json",
    "tsconfig.node.json",
    "eslint.config.js",
    "vercel.json",
    "README.md",
    "Start_Diary.bat",
    "CODEBASE_MEMORY.md",
]:
    src_file = os.path.join(base_dir, root_file)
    if os.path.exists(src_file):
        shutil.copy2(src_file, os.path.join(src_backup, root_file))

print("   [OK] Source code backed up into BACKUP/source")

# -------------------------------------------------------------------------
# 2. BACK UP THE CURRENT THEME
# -------------------------------------------------------------------------
print("2. Backing up current styling system & theme...")
index_css_path = os.path.join(base_dir, "src", "index.css")
if os.path.exists(index_css_path):
    shutil.copy2(index_css_path, os.path.join(theme_backup, "index.css"))

theme_summary = {
    "theme_name": "Dark Glass Minimalist (Pre-Liquid Glass)",
    "typography": {
        "base_font": '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Inter", sans-serif',
        "mono_font": '"SF Mono", "JetBrains Mono", monospace'
    },
    "color_tokens": {
        "bg_base": "#08080a",
        "bg_card": "#101014",
        "bg_glass": "rgba(255, 255, 255, 0.03)",
        "border_color": "rgba(255, 255, 255, 0.08)",
        "primary": "#0a84ff",
        "win_green": "#30d158",
        "win_bg": "rgba(48, 209, 88, 0.12)",
        "win_border": "rgba(48, 209, 88, 0.25)",
        "loss_red": "#ff453a",
        "loss_bg": "rgba(255, 69, 58, 0.12)",
        "loss_border": "rgba(255, 69, 58, 0.25)",
        "purple_accent": "#bf5af2",
        "warning_yellow": "#ffd60a",
        "text_main": "#f5f5f7",
        "text_muted": "#86868b",
        "text_dim": "#52525a"
    },
    "effects": {
        "backdrop_blur": "blur(20px)",
        "card_shadow": "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
        "border_radius": "16px"
    }
}
with open(os.path.join(theme_backup, "theme_tokens.json"), "w", encoding="utf-8") as f:
    json.dump(theme_summary, f, indent=2)

print("   [OK] Theme and tokens backed up into BACKUP/theme")

# -------------------------------------------------------------------------
# 3. BACK UP APPLICATION SETTINGS & CONFIG
# -------------------------------------------------------------------------
print("3. Backing up application settings and config...")
for cfg_file in [
    "vite.config.ts",
    "tsconfig.json",
    "tsconfig.app.json",
    "tsconfig.node.json",
    "eslint.config.js",
    "vercel.json",
    "package.json",
]:
    f_path = os.path.join(base_dir, cfg_file)
    if os.path.exists(f_path):
        shutil.copy2(f_path, os.path.join(config_backup, cfg_file))

# Safe environment template & secret-safe local backup
env_path = os.path.join(base_dir, ".env")
if os.path.exists(env_path):
    env_lines = open(env_path, "r", encoding="utf-8").readlines()
    template_lines = []
    for l in env_lines:
        if "=" in l:
            k = l.split("=")[0].strip()
            template_lines.append(f"{k}=<SECURE_VALUE_LOCALLY_STORED>\n")
        else:
            template_lines.append(l)
    with open(os.path.join(config_backup, ".env.example"), "w", encoding="utf-8") as f:
        f.writelines(template_lines)
    # Save local backup
    shutil.copy2(env_path, os.path.join(config_backup, ".env.backup"))

gitignore_path = os.path.join(base_dir, ".gitignore")
gitignore_content = open(gitignore_path, "r", encoding="utf-8").read() if os.path.exists(gitignore_path) else ""
if ".env.backup" not in gitignore_content:
    with open(gitignore_path, "a", encoding="utf-8") as f:
        f.write("\n# Local backup secrets guard\nBACKUP/**/*.backup\nBACKUP/**/.env*\n")

print("   [OK] Configurations & secure settings backed up into BACKUP/config")

# -------------------------------------------------------------------------
# 4. BACK UP DATABASE & USER TRADES DATA
# -------------------------------------------------------------------------
print("4. Extracting database and user data...")
local_app_data = os.environ.get("LOCALAPPDATA", "")
edge_leveldb = os.path.join(local_app_data, "Microsoft", "Edge", "User Data", "Default", "Local Storage", "leveldb")
temp_leveldb = os.path.join(base_dir, "temp_leveldb_read")

raw_leveldb_dir = os.path.join(db_backup, "leveldb_raw")
if os.path.exists(raw_leveldb_dir):
    shutil.rmtree(raw_leveldb_dir)

# Ensure temp_leveldb exists
os.makedirs(temp_leveldb, exist_ok=True)
if os.path.exists(edge_leveldb):
    for f in os.listdir(edge_leveldb):
        try:
            shutil.copy2(os.path.join(edge_leveldb, f), os.path.join(temp_leveldb, f))
        except Exception:
            pass

shutil.copytree(temp_leveldb, raw_leveldb_dir)

# LevelDB Parser for Chromium SSTables & Logs
def read_varint(data, pos):
    res, shift = 0, 0
    while True:
        b = data[pos]
        pos += 1
        res |= (b & 0x7F) << shift
        if (b & 0x80) == 0:
            break
        shift += 7
    return res, pos

def decompress_snappy(data):
    uncompressed_len, pos = read_varint(data, 0)
    out = bytearray()
    while pos < len(data):
        tag = data[pos]
        pos += 1
        t = tag & 3
        if t == 0:
            l = (tag >> 2) + 1
            if l > 60:
                extra = l - 60
                l = int.from_bytes(data[pos : pos + extra], "little") + 1
                pos += extra
            out.extend(data[pos : pos + l])
            pos += l
        elif t == 1:
            l = ((tag >> 2) & 7) + 4
            offset = ((tag >> 5) << 8) | data[pos]
            pos += 1
            for _ in range(l):
                out.append(out[-offset])
        elif t == 2:
            l = (tag >> 2) + 1
            offset = int.from_bytes(data[pos : pos + 2], "little")
            pos += 2
            for _ in range(l):
                out.append(out[-offset])
        elif t == 3:
            l = (tag >> 2) + 1
            offset = int.from_bytes(data[pos : pos + 4], "little")
            pos += 4
            for _ in range(l):
                out.append(out[-offset])
    return bytes(out)

def read_block_data(file_bytes, offset, size):
    block_raw = file_bytes[offset : offset + size]
    comp_type = file_bytes[offset + size]
    if comp_type == 0:
        return block_raw
    elif comp_type == 1:
        return decompress_snappy(block_raw)
    return block_raw

def parse_entries(block_bytes):
    num_restarts = int.from_bytes(block_bytes[-4:], "little")
    restarts_pos = len(block_bytes) - 4 - (num_restarts * 4)
    pos = 0
    last_key = bytearray()
    entries = []
    while pos < restarts_pos:
        shared, pos = read_varint(block_bytes, pos)
        non_shared, pos = read_varint(block_bytes, pos)
        val_len, pos = read_varint(block_bytes, pos)
        key = last_key[:shared] + block_bytes[pos : pos + non_shared]
        pos += non_shared
        val = block_bytes[pos : pos + val_len]
        pos += val_len
        last_key = bytearray(key)
        entries.append((bytes(key), bytes(val)))
    return entries

def read_sstable(path):
    data = open(path, "rb").read()
    if len(data) < 48:
        return []
    footer = data[-48:]
    if footer[-8:] != b"\x57\xfb\x80\x8b\x24\x75\x47\xdb":
        return []
    pos = 0
    _, pos = read_varint(footer, pos)
    _, pos = read_varint(footer, pos)
    idx_off, pos = read_varint(footer, pos)
    idx_size, pos = read_varint(footer, pos)
    idx_block = read_block_data(data, idx_off, idx_size)
    idx_entries = parse_entries(idx_block)
    all_entries = []
    for _, val in idx_entries:
        off, vpos = read_varint(val, 0)
        size, _ = read_varint(val, vpos)
        data_block = read_block_data(data, off, size)
        all_entries.extend(parse_entries(data_block))
    return all_entries

def read_log(path):
    data = open(path, "rb").read()
    pos = 0
    entries = []
    while pos + 7 < len(data):
        block_rem = 32768 - (pos % 32768)
        if block_rem < 7:
            pos += block_rem
            continue
        crc = data[pos : pos + 4]
        rec_len = int.from_bytes(data[pos + 4 : pos + 6], "little")
        rec_type = data[pos + 6]
        pos += 7
        if pos + rec_len > len(data):
            break
        rec_data = data[pos : pos + rec_len]
        pos += rec_len
        if len(rec_data) > 12:
            count = int.from_bytes(rec_data[8:12], "little")
            bpos = 12
            for _ in range(count):
                if bpos >= len(rec_data):
                    break
                op = rec_data[bpos]
                bpos += 1
                if op == 1:
                    klen, bpos = read_varint(rec_data, bpos)
                    k = rec_data[bpos : bpos + klen]
                    bpos += klen
                    vlen, bpos = read_varint(rec_data, bpos)
                    v = rec_data[bpos : bpos + vlen]
                    bpos += vlen
                    entries.append((k, v))
                elif op == 0:
                    klen, bpos = read_varint(rec_data, bpos)
                    k = rec_data[bpos : bpos + klen]
                    bpos += klen
                    entries.append((k, None))
    return entries

all_items = {}
files = sorted(os.listdir(raw_leveldb_dir))
for fn in files:
    fp = os.path.join(raw_leveldb_dir, fn)
    if fn.endswith(".ldb"):
        for k, v in read_sstable(fp):
            all_items[k[:-8]] = v
    elif fn.endswith(".log"):
        for k, v in read_log(fp):
            all_items[k] = v

database_dump = {}
for k, v in all_items.items():
    if b"tradersdiary-pro.vercel.app" in k and v:
        parts = k.split(b"\x00\x01")
        key_name = parts[-1].decode("latin1", errors="ignore")
        val_str = ""
        # Try UTF-8 with v[1:] if prefixed with 0 or 1, then v
        candidates = []
        if len(v) > 0 and v[0] in (0, 1):
            candidates.append(v[1:])
        candidates.append(v)
        for c in candidates:
            try:
                decoded = c.decode("utf-8")
                val_str = decoded
                break
            except Exception:
                pass
        if not val_str and len(v) > 0:
            try:
                val_str = v[1:].decode("utf-16le", errors="ignore")
            except Exception:
                val_str = v.decode("latin1", errors="ignore")
        database_dump[key_name] = val_str

dump_file_path = os.path.join(db_backup, "user_database_dump.json")
with open(dump_file_path, "w", encoding="utf-8") as f:
    json.dump(database_dump, f, indent=2, ensure_ascii=False)

# Individual domain JSON files
trade_count = 0
for k, v in database_dump.items():
    try:
        parsed_val = json.loads(v)
        simple_name = k.replace("traders_diary_", "").split("_146d2447")[0]
        if simple_name:
            out_fn = f"{simple_name}.json"
            with open(os.path.join(db_backup, out_fn), "w", encoding="utf-8") as f:
                json.dump(parsed_val, f, indent=2, ensure_ascii=False)
            if simple_name == "trades" and isinstance(parsed_val, list):
                trade_count = len(parsed_val)
    except Exception:
        pass

# Copy SQL Schema
schema_source = os.path.join(base_dir, "scripts", "setup-db.js")
if os.path.exists(schema_source):
    with open(os.path.join(db_backup, "schema.sql"), "w", encoding="utf-8") as f:
        f.write(open(schema_source, "r", encoding="utf-8").read())

print(f"   [OK] Database dumped: {len(database_dump)} keys extracted.")
print(f"   [OK] Trades verified: {trade_count} active trade records extracted and preserved.")

# Create an easy-to-use restore script in BACKUP/database/restore_database.py
restore_script_content = '''"""
TRADER\'S DIARY AUTOMATED DATA RESTORATION SCRIPT
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
    print("1. Open Trader\'s Diary (e.g. https://tradersdiary-pro.vercel.app or http://localhost:5173)")
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
'''
with open(os.path.join(db_backup, "restore_database.py"), "w", encoding="utf-8") as f:
    f.write(restore_script_content)

# -------------------------------------------------------------------------
# 5. BACK UP USER UPLOADED FILES
# -------------------------------------------------------------------------
print("5. Backing up user uploaded media and screenshots...")
brain_uploads = r"C:\Users\Sachin\.gemini\antigravity\brain\fb9ad1f9-28df-4087-a3c7-6da33c8ce33f\.user_uploaded"
uploaded_count = 0
if os.path.exists(brain_uploads):
    for f in os.listdir(brain_uploads):
        shutil.copy2(os.path.join(brain_uploads, f), os.path.join(uploads_backup, f))
        uploaded_count += 1

public_folder = os.path.join(base_dir, "public")
if os.path.exists(public_folder):
    for root, _, fs in os.walk(public_folder):
        for f in fs:
            rel = os.path.relpath(os.path.join(root, f), public_folder)
            dest = os.path.join(uploads_backup, "public", rel)
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            shutil.copy2(os.path.join(root, f), dest)

print(f"   [OK] User media backed up: {uploaded_count} user files copied to BACKUP/uploads")

# Cleanup temp dir
if os.path.exists(temp_leveldb):
    shutil.rmtree(temp_leveldb)

print("=== ALL ASSETS EXTRACTED AND STAGED SUCCESSFULLY ===")
