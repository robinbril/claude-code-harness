#!/usr/bin/env python3
"""Run one command on a throwaway copy of the pinned head: no network, no secrets, no writes outside.

    sandbox.py RUN [--base] [--overlay DIR] [--read PATH ...] [--seconds N] -- COMMAND ...

--base      copy the code before the change instead of after it
--overlay   copy these files over it first (a reproduction or a red test)
--read      extra read-only path under the home folder, such as a virtualenv
Exit code of the command; 124 on timeout; 3 when this machine offers no sandbox.
"""

from __future__ import annotations

import argparse
import io
import os
import resource
import shutil
import subprocess
import sys
import tarfile
import tempfile
from pathlib import Path

from common import fail, load

# Keychain, login services and starting other apps stay out of reach.
SERVICES = ("com.apple.SecurityServer", "com.apple.securityd.xpc", "com.apple.coreservices.launchservicesd",
            "com.apple.coreservices.appleevents", "com.apple.pasteboard.1")


def quoted(path: Path | str) -> str:
    return '"' + str(path).replace("\\", "\\\\").replace('"', '\\"') + '"'


def profile(work: Path, read: list[Path]) -> str:
    """Seatbelt profile; the last matching rule wins."""
    home = Path.home().resolve()
    allowed = "".join(f"(allow file-read* (subpath {quoted(p)}))" for p in read)
    services = "".join(f"(global-name {quoted(s)})" for s in SERVICES)
    return (
        "(version 1)(allow default)(deny network*)(deny appleevent-send)"
        f"(deny mach-lookup {services})(deny file-write*)"
        f"(deny file-read* (subpath {quoted(home)}))(allow file-read-metadata (subpath {quoted(home)}))"
        # Other sessions and other people's temporary files are not ours to read.
        '(deny file-read* (subpath "/private/tmp"))'
        f"{allowed}(allow file-read* file-write* (subpath {quoted(work)}))"
        '(allow file-write* (literal "/dev/null") (literal "/dev/zero") (literal "/dev/stdout") (literal "/dev/stderr"))'
    )


def wrap(work: Path, read: list[Path], command: list[str]) -> list[str] | None:
    if sys.platform == "darwin" and shutil.which("sandbox-exec"):
        return ["/usr/bin/sandbox-exec", "-p", profile(work, read), *command]
    if shutil.which("bwrap"):
        ro = [a for p in ("/usr", "/bin", "/lib", "/lib64", "/etc", "/opt") if Path(p).exists() for a in ("--ro-bind", p, p)]
        ro += [a for p in read for a in ("--ro-bind", str(p), str(p))]
        return ["bwrap", "--unshare-all", "--die-with-parent", *ro, "--proc", "/proc", "--dev", "/dev", "--tmpfs", "/tmp",
                "--bind", str(work), str(work), "--chdir", str(work / "code"), *command]
    return None


def limits() -> None:
    resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
    resource.setrlimit(resource.RLIMIT_FSIZE, (512 * 2**20, 512 * 2**20))
    os.setsid()


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("run")
    ap.add_argument("--base", action="store_true")
    ap.add_argument("--overlay")
    ap.add_argument("--read", action="append", default=[])
    ap.add_argument("--seconds", type=int, default=120)
    own, dashes, command = sys.argv[1:], "--", []
    if dashes in own:
        cut = own.index(dashes)
        own, command = own[:cut], own[cut + 1 :]
    args = ap.parse_args(own)
    if not command:
        fail("give the command after --")
    pin = load(Path(args.run) / "pin.json")
    read = [Path(p).expanduser().resolve() for p in args.read]
    home = Path.home().resolve()
    if any(p == home or home.is_relative_to(p) for p in read):
        fail("--read may not open the whole home folder")

    work = Path(tempfile.mkdtemp(prefix="superaudit-box-")).resolve()
    try:
        commit = pin["merge_base"] if args.base else pin["head"]
        packed = subprocess.run(["git", "-C", pin["repo"], "archive", "--format=tar", commit], capture_output=True, check=False)
        if packed.returncode:
            fail(packed.stderr.decode(errors="replace")[:300])
        with tarfile.open(fileobj=io.BytesIO(packed.stdout)) as tar:
            tar.extractall(work / "code", filter="data")
        if args.overlay:
            shutil.copytree(args.overlay, work / "code", dirs_exist_ok=True, symlinks=True)
        for name in ("home", "tmp"):
            (work / name).mkdir()
        boxed = wrap(work, read, command)
        if boxed is None:
            print("superaudit: no sandbox on this machine; do not run the code", file=sys.stderr)
            return 3
        env = {"PATH": os.environ.get("PATH", "/usr/bin:/bin"), "HOME": str(work / "home"), "TMPDIR": str(work / "tmp"),
               "LANG": "C.UTF-8", "PYTHONDONTWRITEBYTECODE": "1", "CI": "1"}
        proc = subprocess.Popen(boxed, cwd=work / "code", env=env, stdin=subprocess.DEVNULL, preexec_fn=limits)
        try:
            return proc.wait(args.seconds)
        except subprocess.TimeoutExpired:
            print(f"superaudit: stopped after {args.seconds} s", file=sys.stderr)
            return 124
        finally:
            # Whatever the command started goes with it.
            try:
                os.killpg(proc.pid, 9)
            except (ProcessLookupError, PermissionError):
                pass
    finally:
        shutil.rmtree(work, ignore_errors=True)


if __name__ == "__main__":
    raise SystemExit(main())
