# -----------------------------
# KiCad Python script to export all schematics / footprints as PNG
# Works for .kicad_sch and .kicad_mod files
# -----------------------------

import os
import pcbnew
import subprocess

# ---------- CONFIG ----------
# Folder where KiCad schematic / footprint files are located
kicad_folder = r"C:\Users\Delll\OneDrive\Desktop\component-search engine\data\symbols"

# Folder to save PNG thumbnails
output_folder = r"C:\Users\Delll\OneDrive\Desktop\component-search engine\data\thumbnails"

# KiCad eeschema / footprint CLI path (change if different)
eeschema_exe = r"C:\Program Files\KiCad\bin\eeschema.exe"
pcbnew_exe = r"C:\Program Files\KiCad\bin\pcbnew.exe"
# -----------------------------

if not os.path.exists(output_folder):
    os.makedirs(output_folder)

# Iterate over all files
for root, dirs, files in os.walk(kicad_folder):
    for file in files:
        if file.endswith(".kicad_sch"):
            filepath = os.path.join(root, file)
            output_png = os.path.join(output_folder, os.path.splitext(file)[0] + ".png")
            # Run KiCad eeschema export as PNG
            try:
                subprocess.run([eeschema_exe, "-x", filepath, "--export", output_png], check=True)
                print(f"✅ Converted: {file}")
            except Exception as e:
                print(f"❌ Failed: {file} | {e}")

        elif file.endswith(".kicad_mod"):
            filepath = os.path.join(root, file)
            output_png = os.path.join(output_folder, os.path.splitext(file)[0] + ".png")
            # Run KiCad footprint export as PNG via pcbnew
            try:
                subprocess.run([pcbnew_exe, "-x", filepath, "--export", output_png], check=True)
                print(f"✅ Converted: {file}")
            except Exception as e:
                print(f"❌ Failed: {file} | {e}")

print("🎉 All done! PNG thumbnails are ready in:", output_folder)
