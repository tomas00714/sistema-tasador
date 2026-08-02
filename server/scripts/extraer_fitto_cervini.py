"""
Extrae tablas Fitto-Cervini del PDF a JSON.
Uso: python scripts/extraer_fitto_cervini.py [ruta_pdf]
"""
import json
import re
import sys
from pathlib import Path

import pdfplumber

DEFAULT_PDF = Path(
    r"c:\Users\tomas\Downloads\135185937-Tabla-Fitte-y-Cervini.pdf"
)
OUT = Path(__file__).resolve().parent.parent / "tablas" / "fitto_cervini_data.json"


def parse_frente_range(text: str):
    m = re.search(
        r"FRENTE\s+([\d.,]+)\s*[–\-]\s*([\d.,]+)\s*m",
        text,
        re.I,
    )
    if m:
        return float(m.group(1).replace(",", ".")), float(
            m.group(2).replace(",", ".")
        )
    return None, None


def parse_page(text: str):
    if "FRENTE EN METROS" not in text.upper():
        return []

    frente_min, frente_max = parse_frente_range(text)
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    frentes = None
    rows = {}
    tablas = []

    for line in lines:
        if line.upper().startswith("FRENTE EN METROS"):
            if frentes and rows:
                tablas.append(
                    {
                        "frente_min": frente_min,
                        "frente_max": frente_max,
                        "frentes": frentes,
                        "fondos": sorted(int(k) for k in rows),
                        "valores": {k: dict(v) for k, v in rows.items()},
                    }
                )
                rows = {}
            continue

        nums_header = re.findall(r"\d+\.\d+", line)
        if (
            frentes is None
            and len(nums_header) >= 10
            and "TABLA" not in line.upper()
        ):
            frentes = [float(x) for x in nums_header]
            if frente_min is None and frentes:
                frente_min = frentes[0]
                frente_max = frentes[-1]
            continue

        m = re.match(r"^(\d{2})\s+(.+)$", line)
        if m and frentes:
            fondo = int(m.group(1))
            nums = [
                float(x)
                for x in re.findall(r"\d+\.\d+", m.group(2))
            ]
            if len(nums) >= len(frentes):
                rows[str(fondo)] = dict(
                    zip(
                        [str(f) for f in frentes],
                        nums[: len(frentes)],
                    )
                )

    if frentes and rows:
        tablas.append(
            {
                "frente_min": frente_min,
                "frente_max": frente_max,
                "frentes": frentes,
                "fondos": sorted(int(k) for k in rows),
                "valores": {k: dict(v) for k, v in rows.items()},
            }
        )

    return tablas


def merge_tablas(tablas):
    merged = {}
    for t in tablas:
        key = (t["frente_min"], t["frente_max"])
        if key not in merged:
            merged[key] = t
            continue
        base = merged[key]
        for fondo, vals in t["valores"].items():
            base["valores"][fondo] = vals
        base["fondos"] = sorted(
            {int(f) for f in base["valores"].keys()}
        )
    return list(merged.values())


def main():
    pdf_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_PDF
    if not pdf_path.exists():
        print(f"No existe: {pdf_path}")
        sys.exit(1)

    todas = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text() or ""
            todas.extend(parse_page(text))

    unicas = merge_tablas(todas)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump({"tablas": unicas}, f, indent=2, ensure_ascii=False)

    print(f"Guardado: {OUT}")
    print(f"Tablas: {len(unicas)}")
    for t in unicas:
        print(
            f"  frente {t['frente_min']}-{t['frente_max']} m, "
            f"{len(t['frentes'])} cols, "
            f"fondos {t['fondos'][0]}-{t['fondos'][-1]} "
            f"({len(t['fondos'])} filas)"
        )


if __name__ == "__main__":
    main()
