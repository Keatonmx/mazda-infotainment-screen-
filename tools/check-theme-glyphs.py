"""Fails if any character used in the apps or greeting is missing from the subset theme fonts.

    python3 tools/check-theme-glyphs.py

On the car a missing glyph shows as an empty box, so run this after changing any Japanese text
(fix: node tools/build-theme.js).
"""
import glob, os, sys
from fontTools.ttLib import TTFont

root = os.path.join(os.path.dirname(__file__), '..')
files = glob.glob(os.path.join(root, 'apps', '*', 'app.js')) + glob.glob(os.path.join(root, 'apps', '*', 'app.css'))
files += [os.path.join(root, 'greeting', 'mzd-greeting.js'), os.path.join(root, 'theme', 'kodo.css')]
used = set()
for f in files:
    used |= {c for c in open(f, encoding='utf-8').read() if ord(c) > 0x7e and not c.isspace()}

ok = True
for font in ['kodo-display', 'kodo-round']:
    cmap = TTFont(os.path.join(root, 'theme', font + '.woff')).getBestCmap()
    missing = sorted(c for c in used if ord(c) not in cmap)
    print('%s: %d characters used, %d missing %s' % (font, len(used), len(missing), ''.join(missing)))
    ok = ok and not missing
sys.exit(0 if ok else 1)
