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


def test_non_logistics_research_tabs_have_three_topic_cards():
    html = RESEARCH.read_text(encoding="utf-8")
    lang = LANG.read_text(encoding="utf-8")

    for tab in ["network", "production", "nextgen"]:
        assert f'id="tab-{tab}"' in html

        for topic_id in range(1, 4):
            title_key = f"research.{tab}.topic{topic_id}.title"
            desc_key = f"research.{tab}.topic{topic_id}.desc"

            assert f'data-i18n="{title_key}"' in html
            assert f'data-i18n="{desc_key}"' in html
            assert f"'{title_key}'" in lang
            assert f"'{desc_key}'" in lang


def test_production_and_nextgen_use_rendered_animation_assets():
    html = RESEARCH.read_text(encoding="utf-8")

    assert 'src="figures/about/PO2.gif"' in html
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
