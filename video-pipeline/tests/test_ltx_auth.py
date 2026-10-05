"""LTX auth: live process-env discovery (no cache file)."""
import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import ltx_auth

pytestmark = pytest.mark.skipif(sys.platform != "win32",
                                reason="Windows-only PEB walk")


def test_read_own_env():
    os.environ["LTX_AUTH_SELFTEST"] = "marker-123"
    try:
        env = ltx_auth.read_env(os.getpid())
    finally:
        del os.environ["LTX_AUTH_SELFTEST"]
    assert env["LTX_AUTH_SELFTEST"] == "marker-123"
    assert any(k.upper() == "PATH" for k in env)  # stored as Path


def test_read_own_command_line():
    cmd = ltx_auth.read_command_line(os.getpid())
    assert "python" in cmd.lower()


def test_env_override_wins(monkeypatch):
    monkeypatch.setenv("LTX_AUTH_TOKEN", "override-token")
    assert ltx_auth.discover_token() == "override-token"


def test_finds_live_backend():
    pid = ltx_auth.find_backend_pid()
    if pid is None:
        pytest.skip("LTX Desktop backend not running")
    assert "ltx2_server" in ltx_auth.read_command_line(pid)
    assert ltx_auth.read_env(pid).get("LTX_AUTH_TOKEN")
