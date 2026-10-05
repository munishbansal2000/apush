#!/usr/bin/env python3
"""Dynamic LTX Desktop backend auth (stdlib only, no cache file).

The backend (ltx2_server.py) reads LTX_AUTH_TOKEN from its own
environment at startup; the token is minted per app launch, so any
cached copy goes stale on restart. This module always discovers the
token live from the running backend process:

1. $LTX_AUTH_TOKEN when explicitly exported (CI / override);
2. else the environment block of the LTXDesktop python backend
   (found by exe path + ltx2_server.py command line), read via the
   Win32 API -- same-user processes need no elevation.

Raises RuntimeError when the backend isn't running.
"""
import ctypes
import os
import sys
from ctypes import wintypes

_TOKEN_VAR = "LTX_AUTH_TOKEN"

_TH32CS_SNAPPROCESS = 0x00000002
_PROCESS_QUERY_INFORMATION = 0x0400
_PROCESS_VM_READ = 0x0010
_INFO_BASIC_INFORMATION = 0


class _PROCESSENTRY32(ctypes.Structure):
    _fields_ = [("dwSize", wintypes.DWORD),
                ("cntUsage", wintypes.DWORD),
                ("th32ProcessID", wintypes.DWORD),
                ("th32DefaultHeapID", ctypes.c_void_p),
                ("th32ModuleID", wintypes.DWORD),
                ("cntThreads", wintypes.DWORD),
                ("th32ParentProcessID", wintypes.DWORD),
                ("pcPriClassBase", wintypes.LONG),
                ("dwFlags", wintypes.DWORD),
                ("szExeFile", wintypes.WCHAR * 260)]


class _PROCESS_BASIC_INFORMATION(ctypes.Structure):
    _fields_ = [("Reserved1", ctypes.c_void_p),
                ("PebBaseAddress", ctypes.c_void_p),
                ("Reserved2", ctypes.c_void_p * 2),
                ("UniqueProcessId", ctypes.c_void_p),
                ("Reserved3", ctypes.c_void_p)]


class _UNICODE_STRING(ctypes.Structure):
    _fields_ = [("Length", wintypes.USHORT),
                ("MaximumLength", wintypes.USHORT),
                ("Buffer", ctypes.c_void_p)]


def _win():
    if sys.platform != "win32":
        raise RuntimeError("ltx_auth is Windows-only")
    if sys.maxsize < 2 ** 32:
        raise RuntimeError("ltx_auth needs 64-bit Python "
                           "(pointer-size PEB walk)")
    k32 = ctypes.WinDLL("kernel32", use_last_error=True)
    ntdll = ctypes.WinDLL("ntdll", use_last_error=True)
    ntdll.NtQueryInformationProcess.argtypes = [
        wintypes.HANDLE, wintypes.ULONG, ctypes.c_void_p,
        wintypes.ULONG, ctypes.POINTER(ctypes.c_ulong)]
    ntdll.NtQueryInformationProcess.restype = wintypes.LONG
    return k32, ntdll


def _read_mem(k32, handle, address, size):
    buf = ctypes.create_string_buffer(size)
    done = ctypes.c_size_t()
    if not k32.ReadProcessMemory(handle,
                                 ctypes.c_void_p(address), buf,
                                 size, ctypes.byref(done)):
        raise OSError("ReadProcessMemory failed")
    return buf.raw[:done.value]


def _read_ptr(k32, handle, address):
    return int.from_bytes(_read_mem(k32, handle, address, 8), "little")


def _open(k32, pid):
    handle = k32.OpenProcess(_PROCESS_QUERY_INFORMATION |
                             _PROCESS_VM_READ, False, pid)
    if not handle:
        raise OSError("OpenProcess(%d) failed" % pid)
    return handle


def _process_params(k32, ntdll, pid):
    """RTL_USER_PROCESS_PARAMETERS address for pid (x64 offsets)."""
    handle = _open(k32, pid)
    try:
        pbi = _PROCESS_BASIC_INFORMATION()
        retlen = ctypes.c_ulong()
        status = ntdll.NtQueryInformationProcess(
            handle, _INFO_BASIC_INFORMATION,
            ctypes.byref(pbi), ctypes.sizeof(pbi),
            ctypes.byref(retlen))
        if status != 0:
            raise OSError("NtQueryInformationProcess failed: 0x%x"
                          % (status & 0xFFFFFFFF))
        peb = pbi.PebBaseAddress
        if isinstance(peb, ctypes.c_void_p):
            peb = peb.value
        return _read_ptr(k32, handle, peb + 0x20), handle, True
    except Exception:
        k32.CloseHandle(handle)
        raise


def read_command_line(pid):
    """Full command line of pid (unicode)."""
    k32, ntdll = _win()
    params, handle, _ = _process_params(k32, ntdll, pid)
    try:
        raw = _read_mem(k32, handle, params + 0x70,
                        ctypes.sizeof(_UNICODE_STRING))
        us = _UNICODE_STRING.from_buffer_copy(raw)
        if not us.Buffer or not us.Length:
            return ""
        data = _read_mem(k32, handle, us.Buffer, us.Length)
        return data.decode("utf-16-le", "replace")
    finally:
        k32.CloseHandle(handle)


def read_env(pid):
    """Environment dict of pid (unicode env block)."""
    k32, ntdll = _win()
    params, handle, _ = _process_params(k32, ntdll, pid)
    try:
        env_addr = _read_ptr(k32, handle, params + 0x80)
        chunks = []
        while True:  # env block ends at the first empty (double-NUL) entry
            raw = _read_mem(k32, handle, env_addr, 32768)
            text = raw.decode("utf-16-le", "replace")
            head, sep, _ = text.partition("\x00\x00")
            chunks.append(head)
            if sep:
                break
            env_addr += 32767 * 2  # overlap one char, keep scanning
            if sum(map(len, chunks)) > 1 << 20:
                raise OSError("env block over 1MB, giving up")
        env = {}
        for entry in "".join(chunks).split("\x00"):
            if "=" in entry:
                key, _, val = entry.partition("=")
                env[key] = val
        return env
    finally:
        k32.CloseHandle(handle)


def _pids_named(k32, exe_name):
    snap = k32.CreateToolhelp32Snapshot(_TH32CS_SNAPPROCESS, 0)
    if snap == wintypes.HANDLE(-1).value:
        raise OSError("process snapshot failed")
    try:
        entry = _PROCESSENTRY32()
        entry.dwSize = ctypes.sizeof(entry)
        pids = []
        ok = k32.Process32FirstW(snap, ctypes.byref(entry))
        while ok:
            if entry.szExeFile.lower() == exe_name:
                pids.append(entry.th32ProcessID)
            ok = k32.Process32NextW(snap, ctypes.byref(entry))
        return pids
    finally:
        k32.CloseHandle(snap)


def find_backend_pid():
    """Pid of the LTXDesktop python backend (serves ltx2_server.py)."""
    k32, _ = _win()
    for pid in _pids_named(k32, "python.exe"):
        try:
            cmd = read_command_line(pid)
        except OSError:
            continue
        if "LTXDesktop" in cmd and "ltx2_server" in cmd:
            return pid
    return None


def discover_token():
    """Live token from the running backend (no cache, restart-safe)."""
    override = os.environ.get(_TOKEN_VAR)
    if override:
        return override
    pid = find_backend_pid()
    if pid is None:
        raise RuntimeError(
            "LTX backend not running (no LTXDesktop ltx2_server "
            "process); launch LTX Desktop first")
    token = read_env(pid).get(_TOKEN_VAR, "")
    if not token:
        raise RuntimeError(
            "LTX backend has no LTX_AUTH_TOKEN in its environment")
    return token


if __name__ == "__main__":
    tok = discover_token()
    print("backend token discovered, prefix:", tok[:8])
