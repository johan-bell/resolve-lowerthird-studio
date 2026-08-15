"""Locate and connect to the DaVinci Resolve scripting API.

Every bridge script goes through here. Nothing in this module raises: callers
get either a live Resolve handle or a structured error they can print as JSON,
so the NestJS side never has to parse a traceback.

Targets Python 3.6+ (macOS system python is 3.9) — no f-strings with '=',
no walrus, no PEP 604 unions.
"""

from __future__ import annotations

import importlib.util
import json
import os
import sys
import traceback
from typing import Any, Dict, Optional, Tuple

# Where a stock macOS DaVinci Resolve install puts the scripting bits.
DEFAULT_SCRIPT_API = (
    "/Library/Application Support/Blackmagic Design/DaVinci Resolve/Developer/Scripting"
)
DEFAULT_SCRIPT_LIB = (
    "/Applications/DaVinci Resolve/DaVinci Resolve.app"
    "/Contents/Libraries/Fusion/fusionscript.so"
)

# Error codes shared with the TypeScript layer (see resolve.service.ts).
ERR_API_MISSING = "RESOLVE_API_NOT_FOUND"
ERR_LIB_MISSING = "RESOLVE_LIB_NOT_FOUND"
ERR_IMPORT_FAILED = "RESOLVE_IMPORT_FAILED"
ERR_NOT_RUNNING = "RESOLVE_NOT_RUNNING"
ERR_NO_PROJECT = "RESOLVE_NO_PROJECT"
ERR_NO_TIMELINE = "RESOLVE_NO_TIMELINE"
ERR_UNEXPECTED = "RESOLVE_UNEXPECTED"


def error(code: str, message: str, **extra: Any) -> Dict[str, Any]:
    """Build the failure envelope every bridge script prints."""
    payload = {"ok": False, "error": {"code": code, "message": message}}
    if extra:
        payload["error"].update(extra)
    return payload


def success(data: Any) -> Dict[str, Any]:
    """Build the success envelope every bridge script prints."""
    return {"ok": True, "data": data}


def emit(payload: Dict[str, Any]) -> None:
    """Print exactly one JSON object on stdout and flush.

    stdout carries the protocol and nothing else; anything diagnostic must go
    to stderr or it will corrupt the parse on the Node side.
    """
    sys.stdout.write(json.dumps(payload))
    sys.stdout.write("\n")
    sys.stdout.flush()


def _script_api_dir() -> str:
    return os.environ.get("RESOLVE_SCRIPT_API", DEFAULT_SCRIPT_API)


def _script_lib_path() -> str:
    return os.environ.get("RESOLVE_SCRIPT_LIB", DEFAULT_SCRIPT_LIB)


def _load_module() -> Tuple[Optional[Any], Optional[Dict[str, Any]]]:
    """Import DaVinciResolveScript from the Resolve installation."""
    api_dir = _script_api_dir()
    lib_path = _script_lib_path()

    module_path = os.path.join(api_dir, "Modules", "DaVinciResolveScript.py")
    if not os.path.isfile(module_path):
        return None, error(
            ERR_API_MISSING,
            "DaVinci Resolve scripting modules not found. Checked: " + module_path,
            checkedPath=module_path,
        )

    if not os.path.exists(lib_path):
        return None, error(
            ERR_LIB_MISSING,
            "fusionscript library not found. Checked: " + lib_path,
            checkedPath=lib_path,
        )

    # DaVinciResolveScript reads these at import time.
    os.environ.setdefault("RESOLVE_SCRIPT_API", api_dir)
    os.environ.setdefault("RESOLVE_SCRIPT_LIB", lib_path)

    try:
        spec = importlib.util.spec_from_file_location("DaVinciResolveScript", module_path)
        if spec is None or spec.loader is None:
            return None, error(ERR_IMPORT_FAILED, "Could not build a module spec for " + module_path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module, None
    except Exception as exc:  # noqa: BLE001 — any import failure is reportable, not fatal
        return None, error(
            ERR_IMPORT_FAILED,
            "Importing DaVinciResolveScript failed: " + str(exc),
            trace=traceback.format_exc(limit=3),
        )


def connect() -> Tuple[Optional[Any], Optional[Dict[str, Any]]]:
    """Return (resolve, None) when Resolve is running, else (None, error)."""
    module, err = _load_module()
    if err is not None:
        return None, err

    try:
        resolve = module.scriptapp("Resolve")
    except Exception as exc:  # noqa: BLE001
        return None, error(
            ERR_NOT_RUNNING,
            "Could not attach to Resolve: " + str(exc),
            trace=traceback.format_exc(limit=3),
        )

    if resolve is None:
        return None, error(
            ERR_NOT_RUNNING,
            "DaVinci Resolve is not running, or external scripting is disabled "
            "(Preferences > System > General > External scripting using: Local).",
        )

    return resolve, None


def current_timeline(resolve: Any) -> Tuple[Optional[Any], Optional[Any], Optional[Dict[str, Any]]]:
    """Return (project, timeline, None) or (project_or_None, None, error)."""
    try:
        manager = resolve.GetProjectManager()
        project = manager.GetCurrentProject() if manager is not None else None
    except Exception as exc:  # noqa: BLE001
        return None, None, error(ERR_UNEXPECTED, "Reading the project failed: " + str(exc))

    if project is None:
        return None, None, error(ERR_NO_PROJECT, "No project is open in DaVinci Resolve.")

    try:
        timeline = project.GetCurrentTimeline()
    except Exception as exc:  # noqa: BLE001
        return project, None, error(ERR_UNEXPECTED, "Reading the timeline failed: " + str(exc))

    if timeline is None:
        return project, None, error(ERR_NO_TIMELINE, "No timeline is open in the current project.")

    return project, timeline, None


def run(main: Any) -> None:
    """Execute a bridge entry point, guaranteeing one JSON object on stdout."""
    try:
        emit(main())
    except Exception as exc:  # noqa: BLE001
        emit(
            error(
                ERR_UNEXPECTED,
                "Unhandled error in the Resolve bridge: " + str(exc),
                trace=traceback.format_exc(limit=5),
            )
        )
        sys.exit(1)
