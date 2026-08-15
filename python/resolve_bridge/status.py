"""Report the current DaVinci Resolve link state as a single JSON object.

Invoked on a timer by the NestJS StatusPollerService. Always prints exactly one
JSON object and exits 0 — "Resolve is closed" is a normal answer, not a failure.

    python3 -m resolve_bridge.status
"""

from __future__ import annotations

from typing import Any, Dict, Optional

from . import _resolve


def _status(
    state: str,
    project: Optional[str] = None,
    timeline: Optional[str] = None,
    playhead: Optional[str] = None,
    detail: Optional[str] = None,
) -> Dict[str, Any]:
    """Shape matches the ResolveStatus interface in @lower-thirds/shared."""
    return {
        "state": state,
        "projectName": project,
        "timelineName": timeline,
        "playhead": playhead,
        "detail": detail,
    }


def main() -> Dict[str, Any]:
    resolve, err = _resolve.connect()
    if err is not None:
        # Not running / not installed / scripting disabled: all read as
        # 'disconnected' in the UI, with the reason surfaced as detail.
        return _resolve.success(
            _status("disconnected", detail=err["error"]["message"]),
        )

    project, timeline, err = _resolve.current_timeline(resolve)
    if err is not None:
        code = err["error"]["code"]
        if code in (_resolve.ERR_NO_PROJECT, _resolve.ERR_NO_TIMELINE):
            project_name = None
            if project is not None:
                try:
                    project_name = project.GetName()
                except Exception:  # noqa: BLE001
                    project_name = None
            return _resolve.success(
                _status("no-project", project=project_name, detail=err["error"]["message"]),
            )
        return _resolve.success(_status("disconnected", detail=err["error"]["message"]))

    try:
        project_name = project.GetName()
    except Exception:  # noqa: BLE001
        project_name = None

    try:
        timeline_name = timeline.GetName()
    except Exception:  # noqa: BLE001
        timeline_name = None

    try:
        playhead = timeline.GetCurrentTimecode()
    except Exception:  # noqa: BLE001
        playhead = None

    return _resolve.success(
        _status("connected", project=project_name, timeline=timeline_name, playhead=playhead),
    )


if __name__ == "__main__":
    _resolve.run(main)
