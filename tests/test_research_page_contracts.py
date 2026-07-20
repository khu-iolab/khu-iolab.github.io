from pathlib import Path

from PIL import Image, ImageSequence


ROOT = Path(__file__).resolve().parents[1]
RESEARCH = ROOT / "research.html"
LANG = ROOT / "lang.js"


def test_research_pipeline_steps_are_removed():
    html = RESEARCH.read_text(encoding="utf-8")
    lang = LANG.read_text(encoding="utf-8")

    removed_fragments = [
        "research-pipeline",
        "pipe-step",
        "pipe-num",
        "pipe-lbl",
        "pipe-sep",
        "research.logistics.pipe",
        "research.network.pipe",
        "research.production.pipe",
        "research.nextgen.pipe",
    ]

    for fragment in removed_fragments:
        assert fragment not in html
        assert fragment not in lang


def test_production_and_nextgen_do_not_use_live_animation_iframes():
    html = RESEARCH.read_text(encoding="utf-8")

    assert "sim3d_fab.html" not in html
    assert "sim3d_solver.html" not in html


def test_production_and_nextgen_use_rendered_animation_assets():
    html = RESEARCH.read_text(encoding="utf-8")

    assert 'src="figures/about/ProductionOptimizaiton/production-optimization-animation.gif?v=20260714-fast1"' in html
    assert 'src="figures/about/NextgenOptimization/nextgen-optimization-animation.gif?v=20260714-fast1"' in html
    assert "sim3d_fab.html" not in html
    assert "sim3d_solver.html" not in html


def test_rendered_animation_assets_use_faster_frame_duration():
    animation_paths = [
        ROOT / "figures/about/ProductionOptimizaiton/production-optimization-animation.gif",
        ROOT / "figures/about/NextgenOptimization/nextgen-optimization-animation.gif",
    ]

    for path in animation_paths:
        with Image.open(path) as animation:
            durations = {frame.info.get("duration") for frame in ImageSequence.Iterator(animation)}

        assert durations == {60}
