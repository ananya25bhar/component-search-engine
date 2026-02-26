import os
import subprocess

SYMBOL_DIR = "symbols"
SVG_DIR = "svgs"

KICAD_CLI = r"C:\Users\Delll\AppData\Local\Programs\KiCad\8.0\bin\kicad-cli.exe"

os.makedirs(SVG_DIR, exist_ok=True)

for file in os.listdir(SYMBOL_DIR):
    if not file.endswith(".kicad_sym"):
        continue

    input_path = os.path.join(SYMBOL_DIR, file)
    output_path = os.path.join(
        SVG_DIR,
        file.replace(".kicad_sym", ".svg")
    )

    subprocess.run([
        KICAD_CLI,
        "sym",
        "export",
        "svg",
        input_path,
        "-o",
        output_path,
        "--no-background"
    ])

print(" KiCad SVG symbol sheets generated")
