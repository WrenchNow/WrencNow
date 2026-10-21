import pathlib, re
s=pathlib.Path('src')
html=(s/'shell.html').read_text()
css=(s/'app.css').read_text()
js='\n'.join((s/f).read_text() for f in ['data.js','data2.js','data3.js','app.js'])
html=html.replace('/*CSS*/',css).replace('/*JS*/',js)
pathlib.Path('pantry-pal.html').write_text(html)
print('bytes',len(html))
m=re.search(r"AMAZON_TAG:\s*'([^']*)'",js)
if not (m and m.group(1).strip()):
    print('WARNING: CONFIG.AMAZON_TAG is empty in src/app.js. Amazon links will ship untagged and earn nothing.')
