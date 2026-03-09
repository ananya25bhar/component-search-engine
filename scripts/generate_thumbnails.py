import os
import subprocess
import re

base = os.path.dirname(os.path.abspath(__file__))
schem_dir = os.path.join(base, "data", "schematics")
svg_dir = os.path.join(base, "data", "svgs")

os.makedirs(svg_dir, exist_ok=True)

kicad_cli = r"C:\Program Files\KiCad\9.0\bin\kicad-cli.exe"

def is_valid_name(name):
    """
    Accept only real component-like names
    Reject values like -2v5, 3v3, 10k, etc.
    """
    return bool(re.match(r"^[A-Za-z][A-Za-z0-9_]+$", name))

for root, _, files in os.walk(schem_dir):
    for f in files:
        if not f.endswith(".kicad_sch"):
            continue

        raw_name = os.path.splitext(f)[0].strip()

        #  skip garbage names
        if not is_valid_name(raw_name):
            print(f"[SKIP] Invalid name: {raw_name}")
            continue

        svg_path = os.path.join(svg_dir, raw_name + ".svg")

        if os.path.exists(svg_path):
            print(f"[SKIP] {raw_name}.svg exists")
            continue

        sch_path = os.path.join(root, f)

        cmd = [
            kicad_cli,
            "sch", "export", "svg",
            "-o", svg_path,
            sch_path
        ]

        try:
            subprocess.run(cmd, check=True)
            print(f"[DONE] {raw_name}.svg")
        except subprocess.CalledProcessError:
            print(f"[ERROR] Failed: {raw_name}")
