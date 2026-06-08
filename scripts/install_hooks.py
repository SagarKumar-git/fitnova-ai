#!/usr/bin/env python3
"""
FitNova AI — Git Hook Installer
================================
Installs the pre-push safety hook into .git/hooks/.

Run once after cloning:
    python scripts/install_hooks.py

The hook runs automatically on every `git push`.
To bypass in an emergency: git push --no-verify  (NOT recommended)
"""

import os
import shutil
import stat
import sys
from pathlib import Path


def main() -> None:
    # Locate repo root (directory that contains .git/)
    script_dir = Path(__file__).resolve().parent
    repo_root = script_dir.parent

    git_dir = repo_root / ".git"
    if not git_dir.is_dir():
        print(f"[ERROR] .git directory not found at {repo_root}", file=sys.stderr)
        sys.exit(1)

    hooks_dir = git_dir / "hooks"
    hooks_dir.mkdir(exist_ok=True)

    source = script_dir / "pre_push_hook.sh"
    if not source.exists():
        print(f"[ERROR] Source hook not found: {source}", file=sys.stderr)
        sys.exit(1)

    dest = hooks_dir / "pre-push"

    # Backup existing hook if present and not already ours
    if dest.exists():
        backup = dest.with_suffix(".bak")
        shutil.copy2(dest, backup)
        print(f"[INFO] Backed up existing pre-push hook → {backup.name}")

    shutil.copy2(source, dest)

    # Make executable (Unix / WSL / Git Bash)
    current_mode = dest.stat().st_mode
    dest.chmod(current_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)

    print(f"[OK] Pre-push hook installed: {dest}")
    print("     The hook will run automatically on every 'git push'.")
    print("     To bypass (emergency only): git push --no-verify")


if __name__ == "__main__":
    main()
