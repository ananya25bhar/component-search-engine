import os
import subprocess

base = os.path.dirname(os.path.abspath(__file__))
schem_dir = os.path.join(base, "data", "schematics")

# ✅ CHANGE HERE
thumb_dir = os.path.join(base, "data", "svgs")

# ✅ ensure folder exists
os.makedirs(thumb_dir, exist_ok=True)

kicad_cli = r"C:\Program Files\KiCad\9.0\bin\kicad-cli.exe"

for root, _, files in os.walk(schem_dir):
    for f in files:
        if not f.endswith(".kicad_sch"):
            continue

        sch = os.path.join(root, f)
        name = os.path.splitext(f)[0]
        svg_path = os.path.join(thumb_dir, name + ".svg")

        if os.path.exists(svg_path):
            print(f"[SKIP] {name}.svg exists")
            continue

        cmd = [
            kicad_cli,
            "sch", "export", "svg",
            "-o", svg_path,
            sch
        ]

        try:
            subprocess.run(cmd, check=True)
            print(f"[DONE] {f} → {name}.svg")
        except subprocess.CalledProcessError:
            print(f"[ERROR] {f}")
