#!/usr/bin/env python3
"""Discover the per-launch auth token from a running LTX Desktop backend.

LTX Desktop starts ``ltx2_server.py`` with ``LTX_AUTH_TOKEN`` in that
process's environment. The token changes whenever Desktop restarts, so it
must be discovered live instead of written to a repo or cache file.
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
    _fields_ = [
        ("dwSize", wintypes.DWORD), ("cntUsage", wintypes.DWORD),
        ("th32ProcessID", wintypes.DWORD),
        ("th32DefaultHeapID", ctypes.c_void_p),
        ("th32ModuleID", wintypes.DWORD), ("cntThreads", wintypes.DWORD),
        ("th32ParentProcessID", wintypes.DWORD),
        ("pcPriClassBase", wintypes.LONG), ("dwFlags", wintypes.DWORD),
        ("szExeFile", wintypes.WCHAR * 260),
    ]


class _PROCESS_BASIC_INFORMATION(ctypes.Structure):
    _fields_ = [
        ("Reserved1", ctypes.c_void_p), ("PebBaseAddress", ctypes.c_void_p),
        ("Reserved2", ctypes.c_void_p * 2),
        ("UniqueProcessId", ctypes.c_void_p), ("Reserved3", ctypes.c_void_p),
    ]


class _UNICODE_STRING(ctypes.Structure):
    _fields_ = [
        ("Length", wintypes.USHORT), ("MaximumLength", wintypes.USHORT),
        ("Buffer", ctypes.c_void_p),
    ]


def _win():
    if sys.platform != "win32":
        raise RuntimeError("LTX Desktop auth discovery is Windows-only")
    if sys.maxsize < 2 ** 32:
        raise RuntimeError("LTX Desktop auth discovery needs 64-bit Python")
    k32 = ctypes.WinDLL("kernel32", use_last_error=True)
    ntdll = ctypes.WinDLL("ntdll", use_last_error=True)
    ntdll.NtQueryInformationProcess.argtypes = [
        wintypes.HANDLE, wintypes.ULONG, ctypes.c_void_p,
        wintypes.ULONG, ctypes.POINTER(ctypes.c_ulong),
    ]
    ntdll.NtQueryInformationProcess.restype = wintypes.LONG
    return k32, ntdll


def _read_mem(k32, handle, address, size):
    buf = ctypes.create_string_buffer(size)
    done = ctypes.c_size_t()
    if not k32.ReadProcessMemory(
            handle, ctypes.c_void_p(address), buf, size, ctypes.byref(done)):
        raise OSError("ReadProcessMemory failed")
    return buf.raw[:done.value]


def _read_ptr(k32, handle, address):
    return int.from_bytes(_read_mem(k32, handle, address, 8), "little")


def _process_params(k32, ntdll, pid):
    handle = k32.OpenProcess(
        _PROCESS_QUERY_INFORMATION | _PROCESS_VM_READ, False, pid)
    if not handle:
        raise OSError("OpenProcess(%d) failed" % pid)
    try:
        pbi = _PROCESS_BASIC_INFORMATION()
        retlen = ctypes.c_ulong()
        status = ntdll.NtQueryInformationProcess(
            handle, _INFO_BASIC_INFORMATION, ctypes.byref(pbi),
            ctypes.sizeof(pbi), ctypes.byref(retlen))
        if status != 0:
            raise OSError("NtQueryInformationProcess failed: 0x%x" %
                          (status & 0xFFFFFFFF))
        peb = pbi.PebBaseAddress
        if isinstance(peb, ctypes.c_void_p):
            peb = peb.value
        return _read_ptr(k32, handle, peb + 0x20), handle
    except Exception:
        k32.CloseHandle(handle)
        raise


def read_command_line(pid):
    """Return the full Unicode command line of ``pid``."""
    k32, ntdll = _win()
    params, handle = _process_params(k32, ntdll, pid)
    try:
        raw = _read_mem(k32, handle, params + 0x70,
                        ctypes.sizeof(_UNICODE_STRING))
        value = _UNICODE_STRING.from_buffer_copy(raw)
        if not value.Buffer or not value.Length:
            return ""
        return _read_mem(k32, handle, value.Buffer, value.Length).decode(
            "utf-16-le", "replace")
    finally:
        k32.CloseHandle(handle)


def read_env(pid):
    """Return the Unicode environment block of ``pid`` as a dict."""
    k32, ntdll = _win()
    params, handle = _process_params(k32, ntdll, pid)
    try:
        env_addr = _read_ptr(k32, handle, params + 0x80)
        chunks = []
        while True:
            raw = _read_mem(k32, handle, env_addr, 32768)
            head, separator, _ = raw.decode("utf-16-le", "replace").partition(
                "\x00\x00")
            chunks.append(head)
            if separator:
                break
            env_addr += 32767 * 2
            if sum(map(len, chunks)) > 1 << 20:
                raise OSError("environment block exceeds 1 MB")
        result = {}
        for entry in "".join(chunks).split("\x00"):
            if "=" in entry:
                key, _, value = entry.partition("=")
                result[key] = value
        return result
    finally:
        k32.CloseHandle(handle)


def _pids_named(k32, exe_name):
    snapshot = k32.CreateToolhelp32Snapshot(_TH32CS_SNAPPROCESS, 0)
    if snapshot == wintypes.HANDLE(-1).value:
        raise OSError("process snapshot failed")
    try:
        entry = _PROCESSENTRY32()
        entry.dwSize = ctypes.sizeof(entry)
        result = []
        ok = k32.Process32FirstW(snapshot, ctypes.byref(entry))
        while ok:
            if entry.szExeFile.lower() == exe_name.lower():
                result.append(entry.th32ProcessID)
            ok = k32.Process32NextW(snapshot, ctypes.byref(entry))
        return result
    finally:
        k32.CloseHandle(snapshot)


def find_backend_pid():
    """Find the Python process serving LTX Desktop's ``ltx2_server.py``."""
    k32, _ = _win()
    for pid in _pids_named(k32, "python.exe"):
        try:
            command = read_command_line(pid)
        except OSError:
            continue
        lowered = command.lower()
        if "ltxdesktop" in lowered and "ltx2_server" in lowered:
            return pid
    return None


def discover_token():
    """Discover the current token without persisting it anywhere."""
    override = os.environ.get(_TOKEN_VAR)
    if override:
        return override
    pid = find_backend_pid()
    if pid is None:
        raise RuntimeError(
            "LTX Desktop backend is not running; launch LTX Desktop first")
    token = read_env(pid).get(_TOKEN_VAR, "")
    if not token:
        raise RuntimeError("running LTX Desktop backend has no auth token")
    return token


if __name__ == "__main__":
    token = discover_token()
    print("LTX Desktop backend found; token prefix: %s" % token[:8])
