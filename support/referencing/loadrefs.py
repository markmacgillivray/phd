import json, requests

f = json.load(open('somephdrefs.json','r'))

for ref in f:
    ref['id'] = ref['cid']
    del ref['cid']
    if 'url' in ref.keys():
        ref['link'] = [{"url":ref['url']}]
        del ref['url']
        if 'dx.doi.org' in ref['link'][0]['url'] and 'doi' not in ref.keys():
            ref['identifier'] = [{'type':'doi','identifier':ref['link'][0]['url'].replace('http://dx.doi.org/','')}]
    if 'doi' in ref.keys():
        ref['identifier'] = [{'type':'doi','identifier':ref['doi']}]
        del ref['doi']    
    if 'journal' in ref.keys():
        ref['journal'] = {"name": ref['journal']}
    if 'volume' in ref.keys() and 'journal' in ref.keys():
        ref['journal']['volume'] = ref['volume']
        del ref['volume']
    if 'pages' in ref.keys() and 'journal' in ref.keys():
        ref['journal']['pages'] = ref['pages']
        del ref['pages']
        
    requests.post('http://localhost:9200/phd/reference/' + ref['id'], data=json.dumps(ref))
