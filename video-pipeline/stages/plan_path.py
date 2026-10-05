"""Where the pipeline finds the scene plan.

Convention (set by the U1 review pass): the reviewed, human-approved plan
lives at ``episodes/<ep>/scene_plan.json``. The pipeline's working copy is
``episodes/<ep>/work/scene_plan.json`` (what an iterating agent edits).

Resolution prefers the working copy, then falls back to the reviewed
episode-root plan, so ``pipeline.py --episode u1-e2`` works out of the box
instead of dying with "no scene plan yet" — the dead end that previously
pushed agents into improvising their own render scripts.
"""
import os


def resolve_plan(ep_dir):
    """Return (plan_path, source) where source is 'work', 'episode-root',
    or 'missing'."""
    work = os.path.join(ep_dir, "work", "scene_plan.json")
    if os.path.exists(work):
        return work, "work"
    root = os.path.join(ep_dir, "scene_plan.json")
    if os.path.exists(root):
        return root, "episode-root"
    return work, "missing"
