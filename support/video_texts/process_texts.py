from topia.termextract import extract

import csv, json

extractor = extract.TermExtractor()

fls = [
    'andy',
    'josh',
    'eva',
    'flanders'
]

questions = []

nodes = []
links = []

for fl in fls:
    inp = csv.reader(open('texts/' + fl + '.csv','r'))
    for line in inp:
        extractor.filter = extract.DefaultFilter(singleStrengthMinOccur=1)
        qk = [k[0] for k in extractor(line[0]) if len(k[0]) > 3]
        extractor.filter = extract.DefaultFilter(singleStrengthMinOccur=3)
        ak = [k[0] for k in extractor(line[1]) if len(k[0]) > 3]
        ids = [i['id'] for i in nodes]
        if fl not in ids:
            ids.append(fl)
            nodes.append({
                'type':'person',
                'id':fl,
                'value':1
            })
            src = len(nodes)
        else:
            src = ids.index(fl)
        nodes.append({
            'type':'question',
            'id':line[0],
            'value':1
        })
        links.append({"source":src,"target":len(nodes)})
        nodes.append({
            'type':'answer',
            'id':line[1],
            'value':1
        })
        links.append({"source":src,"target":len(nodes)})
        for q in qk:
            if q not in ids:
                ids.append(q)
                nodes.append({
                    'type':'qtag',
                    'id':q,
                    'value':1
                })
                links.append({"source":src,"target":len(nodes)})
            else:
                tgt = ids.index(q)
                nodes[tgt]['value'] += 1
                links.append({"source":src,"target":tgt})
        for a in ak:
            if a not in ids:
                ids.append(a)
                nodes.append({
                    'type':'atag',
                    'id':a,
                    'value':1
                })
                links.append({"source":src,"target":len(nodes)})
            else:
                tgt = ids.index(a)
                nodes[tgt]['value'] += 1
                links.append({"source":src,"target":tgt})
        questions.append({
            'who': fl,
            'question': line[0],
            'answer': line[1],
            'qtags': qk,
            'atags': ak
        })

out = open('videotexts.json','w')
out.write(json.dumps({
    'questions':questions,
    'nodes':nodes,
    'links':links
},indent=4))
out.close()
