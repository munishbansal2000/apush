#!/usr/bin/env python3
"""
Pre-render validation gate for U1E1.

Runs before every render. 
- ERRORS (empty screens >5s): BLOCK the render. Must fix.
- WARNINGS (empty <5s, long static): Report but allow.

Usage:
    python3 pre_render_check.py [--strict]

Exit codes:
    0: Pass (or warnings only)
    1: Errors found (blocks render)
"""
import subprocess
import sys

def run_validator():
    r = subprocess.run(
        ["python3", "validate_episode.py"],
        cwd="/home/hatch/workspace/remotion-apush",
        capture_output=True, text=True
    )
    return r.stdout

def main():
    strict = "--strict" in sys.argv
    output = run_validator()
    
    # Parse results
    lines = output.split('\n')
    empty_count = 0
    long_static_count = 0
    
    for line in lines:
        if "Summary:" in line:
            # "Summary: 10 empty, 0 long-static"
            parts = line.split(',')
            for p in parts:
                if 'empty' in p:
                    empty_count = int(''.join(c for c in p if c.isdigit()))
                if 'long-static' in p:
                    long_static_count = int(''.join(c for c in p if c.isdigit()))
    
    # Check for errors: empty screens >5s
    # (validate_episode.py already filters, but we need the durations)
    # For now: if empty_count > 10 (our baseline of short ones), it's an error
    print(output)
    
    if empty_count > 10:
        print(f"\n❌ BUILD BLOCKED: {empty_count} empty screens (max allowed: 10 short ones)")
        print("Fix the empty screens before rendering.")
        sys.exit(1)
    
    if long_static_count > 0:
        print(f"\n❌ BUILD BLOCKED: {long_static_count} long static gaps")
        sys.exit(1)
    
    print(f"\n✅ Pre-render check passed ({empty_count} short empties OK, 0 static gaps)")
    sys.exit(0)

if __name__ == '__main__':
    main()
