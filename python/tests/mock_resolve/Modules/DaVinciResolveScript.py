"""Stand-in for Blackmagic's DaVinciResolveScript module.

Lets the bridge, the backend poller and the UI be exercised end to end without
DaVinci Resolve installed or running. Point the bridge at it with:

    RESOLVE_SCRIPT_API=python/tests/mock_resolve \
    RESOLVE_SCRIPT_LIB=python/tests/mock_resolve/fusionscript.so \
    MOCK_RESOLVE_STATE=connected \
    python3 -m resolve_bridge.status

MOCK_RESOLVE_STATE accepts:
    connected    project + timeline open (default)
    no-timeline  project open, no timeline
    no-project   Resolve running, nothing open
    closed       Resolve not running
"""

import os


def _state():
    """Current mock state.

    MOCK_RESOLVE_STATE_FILE points at a file holding the state name, which lets
    a running backend observe a change without restarting — that is how the
    poller's change detection gets exercised.
    """
    path = os.environ.get("MOCK_RESOLVE_STATE_FILE")
    if path:
        try:
            with open(path, "r") as handle:
                value = handle.read().strip()
            if value:
                return value
        except IOError:
            pass
    return os.environ.get("MOCK_RESOLVE_STATE", "connected")


class _Timeline(object):
    def GetName(self):
        return os.environ.get("MOCK_TIMELINE_NAME", "Episode 12 — Online")

    def GetCurrentTimecode(self):
        return os.environ.get("MOCK_TIMECODE", "01:00:12:04")

    def GetTrackCount(self, track_type):
        return 3 if track_type == "video" else 2

    def InsertFusionTitleIntoTimeline(self, title_name):
        return _TimelineItem(title_name)


class _TimelineItem(object):
    def __init__(self, name):
        self._name = name

    def GetName(self):
        return self._name

    def GetFusionCompCount(self):
        return 1

    def GetFusionCompByIndex(self, index):
        return _Comp()


class _Comp(object):
    def FindTool(self, name):
        return _Tool()


class _Tool(object):
    def __init__(self):
        self._values = {}

    def SetInput(self, key, value):
        self._values[key] = value
        return True

    def GetInput(self, key):
        return self._values.get(key)


class _Project(object):
    def GetName(self):
        return os.environ.get("MOCK_PROJECT_NAME", "Bells Media — Season 4")

    def GetCurrentTimeline(self):
        return None if _state() in ("no-project", "no-timeline") else _Timeline()


class _ProjectManager(object):
    def GetCurrentProject(self):
        return None if _state() == "no-project" else _Project()


class _Resolve(object):
    def GetProjectManager(self):
        return _ProjectManager()

    def GetCurrentPage(self):
        return "edit"

    def OpenPage(self, page):
        return True


def scriptapp(name):
    """Mirror the real entry point: returns None when Resolve is not running."""
    if _state() == "closed":
        return None
    return _Resolve()
