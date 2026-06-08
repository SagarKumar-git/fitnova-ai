#!/usr/bin/env python3
"""
FitNova AI — Dependency Safety Checker
=======================================
Scans every .py file under the backend/app directory, extracts all
third-party import statements, and verifies that each package is declared
in requirements.txt.

Exit codes:
  0  All imports are covered.
  1  One or more imports are missing from requirements.txt — build fails.

Usage:
  python check_deps.py
  python check_deps.py --root backend/app --requirements backend/requirements.txt
"""

import ast
import os
import sys
import re
import argparse
from pathlib import Path
from typing import Set, List, Tuple

# ---------------------------------------------------------------------------
# Stdlib module names — these do NOT need to appear in requirements.txt.
# Derived from Python 3.10 stdlib list plus common platform modules.
# ---------------------------------------------------------------------------
STDLIB_MODULES: Set[str] = {
    # Builtins / language internals
    "__future__", "__main__", "abc", "aifc", "argparse", "array", "ast",
    "asynchat", "asyncio", "asyncore", "atexit", "audioop", "base64",
    "bdb", "binascii", "binhex", "bisect", "builtins", "bz2",
    "calendar", "cgi", "cgitb", "chunk", "cmath", "cmd", "code",
    "codecs", "codeop", "collections", "colorsys", "compileall",
    "concurrent", "configparser", "contextlib", "contextvars", "copy",
    "copyreg", "cProfile", "csv", "ctypes", "curses",
    "dataclasses", "datetime", "dbm", "decimal", "difflib", "dis",
    "distutils", "doctest",
    "email", "encodings", "enum", "errno",
    "faulthandler", "fcntl", "filecmp", "fileinput", "fnmatch",
    "fractions", "ftplib", "functools",
    "gc", "getopt", "getpass", "gettext", "glob", "grp", "gzip",
    "hashlib", "heapq", "hmac", "html", "http",
    "idlelib", "imaplib", "imghdr", "importlib", "inspect", "io",
    "ipaddress", "itertools",
    "json",
    "keyword",
    "lib2to3", "linecache", "locale", "logging", "lzma",
    "mailbox", "mailcap", "marshal", "math", "mimetypes", "mmap",
    "modulefinder", "multiprocessing",
    "netrc", "nis", "nntplib", "numbers",
    "operator", "optparse", "os",
    "pathlib", "pdb", "pickle", "pickletools", "pipes", "pkgutil",
    "platform", "plistlib", "poplib", "posix", "posixpath", "pprint",
    "profile", "pstats", "pty", "pwd", "py_compile", "pyclbr",
    "pydoc",
    "queue", "quopri",
    "random", "re", "readline", "reprlib", "resource", "rlcompleter",
    "runpy",
    "sched", "secrets", "select", "selectors", "shelve", "shlex",
    "shutil", "signal", "site", "smtpd", "smtplib", "sndhdr",
    "socket", "socketserver", "spwd", "sqlite3", "sre_compile",
    "sre_constants", "sre_parse", "ssl", "stat", "statistics",
    "string", "stringprep", "struct", "subprocess", "sunau",
    "symtable", "sys", "sysconfig", "syslog",
    "tabnanny", "tarfile", "telnetlib", "tempfile", "termios", "test",
    "textwrap", "threading", "time", "timeit", "tkinter", "token",
    "tokenize", "tomllib", "trace", "traceback", "tracemalloc",
    "tty", "turtle", "turtledemo", "types", "typing",
    "unicodedata", "unittest", "urllib", "uu", "uuid",
    "venv",
    "warnings", "wave", "weakref", "webbrowser", "wsgiref",
    "xdrlib", "xml", "xmlrpc",
    "zipapp", "zipfile", "zipimport", "zlib", "zoneinfo",
    # Common internal helpers
    "abc", "io", "copy", "functools", "operator",
}

# ---------------------------------------------------------------------------
# Mapping: import name  →  PyPI package name
# Some packages are installed under a different pip name than their import name.
# ---------------------------------------------------------------------------
IMPORT_TO_PACKAGE: dict = {
    # The import name on the left, the requirements.txt name on the right
    "fastapi":          "fastapi",
    "uvicorn":          "uvicorn",
    "sqlalchemy":       "sqlalchemy",
    "psycopg2":         "psycopg2-binary",
    "jose":             "python-jose",
    "passlib":          "passlib",
    "pydantic":         "pydantic",
    "pydantic_settings":"pydantic-settings",
    "multipart":        "python-multipart",
    "bcrypt":           "bcrypt",
    "email_validator":  "email-validator",
    "httpx":            "httpx",
    "PIL":              "Pillow",
    "starlette":        "starlette",      # pulled in by fastapi
    "anyio":            "anyio",
    "aiofiles":         "aiofiles",
    "dotenv":           "python-dotenv",
    "celery":           "celery",
    "redis":            "redis",
    "boto3":            "boto3",
    "google":           "google-cloud",
    "openai":           "openai",
    "anthropic":        "anthropic",
    "alembic":          "alembic",
    "pytest":           "pytest",
    "click":            "click",
    "rich":             "rich",
    "yaml":             "pyyaml",
    "toml":             "toml",
    "requests":         "requests",
    "aiohttp":          "aiohttp",
    "numpy":            "numpy",
    "pandas":           "pandas",
    "scipy":            "scipy",
    "sklearn":          "scikit-learn",
    "cv2":              "opencv-python",
    "matplotlib":       "matplotlib",
    "cryptography":     "cryptography",
    "itsdangerous":     "itsdangerous",
    "jinja2":           "jinja2",
    "werkzeug":         "werkzeug",
    "flask":            "flask",
    "django":           "django",
}

# ---------------------------------------------------------------------------
# Packages that are transitive dependencies of declared packages.
# They don't need an explicit line in requirements.txt.
# ---------------------------------------------------------------------------
IMPLICIT_TRANSITIVE: Set[str] = {
    "starlette",   # shipped inside fastapi
    "anyio",       # shipped inside starlette / httpx
    "sniffio",     # shipped inside anyio
    "idna",        # shipped inside httpx
    "certifi",     # shipped inside httpx
    "httpcore",    # shipped inside httpx
    "h11",         # shipped inside httpcore
    "cryptography",# shipped inside python-jose[cryptography]
    "click",       # shipped inside uvicorn
    "colorama",    # shipped inside uvicorn[standard]
    "h2",          # optional uvicorn dep
    "websockets",  # shipped inside uvicorn[standard]
    "watchfiles",  # shipped inside uvicorn[standard]
    "ecdsa",       # shipped inside python-jose
    "rsa",         # shipped inside python-jose
    "pyasn1",      # shipped inside python-jose via rsa
    "six",         # shipped inside ecdsa
    "cffi",        # shipped inside bcrypt
    "pycparser",   # shipped inside cffi
    "dnspython",   # shipped inside email-validator
    "annotated_types",   # shipped inside pydantic
    "pydantic_core",     # shipped inside pydantic
    "typing_extensions", # stdlib shim
    "typing_inspection", # shipped inside pydantic
}


def parse_requirements(req_path: Path) -> Set[str]:
    """
    Reads requirements.txt and returns a set of normalised package names.
    Handles:
      - version specifiers (==, >=, <=, ~=, !=)
      - extras notation  (e.g. uvicorn[standard])
      - blank lines and comments
    """
    declared: Set[str] = set()
    if not req_path.exists():
        print(f"[ERROR] requirements.txt not found at: {req_path}", file=sys.stderr)
        sys.exit(1)

    for raw in req_path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or line.startswith("-"):
            continue
        # Strip extras and version specifiers
        pkg = re.split(r"[\[><=!~;]", line)[0].strip().lower()
        if pkg:
            # Normalise: hyphens and underscores are interchangeable in PyPI
            declared.add(pkg.replace("-", "_"))
            declared.add(pkg.replace("_", "-"))
            declared.add(pkg)
    return declared


def collect_python_files(root: Path) -> List[Path]:
    """Recursively yields all .py files under root, skipping __pycache__."""
    return [
        p for p in root.rglob("*.py")
        if "__pycache__" not in p.parts and ".git" not in p.parts
    ]


def extract_top_level_imports(source: str) -> Set[str]:
    """
    Parses source with ast and extracts the top-level module name
    from every import statement.
    Returns a set of top-level names (e.g. 'PIL', 'fastapi', 'sqlalchemy').
    """
    names: Set[str] = set()
    try:
        tree = ast.parse(source)
    except SyntaxError:
        return names

    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                names.add(alias.name.split(".")[0])
        elif isinstance(node, ast.ImportFrom):
            if node.module and node.level == 0:   # absolute imports only
                names.add(node.module.split(".")[0])
    return names


def resolve_package(import_name: str) -> str:
    """Maps an import name to its canonical PyPI/requirements.txt name."""
    return IMPORT_TO_PACKAGE.get(import_name, import_name).lower()


def is_local_package(import_name: str, root: Path) -> bool:
    """Returns True if the import name corresponds to a local module/package."""
    # Check if there's a directory or file with that name under root
    if (root / import_name).is_dir():
        return True
    if (root / f"{import_name}.py").is_file():
        return True
    # Also check parent of root (e.g. 'app' is a local package)
    if (root.parent / import_name).is_dir():
        return True
    if (root.parent / f"{import_name}.py").is_file():
        return True
    return False


def check_dependencies(
    root: Path,
    req_path: Path,
    verbose: bool = False,
) -> Tuple[List[str], int]:
    """
    Main check: returns (list_of_violation_strings, exit_code).
    exit_code is 0 if clean, 1 if violations found.
    """
    declared = parse_requirements(req_path)
    py_files = collect_python_files(root)

    violations: List[str] = []
    all_imports: dict = {}   # import_name -> list of files

    for filepath in sorted(py_files):
        try:
            source = filepath.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue

        imports = extract_top_level_imports(source)
        for imp in imports:
            if imp not in all_imports:
                all_imports[imp] = []
            all_imports[imp].append(str(filepath.relative_to(root.parent)))

    print(f"\n{'='*60}")
    print("  FitNova AI -- Dependency Safety Check")
    print(f"{'='*60}")
    print(f"  Scanned : {len(py_files)} Python files")
    print(f"  Declared: {len([l for l in req_path.read_text().splitlines() if l.strip() and not l.startswith('#')])} packages in requirements.txt")
    print(f"{'='*60}\n")

    for imp_name, files in sorted(all_imports.items()):
        # Skip stdlib
        if imp_name in STDLIB_MODULES:
            if verbose:
                print(f"  [stdlib  ] {imp_name}")
            continue

        # Skip local packages
        if is_local_package(imp_name, root):
            if verbose:
                print(f"  [local   ] {imp_name}")
            continue

        # Skip known transitive deps
        normalized = resolve_package(imp_name)
        if imp_name.lower() in IMPLICIT_TRANSITIVE or normalized in IMPLICIT_TRANSITIVE:
            if verbose:
                print(f"  [transitive] {imp_name}")
            continue

        # Check if covered by declared packages
        pkg = resolve_package(imp_name)
        pkg_norm_hyphen = pkg.replace("_", "-")
        pkg_norm_under  = pkg.replace("-", "_")

        covered = (
            pkg_norm_hyphen in declared
            or pkg_norm_under in declared
            or imp_name.lower() in declared
        )

        if covered:
            if verbose:
                print(f"  [OK      ] {imp_name:30s}  →  {pkg}")
        else:
            violations.append(
                f"  [MISSING ] {imp_name:30s}  →  add '{pkg}' to requirements.txt\n"
                f"             imported in: {', '.join(files[:3])}"
                + (" ..." if len(files) > 3 else "")
            )

    if violations:
        print("[FAIL] DEPENDENCY CHECK FAILED\n")
        print("The following third-party imports are NOT in requirements.txt:\n")
        for v in violations:
            print(v)
            print()
        print(
            "Fix: add the missing package(s) to backend/requirements.txt, "
            "then re-run this check.\n"
        )
        return violations, 1
    else:
        print("[PASS] All third-party imports are covered by requirements.txt\n")
        return [], 0


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Verify all third-party imports are declared in requirements.txt"
    )
    parser.add_argument(
        "--root",
        default="app",
        help="Root directory to scan (default: app)",
    )
    parser.add_argument(
        "--requirements",
        default="requirements.txt",
        help="Path to requirements.txt (default: requirements.txt)",
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Show all imports including stdlib and local",
    )
    args = parser.parse_args()

    root = Path(args.root).resolve()
    req_path = Path(args.requirements).resolve()

    if not root.exists():
        print(f"[ERROR] Scan root not found: {root}", file=sys.stderr)
        sys.exit(1)

    _, exit_code = check_dependencies(root, req_path, verbose=args.verbose)
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
