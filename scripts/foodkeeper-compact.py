import json,sys,hashlib
src,out=sys.argv[1],sys.argv[2]
raw=json.load(open(src)); sh={s['name']:s['data'] for s in raw['sheets']}
rows=lambda n:[dict(kv for c in r for kv in c.items()) for r in sh[n]]
cats={int(c['ID']):(c['Category_Name']+(' / '+c['Subcategory_Name'] if c['Subcategory_Name'] else '')) for c in rows('Category')}
U={'Days':'d','Weeks':'w','Months':'m','Years':'y','Year':'y','Hours':'h'}
S={'Not Recommended':'not_recommended','Indefinitely':'indefinitely','When Ripe':'when_ripe','Package use-by date':'package_use_by'}
F=[('p','Pantry'),('pd','DOP_Pantry'),('po','Pantry_After_Opening'),('f','Refrigerate'),('fd','DOP_Refrigerate'),('fo','Refrigerate_After_Opening'),('ft','Refrigerate_After_Thawing'),('z','Freeze'),('zd','DOP_Freeze')]
num=lambda v: (int(v) if float(v).is_integer() else v) if isinstance(v,(int,float)) else None
items=[];notes=[]
for p in rows('Product'):
    it={'id':int(p['ID']),'n':p['Name'].strip()}
    if p.get('Name_subtitle'): it['s']=p['Name_subtitle'].strip()
    it['k']=[k.strip().lower() for k in (p.get('Keywords') or '').split(',') if k.strip()]
    it['c']=cats.get(int(p['Category_ID']))
    for key,pre in F:
        a,b,m=p.get(pre+'_Min'),p.get(pre+'_Max'),(p.get(pre+'_Metric') or '').strip()
        if not m and a is None and b is None: continue
        if m in S: it[key]=S[m]; continue
        if m in U:
            lo,hi=num(a),num(b)
            if lo is None and hi is None: notes.append((it['id'],pre,a,b,m)); continue
            it[key]=[lo if lo is not None else hi, hi if hi is not None else lo, U[m]]
        else: notes.append((it['id'],pre,a,b,m))
    items.append(it)
doc={'_meta':{
 'source':'USDA FSIS FoodKeeper data, version 128 (FMA-Data-v128.xlsx, modified 09-06-2018)',
 'official_url':'https://www.fsis.usda.gov/shared/data/EN/foodkeeper.json',
 'catalog':'https://catalog.data.gov/dataset/fsis-foodkeeper-data',
 'license':'U.S. Government work, public domain; listed as CC0 on data.gov',
 'raw_sha256':hashlib.sha256(open(src,'rb').read()).hexdigest(),
 'keys':{'p':'pantry','pd':'pantry, from date of purchase','po':'pantry after opening','f':'fridge','fd':'fridge, from date of purchase','fo':'fridge after opening','ft':'fridge after thawing','z':'freezer','zd':'freezer, from date of purchase'},
 'value':'[min,max,unit] exactly as in the dataset, or a status string',
 'units':{'h':'hours','d':'days','w':'weeks','m':'months','y':'years'},
 'statuses':list(S.values()),
 'note':'Quality guidance for home storage, not a safety guarantee. Units kept as published; convert in the app (months are not a fixed number of days). Tips text omitted here; see raw file.'},
 'items':items}
json.dump(doc,open(out,'w'),separators=(',',':'),ensure_ascii=False)
print('items',len(items)); print('skipped/odd fields',notes)
