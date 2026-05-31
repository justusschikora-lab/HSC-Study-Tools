import re

path = r"C:\Users\justu\.claude\Claude Code\english\index.html"

with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

replacements = {
    r'\U0001f4d6': '📖',
    r'\U0001f3ad': '🎭',
    r'\U0001f7e1': '🟡',
    r'\U0001f534': '🔴',
    r'\U0001f9e0': '🧠',
    r'\U0001f389': '🎉',
}

for bad, good in replacements.items():
    count = text.count(bad)
    if count:
        print(f"  {bad} → {good}  ({count} instances)")
        text = text.replace(bad, good)

with open(path, 'w', encoding='utf-8') as f:
    f.write(text)

print("Done.")
