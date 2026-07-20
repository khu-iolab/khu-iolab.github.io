from pathlib import Path
import re


ROOT = Path(__file__).resolve().parents[1]
FAB = ROOT / "figures/about/ProductionOptimizaiton/sim3d_fab.html"
SOLVER = ROOT / "figures/about/NextgenOptimization/sim3d_solver.html"


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def test_fab_oht_routes_start_from_stockers():
    html = read(FAB)

    assert "function stockerPort" in html
    assert "const sourceStocker" in html
    assert "{ x:stocker.x, y:stocker.y }" in html


def test_fab_bay_utilization_is_stateful_and_throttled():
    html = read(FAB)

    assert "const BAY_UTIL_UPDATE_FRAMES" in html
    assert "function updateBayUtilization" in html
    assert "util:Math.random()" not in html


def test_nextgen_solver_steps_are_throttled_for_readability():
    html = read(SOLVER)

    assert "const STEP_INTERVAL_FRAMES" in html
    assert "phaseTimer % STEP_INTERVAL_FRAMES === 0" in html

    improve_match = re.search(r"const IMPROVE_DUR\s*=\s*(\d+)", html)
    assert improve_match is not None
    assert int(improve_match.group(1)) >= 600
