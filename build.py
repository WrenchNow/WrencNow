import pathlib, re
s=pathlib.Path('src')
import base64, urllib.parse
html=(s/'shell.html').read_text()
# App icon: src/icon.svg (favicon + manifest) and src/apple-touch-icon.png (180x180, iOS ignores SVG). Fill these before CSS/JS go in.
html=html.replace('/*ICON_SVG*/','data:image/svg+xml,'+urllib.parse.quote((s/'icon.svg').read_text().strip(),safe=' =:/,.-'))
html=html.replace('/*ICON_PNG*/','data:image/png;base64,'+base64.b64encode((s/'apple-touch-icon.png').read_bytes()).decode())
css=(s/'app.css').read_text()
js='\n'.join((s/f).read_text() for f in ['data.js','data2.js','data3.js','app.js'])
html=html.replace('/*CSS*/',css).replace('/*JS*/',js)
pathlib.Path('pantry-pal.html').write_text(html)
print('bytes',len(html))
m=re.search(r"AMAZON_TAG:\s*'([^']*)'",js)
if not (m and m.group(1).strip()):
    print('WARNING: CONFIG.AMAZON_TAG is empty in src/app.js. Amazon links will ship untagged and earn nothing.')
