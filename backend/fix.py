import pathlib, re
for p in pathlib.Path('.').rglob('*.ts'):
    if 'node_modules' in str(p) or p.name=='fix.py':
        continue
    t=p.read_text(); orig=t
    t=re.sub(r"const\s+(\w+)\s*=\s*require\(['\"]([^'\"]+)['\"]\);?", r"import \1 from '\2';", t)
    def repl_destr(m):
        names=' '.join(m.group(1).split()); mod=m.group(2)
        if mod.startswith('.') and '.' not in mod.split('/')[-1]:
            mod+='.ts'
        return f"import {{ {names} }} from '{mod}';"
    t=re.sub(r"const\s*\{([^}]+)\}\s*=\s*require\(['\"]([^'\"]+)['\"]\);?", repl_destr, t, flags=re.S)
    t=re.sub(r"(from\s+['\"]\.{1,2}/[^'\"]*?)(['\"])", lambda m: m.group(1)+'.ts'+m.group(2) if '.' not in m.group(1).split('/')[-1] else m.group(0), t)
    m=re.search(r"module\.exports\s*=\s*\{(.*?)\};?", t, re.S)
    if m:
        inner=m.group(1); out=[]
        for line in inner.splitlines():
            line=line.strip().rstrip(',')
            if not line: continue
            if ':' in line:
                name,val=line.split(':',1)
                out.append(f"export const {name.strip()} = {val.strip()};")
            else:
                out.append(f"export {{ {line} }};")
        t=t[:m.start()] + '\n'.join(out) + '\n' + t[m.end():]
    if m and 'export {' in t:
        exported=re.findall(r"export \{ ([^}]+) \};", t)
        for group in exported:
            for name in group.split(','):
                name=name.strip()
                if name:
                    t=re.sub(rf"^const {re.escape(name)}\s*=", f"export const {name} =", t, flags=re.M)
        t=re.sub(r"export \{ [^}]+ \};\n?", "", t)
    if t!=orig:
        p.write_text(t); print('fixed', p)
print('done')
