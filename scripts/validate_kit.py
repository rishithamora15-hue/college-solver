"""Validate the kit's minimal skill metadata, references and mirror parity (stdlib only)."""
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]


def main():
    errors = []
    skills = sorted((ROOT / '.agents' / 'skills').glob('*/SKILL.md'))
    if len(skills) != 18:
        errors.append(f'Expected 18 canonical skills, found {len(skills)}')
    names = set()
    for path in skills:
        text = path.read_text(encoding='utf-8')
        match = re.match(r'\A---\nname: ([a-z0-9-]+)\ndescription: ([^\n]+)\n---\n', text)
        if not match:
            errors.append(f'Invalid minimal frontmatter: {path.relative_to(ROOT)}')
            continue
        name, description = match.groups()
        if name != path.parent.name or name in names or len(name) > 64:
            errors.append(f'Invalid/duplicate name: {name}')
        names.add(name)
        if len(description) > 1024 or '[TODO' in text:
            errors.append(f'Invalid description or scaffold: {name}')
        mirror = ROOT / '.claude' / 'skills' / name / 'SKILL.md'
        if not mirror.exists() or path.read_bytes() != mirror.read_bytes():
            errors.append(f'Missing/drifted Claude mirror: {name}')
    project_docs = [ROOT / name for name in ('README.md', 'AGENTS.md', 'CLAUDE.md', 'SKILLS.md', 'VALIDATION.md')]
    project_docs.extend((ROOT / 'docs').glob('*.md'))
    project_docs.extend(skills)
    for path in project_docs:
        if not path.exists():
            continue
        text = path.read_text(encoding='utf-8')
        for target in re.findall(r'(?<!!)\[[^\]\n]+\]\(([^)\n]+)\)', text):
            if target.startswith(('http://', 'https://', '#', 'mailto:')):
                continue
            target = target.split('#', 1)[0]
            if target and not (path.parent / target).exists():
                errors.append(f'Broken link: {path.relative_to(ROOT)} -> {target}')
    if errors:
        print('\n'.join(errors))
        return 1
    print(f'PASS: {len(skills)} canonical skills, matching Claude mirrors, and local Markdown links.')
    print('This does not test application behavior, security, deployment, or model quality.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
