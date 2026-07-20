from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
W, H = 720, 405
FPS_MS = 60
FRAMES = 72


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf",
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            pass
    return ImageFont.load_default()


FONT_10 = font(10)
FONT_12 = font(12)
FONT_14 = font(14)
FONT_16_B = font(16, True)
FONT_18_B = font(18, True)


def rounded(draw: ImageDraw.ImageDraw, box, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def interp_path(points: list[tuple[float, float]], t: float) -> tuple[float, float]:
    segments = []
    total = 0.0
    for a, b in zip(points, points[1:]):
        d = math.hypot(b[0] - a[0], b[1] - a[1])
        segments.append((a, b, d))
        total += d
    dist = (t % 1.0) * total
    for a, b, d in segments:
        if dist <= d:
            u = dist / max(d, 1)
            return a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u
        dist -= d
    return points[-1]


def save_gif(frames: list[Image.Image], target: Path):
    target.parent.mkdir(parents=True, exist_ok=True)
    frames[0].save(
        target,
        save_all=True,
        append_images=frames[1:],
        duration=FPS_MS,
        loop=0,
        optimize=True,
        disposal=2,
    )


def draw_production_frame(i: int) -> Image.Image:
    img = Image.new("RGB", (W, H), "#f8f9fa")
    d = ImageDraw.Draw(img)
    d.rectangle((0, 0, W, H), fill="#f8f9fa")

    d.text((18, 14), "Semiconductor Fab - Rendered AMHS Animation", fill="#1f2937", font=FONT_16_B)
    d.text((18, 36), "OHT departs from stocker ports; bay processing is slowed", fill="#64748b", font=FONT_10)

    rail_y = [92, 188, 284]
    rail_x1, rail_x2 = 72, 660

    # Stockers.
    for x, label in [(24, "STOCKER A"), (660, "STOCKER B")]:
        rounded(d, (x, 72, x + 38, 304), 6, "#f1f5f9", "#94a3b8")
        d.text((x + 19, 188), label.replace(" ", "\n"), fill="#334155", font=FONT_10, anchor="mm", align="center")
        for y in rail_y:
            d.ellipse((x + 15, y - 4, x + 23, y + 4), fill="#f59e0b")

    # Rails.
    for y in rail_y:
        d.line((rail_x1, y, rail_x2, y), fill="#94a3b8", width=3)
        for x in range(rail_x1, rail_x2, 24):
            d.line((x, y - 4, x, y + 4), fill="#cbd5e1", width=1)
    for x in [168, 284, 400, 516, 632]:
        d.line((x, 72, x, 304), fill="#cbd5e1", width=2)

    colors = ["#3b82f6", "#14b8a6", "#f59e0b", "#a855f7"]
    names = ["Litho", "Etch", "Depo", "CMP"]
    t = i / FRAMES
    for r, y in enumerate([110, 206, 302]):
        for c, x in enumerate([96, 212, 328, 444, 560]):
            color = colors[(r + c) % len(colors)]
            name = names[(r + c) % len(names)]
            util = 0.42 + 0.22 * math.sin(t * math.tau + (r * 5 + c) * 0.65)
            rounded(d, (x, y, x + 88, y + 58), 5, color + "20", color + "55")
            d.text((x + 44, y + 6), name, fill=color, font=FONT_10, anchor="ma")
            for k in range(4):
                d.rectangle((x + 9 + k * 19, y + 20, x + 22 + k * 19, y + 42), fill=color + "55")
            d.rectangle((x + 9, y + 48, x + 79, y + 53), fill="#e5e7eb")
            d.rectangle((x + 9, y + 48, x + 9 + 70 * util, y + 53), fill=color)

    paths = [
        [(43, 92), (168, 92), (168, 188), (400, 188), (400, 226)],
        [(43, 188), (284, 188), (284, 92), (516, 92), (516, 130)],
        [(43, 284), (168, 284), (168, 188), (632, 188), (632, 226)],
        [(679, 92), (516, 92), (516, 284), (328, 284), (328, 322)],
        [(43, 92), (400, 92), (400, 284), (560, 284), (560, 322)],
    ]
    for idx, pts in enumerate(paths):
        x, y = interp_path(pts, (t * 0.42 + idx * 0.18) % 1)
        rounded(d, (x - 13, y - 7, x + 13, y + 7), 4, "#374151", "#6b7280", 2)
        d.rectangle((x - 8, y - 14, x + 8, y - 8), fill="#f59e0b", outline="#d97706")

    rounded(d, (506, 16, 698, 68), 8, "#ffffff", "#d1d5db")
    d.text((520, 28), "Throughput", fill="#374151", font=FONT_10)
    d.text((675, 28), f"{78 + int(4 * math.sin(t * math.tau))} lots/hr", fill="#111827", font=FONT_10, anchor="ra")
    d.text((520, 46), "Bay cycle", fill="#374151", font=FONT_10)
    d.text((675, 46), "slow/stable", fill="#111827", font=FONT_10, anchor="ra")
    return img


def draw_nextgen_frame(i: int) -> Image.Image:
    img = Image.new("RGB", (W, H), "#f8f9fa")
    d = ImageDraw.Draw(img)
    d.text((18, 14), "Meta-Learning TSP / VRP Solver - Rendered Animation", fill="#1f2937", font=FONT_16_B)
    d.text((18, 36), "Throttled operator updates for readable convergence", fill="#64748b", font=FONT_10)

    pts = [
        (98, 102), (168, 78), (238, 118), (304, 90), (376, 126), (444, 84),
        (522, 118), (590, 178), (536, 260), (444, 300), (344, 270),
        (258, 318), (168, 274), (102, 208)
    ]
    t = i / FRAMES
    progress = min(1, (i / (FRAMES - 1)) * 1.15)
    route = list(range(len(pts)))
    if progress > 0.25:
        route[3], route[9] = route[9], route[3]
    if progress > 0.50:
        route[5], route[11] = route[11], route[5]
    if progress > 0.75:
        route[1], route[7] = route[7], route[1]

    # Background grid.
    for x in range(40, W, 40):
        for y in range(68, H - 20, 40):
            d.ellipse((x - 1, y - 1, x + 1, y + 1), fill="#d1d5db")

    # Initial faint complete graph.
    for a in range(len(pts)):
        for b in range(a + 1, len(pts)):
            if (a * 7 + b * 3) % 5 == 0:
                d.line((pts[a], pts[b]), fill="#d8b4fe", width=1)

    def draw_route(order, color, width):
        coords = [pts[k] for k in order] + [pts[order[0]]]
        for p, q in zip(coords, coords[1:]):
            d.line((p, q), fill=color, width=width)

    draw_route(list(range(len(pts))), "#a78bfa", 2)
    draw_route(route, "#22d3ee", 3)

    swap_pair = (route[(i // 12) % len(route)], route[(i // 12 + 4) % len(route)])
    d.line((pts[swap_pair[0]], pts[swap_pair[1]]), fill="#f59e0b", width=3)
    for idx, p in enumerate(pts):
        r = 7 if idx in swap_pair else 5
        fill = "#ef4444" if idx == 0 else ("#f59e0b" if idx in swap_pair else "#818cf8")
        d.ellipse((p[0] - r, p[1] - r, p[0] + r, p[1] + r), fill=fill, outline="#6366f1")
        label = "D" if idx == 0 else str(idx)
        d.text(p, label, fill="#111827", font=FONT_10, anchor="mm")

    rounded(d, (482, 16, 700, 88), 8, "#ffffff", "#d1d5db")
    d.text((498, 30), "Operator", fill="#374151", font=FONT_10)
    ops = ["2-opt", "Relocate", "Swap", "Cross"]
    op = ops[(i // 18) % len(ops)]
    d.text((682, 30), op, fill="#7c3aed", font=FONT_10, anchor="ra")
    d.text((498, 50), "Step interval", fill="#374151", font=FONT_10)
    d.text((682, 50), "4 frames", fill="#7c3aed", font=FONT_10, anchor="ra")
    d.text((498, 70), "Improvement", fill="#374151", font=FONT_10)
    d.text((682, 70), f"-{8 + int(progress * 22)}%", fill="#16a34a", font=FONT_10, anchor="ra")

    # Convergence chart.
    rounded(d, (424, 302, 700, 386), 8, "#ffffff", "#d1d5db")
    d.text((438, 316), "Convergence", fill="#374151", font=FONT_10)
    chart = []
    for k in range(44):
        v = 0.92 - min(k / 44, progress) * 0.28 + 0.018 * math.sin(k * 0.5 + t * math.tau)
        chart.append(v)
    mn, mx = min(chart), max(chart)
    coords = []
    for k, v in enumerate(chart):
        x = 438 + k * 5.6
        y = 374 - (v - mn) / max(mx - mn, 0.01) * 42
        coords.append((x, y))
    for p, q in zip(coords, coords[1:]):
        d.line((p, q), fill="#7c3aed", width=2)
    return img


def main():
    production = [draw_production_frame(i) for i in range(FRAMES)]
    nextgen = [draw_nextgen_frame(i) for i in range(FRAMES)]
    save_gif(production, ROOT / "figures/about/ProductionOptimizaiton/production-optimization-animation.gif")
    save_gif(nextgen, ROOT / "figures/about/NextgenOptimization/nextgen-optimization-animation.gif")


if __name__ == "__main__":
    main()
