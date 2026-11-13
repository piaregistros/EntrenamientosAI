#!/usr/bin/env python3
"""Pictogramas originales de ejercicio (Fase 9).

Trazo uniforme, 64×64, cabeza rellena. Se escriben en public/icons/.
Dibujo propio (no se usa un set de terceros). El trazo es #000 para poder
aplicar currentColor en la interfaz con una máscara CSS.

Uso (desde la raíz del repo): python3 scripts/generate-icons.py
"""
from __future__ import annotations
import math
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "public" / "icons"
SW = 2.7

def head(cx, cy, r=4.3) -> str:
    return f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r}" fill="#000" stroke="none"/>'

def line(x1, y1, x2, y2, sw=None) -> str:
    extra = f' stroke-width="{sw}"' if sw else ""
    return f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}"{extra}/>'

def path(d: str, sw=None, fill=None) -> str:
    extra = ""
    if sw: extra += f' stroke-width="{sw}"'
    if fill: extra += f' fill="{fill}"'
    return f'<path d="{d}"{extra}/>'

def circ(cx, cy, r, sw=None, fill=False) -> str:
    extra = f' stroke-width="{sw}"' if sw else ""
    if fill:
        return f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r}" fill="#000" stroke="none"/>'
    return f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r}"{extra}/>'

def barbell(x1, y, x2, pr=3.3) -> list[str]:
    return [
        line(x1, y, x2, y, 2.4),
        circ(x1, y, pr, 2.2),
        circ(x2, y, pr, 2.2),
        circ(x1, y, max(1.4, pr - 1.5), 1.8),
        circ(x2, y, max(1.4, pr - 1.5), 1.8),
    ]

def dumbbell(cx, cy, angle=0, half=5.0, pr=2.15) -> list[str]:
    a = math.radians(angle)
    dx, dy = half * math.cos(a), half * math.sin(a)
    return [
        line(cx - dx, cy - dy, cx + dx, cy + dy, 2.2),
        circ(cx - dx, cy - dy, pr, 2.0),
        circ(cx + dx, cy + dy, pr, 2.0),
    ]

def handle(cx, cy, r=1.6) -> str:
    return circ(cx, cy, r, fill=True)

def svg(name: str, parts: list[str]) -> str:
    body = "\n  ".join(parts)
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"'
        f' fill="none" stroke="#000" stroke-width="{SW}" stroke-linecap="round" stroke-linejoin="round">\n'
        f'  <title>{name}</title>\n'
        f'  {body}\n'
        f'</svg>\n'
    )

# ---------------------------------------------------------------------------
# 26 pictogramas. La pose (no el aparato) es lo que debe leerse a 24 px.
# ---------------------------------------------------------------------------

ICONS: dict[str, tuple[str, list[str]]] = {}

# 1. Press banca (tumbado, barra arriba) — vista de lado
ICONS["banca"] = ("Press banca con barra", [
    path("M 8 42 H 56"),
    path("M 16 42 V 57"),
    path("M 50 42 V 57"),
    head(14, 34),
    path("M 18.5 36.5 H 42"),
    path("M 42 36.5 L 50 42 L 57 40"),
    path("M 32 36.5 V 17"),
    *barbell(16, 15, 48, 3.2),
])

# 2. Aperturas / cruce de poleas — frente, brazos en arco
ICONS["aperturas"] = ("Aperturas de pecho / cruce de poleas", [
    head(32, 11),
    path("M 32 15.5 V 38"),
    path("M 22 40 H 42"),
    path("M 26 40 V 57"),
    path("M 38 40 V 57"),
    path("M 32 20 Q 14 16 8 30"),
    path("M 32 20 Q 50 16 56 30"),
    handle(8, 30),
    handle(56, 30),
])

# 3. Press de hombros — frente, barra encima de la cabeza
ICONS["hombro"] = ("Press de hombros", [
    *barbell(17, 8, 47, 3.1),
    head(32, 18.5),
    path("M 32 23 V 42"),
    path("M 32 42 L 23 57"),
    path("M 32 42 L 41 57"),
    path("M 32 25 L 26 9"),
    path("M 32 25 L 38 9"),
])

# 4. Elevaciones laterales — frente, brazos en T con mancuernas
ICONS["lateral"] = ("Elevaciones laterales", [
    head(32, 10.5),
    path("M 32 15 V 40"),
    path("M 32 40 L 23 57"),
    path("M 32 40 L 41 57"),
    path("M 32 20 L 9 24"),
    path("M 32 20 L 55 24"),
    *dumbbell(9, 24, 20, 4.6),
    *dumbbell(55, 24, -20, 4.6),
])

# 5. Pájaros — bisagra, brazos abiertos (deltoides posterior)
ICONS["pajaros"] = ("Pájaros (deltoides posterior)", [
    path("M 24 42 H 46"),              # asiento
    path("M 44 22 V 42", 2.2),         # apoyo de pecho (máquina)
    head(36, 16),
    path("M 36 20.5 V 42"),
    path("M 36 42 L 30 57"),
    path("M 36 42 L 44 57"),
    path("M 34 24 L 16 18"),           # brazo abriéndose hacia atrás
    *dumbbell(16, 18, 20, 4.4),
])

# 6. Face pull — codos altos, manos a la cara, polea
ICONS["face_pull"] = ("Face pull", [
    head(26, 14),
    path("M 26 18.5 V 40"),
    path("M 26 40 L 18 57"),
    path("M 26 40 L 36 57"),
    path("M 26 22 L 14 16 L 30 14"),  # codo atrás y alto, mano a la cara
    handle(30, 14),
    line(30, 14, 54, 8, 2.0),         # cable hacia la polea
    path("M 30 14 L 28 20", 2.0),     # cabo de la cuerda
    path("M 30 14 L 34 20", 2.0),
])

# 7. Jalón al pecho — sentado, barra ancha arriba
ICONS["jalon"] = ("Jalón al pecho", [
    line(32, 2, 32, 8, 2.0),
    path("M 12 8 H 52", 2.4),  # barra ancha
    head(32, 20),
    path("M 32 24.5 V 42"),
    path("M 22 42 H 42"),
    path("M 26 42 V 57"),
    path("M 38 42 V 57"),
    path("M 32 26 L 16 8"),
    path("M 32 26 L 48 8"),
])

# 8. Remo sentado — de lado, cable horizontal
ICONS["remo"] = ("Remo sentado", [
    path("M 12 42 H 30"),             # asiento
    path("M 14 42 V 50"),
    head(22, 22),
    path("M 22 26.5 V 42"),
    path("M 22 42 L 48 42 L 52 36"),  # piernas al apoyapiés
    path("M 50 36 V 50", 2.2),        # placa de pies
    path("M 24 28 L 18 34 L 34 30"),  # brazo remando
    handle(34, 30),
    line(34, 30, 60, 30, 2.0),        # cable
])

# 9. Pullover en polea — de lado, brazos en arco alto
ICONS["pullover"] = ("Pullover en polea", [
    line(52, 3, 46, 18, 2.0),
    head(22, 14),
    path("M 23 18.5 L 27 40"),
    path("M 27 40 L 20 57"),
    path("M 27 40 L 36 57"),
    path("M 25 21 Q 34 6 46 18"),
    handle(46, 18),
])

# 10. Curl de bíceps — de lado, mancuerna en 90°
ICONS["curl"] = ("Curl de bíceps", [
    head(26, 11),
    path("M 26 15.5 V 40"),
    path("M 26 40 L 20 57"),
    path("M 26 40 L 34 57"),
    path("M 28 20 L 32 33 L 43 23"),
    *dumbbell(43, 23, 25, 5.0),
])

# 11. Extensión de tríceps en polea (jalón hacia abajo)
ICONS["triceps"] = ("Extensión de tríceps en polea", [
    head(20, 12),
    path("M 20 16.5 V 40"),
    path("M 20 40 L 14 57"),
    path("M 20 40 L 28 57"),
    path("M 22 20 L 26 34 H 40"),     # codo a 90°, antebrazo al frente
    handle(40, 34),
    line(40, 34, 40, 4, 2.0),         # cable vertical
])

# 12. Extensión por encima de la cabeza / press francés
ICONS["triceps_alto"] = ("Extensión de tríceps por encima de la cabeza", [
    head(38, 22),
    path("M 36 26.5 V 42"),
    path("M 36 42 L 27 57"),
    path("M 36 42 L 45 57"),
    path("M 34 24 L 30 8 L 16 18"),   # codo arriba, peso detrás de la cabeza
    *dumbbell(16, 18, 65, 4.8, 2.3),
])

# 13. Sentadilla — de lado, muslos paralelos, barra atrás
ICONS["sentadilla"] = ("Sentadilla", [
    *barbell(12, 22, 38, 3.1),
    head(22, 15),
    path("M 24 22 L 28 38"),          # torso ligeramente inclinado
    path("M 28 38 H 44"),             # muslo paralelo
    path("M 44 38 L 42 56"),          # tibia
    path("M 35 56 H 51"),             # pie
])

# 14. Prensa de piernas — reclinado, trineo
ICONS["prensa"] = ("Prensa de piernas", [
    path("M 8 22 L 26 46"),           # respaldo
    path("M 8 46 H 28"),              # asiento
    path("M 36 52 L 58 22", 2.2),     # raíl
    head(11, 20),
    path("M 14 24 L 26 42"),          # espalda
    path("M 26 42 L 42 32 L 52 22"),  # piernas empujando
    path("M 46 28 L 56 18", 2.4),     # plataforma
])

# 15. Extensión de cuádriceps — sentado de lado, pierna hacia fuera
ICONS["extension_cuadriceps"] = ("Extensión de cuádriceps", [
    path("M 16 20 V 40 H 38"),        # respaldo + asiento
    path("M 16 40 V 48"),
    head(20, 14),
    path("M 20 18.5 V 40"),
    path("M 20 40 H 40"),             # muslo
    path("M 40 40 L 54 30"),          # pierna extendida
    path("M 50 28 L 58 34", 2.4),     # rodillo del tobillo
])

# 16. Zancada / búlgara / step-up — de lado, split
ICONS["zancada"] = ("Zancada / sentadilla búlgara / step-up", [
    head(30, 11),
    path("M 30 15.5 V 36"),
    path("M 30 36 L 44 36 L 46 56"),  # pierna delantera (rodilla 90°)
    path("M 38 56 H 52"),
    path("M 30 36 L 16 50 L 12 56"),  # pierna trasera
    path("M 8 56 H 18"),
    *dumbbell(24, 32, 90, 4.2),
])

# 17. Elevación de gemelos — de puntillas, sobre un escalón
ICONS["gemelo"] = ("Elevación de gemelos", [
    path("M 14 56 H 50"),             # escalón
    path("M 20 16 H 44", 2.4),        # almohadilla sobre los hombros
    head(32, 9),
    path("M 32 14 V 36"),
    path("M 32 36 L 36 52"),          # pierna casi recta
    path("M 26 44 L 40 54"),          # pie de puntillas: talón alto, punta en el borde
])

# 18. Hip thrust — hombros en banco, cadera alta, barra
ICONS["hip"] = ("Hip thrust", [
    path("M 6 40 H 26"),
    path("M 10 40 V 57"),
    path("M 22 40 V 57"),
    head(12, 33),
    path("M 16 35 L 36 20"),          # torso en puente
    path("M 36 20 L 48 38"),          # muslo
    path("M 48 38 L 50 56"),          # tibia
    path("M 44 56 H 56"),
    *barbell(24, 18, 48, 3.1),
])

# 19. Peso muerto rumano — bisagra, espalda plana, barra en manos
ICONS["peso_muerto"] = ("Peso muerto rumano", [
    path("M 24 56 H 44"),
    path("M 34 56 L 36 42"),          # tibia, rodilla suave
    path("M 36 42 L 28 40"),          # muslo, cadera atrás
    path("M 28 40 L 16 24"),          # espalda plana
    head(13, 18),
    path("M 18 26 L 30 44"),          # brazos largos
    *barbell(14, 44, 46, 3.2),
])

# 20. Curl femoral — tumbado boca abajo, talones hacia el glúteo
ICONS["curl_femoral"] = ("Curl femoral", [
    path("M 6 36 H 48"),
    path("M 12 36 V 52"),
    path("M 42 36 V 52"),
    head(12, 28),
    path("M 16 30 H 40"),
    path("M 40 32 L 46 16 L 32 12"),  # piernas en C, talones hacia el glúteo
    path("M 28 11 L 36 15", 2.4),
])

# 21. Abducción de cadera — frente, piernas en V
ICONS["abduccion"] = ("Abducción de cadera", [
    head(32, 10),
    path("M 32 14.5 V 34"),
    path("M 22 36 H 42"),             # asiento
    path("M 32 36 L 14 48 L 14 57"),  # pierna abierta
    path("M 32 36 L 50 48 L 50 57"),
    path("M 11 45 V 52", 2.4),        # almohadillas
    path("M 53 45 V 52", 2.4),
])

# 22. Patada de glúteo — a cuatro patas, una pierna atrás
ICONS["patada_gluteo"] = ("Patada de glúteo / extensión de cadera", [
    path("M 6 50 H 40", 2.0),
    head(12, 30),
    path("M 16 34 L 34 36"),          # espalda
    path("M 16 34 L 16 50"),          # brazo de apoyo
    path("M 34 36 L 32 50"),          # rodilla de apoyo
    path("M 34 36 L 54 24"),          # pierna empujando atrás/arriba
])

# 23. Plancha — cuerpo recto, apoyado en antebrazos
ICONS["plancha"] = ("Plancha", [
    path("M 6 50 H 58", 2.0),
    head(11, 33),
    path("M 15 37 H 50"),             # cuerpo en línea
    path("M 16 37 V 50"),             # codo bajo el hombro
    path("M 16 50 H 24"),             # antebrazo
    path("M 50 37 L 52 50"),          # pies de puntillas
])

# 24. Crunch — tumbado, hombros despegados, rodillas dobladas
ICONS["crunch"] = ("Crunch", [
    path("M 6 50 H 58", 2.0),
    head(16, 26),
    path("M 20 30 L 30 46"),          # torso encogido
    path("M 30 46 L 44 34 L 50 50"),  # piernas flexionadas
])

# 25. Pallof press — de pie, mango al pecho, cable a un lado
ICONS["pallof"] = ("Pallof press", [
    head(24, 11),
    path("M 24 15.5 V 40"),
    path("M 24 40 L 12 57"),
    path("M 24 40 L 36 57"),
    path("M 24 22 H 38"),
    handle(38, 22),
    line(38, 22, 60, 22, 2.0),
])

# 26. Elevación de rodillas — colgado, rodillas arriba
ICONS["elevacion_rodillas"] = ("Elevación de rodillas", [
    path("M 12 8 H 48", 2.4),
    path("M 24 8 V 20"),
    head(24, 25),
    path("M 24 29.5 L 26 42"),
    path("M 26 42 H 44 L 40 24"),     # muslos horizontales, pantorrillas recogidas
])


def write_all(dest: Path) -> None:
    dest.mkdir(parents=True, exist_ok=True)
    for key, (title, parts) in ICONS.items():
        (dest / f"{key}.svg").write_text(svg(title, parts), encoding="utf-8")
    print(f"escritos {len(ICONS)} svg en {dest}")


if __name__ == "__main__":
    write_all(OUT)
