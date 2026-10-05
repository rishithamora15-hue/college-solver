"""Copy this project's canonical skills to Claude Code without deleting files."""
from pathlib import Path
import argparse
import hashlib
import json

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / 'scripts' / 'skill-mirrors.json'


def digest(data):
    return hashlib.sha256(data).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--overwrite', action='store_true', help='Replace locally edited Claude mirrors with canonical content')
    args = parser.parse_args()
    old = json.loads(MANIFEST.read_text(encoding='utf-8')) if MANIFEST.exists() else {}
    pending = []
    for source in sorted((ROOT / '.agents' / 'skills').glob('*/SKILL.md')):
        key = source.parent.name
        target = ROOT / '.claude' / 'skills' / key / 'SKILL.md'
        if not target.resolve().is_relative_to(ROOT):
            raise SystemExit(f'Target escapes project: {target}')
        data = source.read_bytes()
        if target.exists() and target.read_bytes() != data:
            if digest(target.read_bytes()) != old.get(key) and not args.overwrite:
                raise SystemExit(f'Claude mirror edited: {key}; reconcile it or explicitly use --overwrite')
        pending.append((key, target, data))
    if not pending:
        raise SystemExit('No canonical skills found')
    new = {}
    for key, target, data in pending:
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        new[key] = digest(data)
    MANIFEST.write_text(json.dumps(new, indent=2) + '\n', encoding='utf-8')
    print(f'Synchronized {len(pending)} skills; no unrelated files deleted.')


if __name__ == '__main__':
    main()
