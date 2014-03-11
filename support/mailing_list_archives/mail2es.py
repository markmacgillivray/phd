#! /usr/bin/python

import json, requests, os, re, uuid
from topia.termextract import extract


# set the index and mapping to use
index = 'http://localhost:9200/phd/lists'

mapping = {
    "lists" : {
        "dynamic_templates" : [
            {
                "default" : {
                    "match" : "*",
                    "match_mapping_type": "string",
                    "mapping" : {
                        "type" : "multi_field",
                        "fields" : {
                            "{name}" : {"type" : "{dynamic_type}", "index" : "analyzed", "store" : "no"},
                            "exact" : {"type" : "{dynamic_type}", "index" : "not_analyzed", "store" : "yes"}
                        }
                    }
                }
            }
        ]
    }
}

# to delete the index each time, uncomment this
d = requests.delete(index)

# check the index exists and put a mapping to it if not
im = index + '/_mapping'
exists = requests.get(im)
if exists.status_code != 200:
    ri = requests.post(index)
    r = requests.put(im, json.dumps(mapping))


# list the directories in which to find the email archive files
# note these should be manually unzipped
directories = [
    'open-access',
    'open-science',
    'open-bibliography'
]

# prep a term extractor for use in the loops
extractor = extract.TermExtractor()

totalfiles = 0
totalemails = 0
fromemails = {}

for directory in directories:
    # open the directory and list all the source files
    listing = os.listdir( directory )
    files = sorted(listing, key=str.lower)

    for fn in files:
        totalfiles += 1
        
        src = open(directory + '/' + fn,'r')
        content = '\n\n' + src.read()
        src.close()
        
        p = re.compile(r'\n\nFrom .+ at .+\..+ .*\n')
        emails = filter(None, p.split(content))

        messages = []

        for e in emails:
            msg = {}
            msg['from'], e = e.split('\nDate: ', 1)
            msg['date'], e = e.split('\nSubject: ', 1)

            # in-reply-to and references are optional...
            # so pull the following out of the above subjreplrefs part, 
            # checking which exist and which do not
            subjreplrefs, e = e.split('\nMessage-ID: ', 1)
                
            if 'In-Reply-To' in subjreplrefs:
                msg['subject'], subjreplrefs = subjreplrefs.split('\nIn-Reply-To: ', 1)
                if 'References' in subjreplrefs:
                    msg['in-reply-to'], msg['references'] = subjreplrefs.split('\nReferences: ', 1)
                else:
                    msg['in-reply-to'] = subjreplrefs
            elif 'References' in subjreplrefs:
                msg['subject'], msg['references'] = subjreplrefs.split('\nReferences: ', 1)
            else:
                msg['subject'] = subjreplrefs
            
            msg['id'], msg['content'] = e.split('\n', 1)
            
            fromemail = msg['from'].split('(')[0].replace('From: ','').replace(" at ","@").replace(' ','')
            if fromemail not in fromemails.keys():
                fromemails[fromemail] = uuid.uuid4().hex
            
            msg['from'] = fromemails[fromemail]
            msg['organisation'] = fromemail.split('@')[1]

            msg['date'] = msg['date'] # TODO: add date processing here if necessary
            
            # tidy the subject and parse list names from subject
            msg['subject'] = msg['subject'].replace('\n','').replace('\t',' ')
            msg['subjected_lists'] = []
            mentions = msg['subject'].split('] ')
            if len(mentions) > 1:
                for m in mentions:
                    if m.startswith('['):
                        mp = m.lstrip('[')
                        if mp not in msg['subjected_lists']:
                            msg['subjected_lists'].append(mp)

            # tidy some of the identifiers
            if 'references' in msg:
                msg['references'] = [i.lstrip('<').rstrip('>') for i in msg['references'].replace('\t','').split('\n')]
            if 'in-reply-to' in msg:
                msg['in-reply-to'] = msg['in-reply-to'].lstrip('<').rstrip('>')
            msg['id'] = msg['id'].lstrip('<').rstrip('>')
            msg['_id'] = msg['id']

            # add a tracker to the source file the email came from
            msg['source'] = directory + '_' + fn

            # keyword analyse the content and create a tags list
            msg['tags'] = []
            terms = extractor(msg['content'])
            result = {}
            for t, o, l in terms:
                tl = t.lower()
                if tl not in msg['tags']: msg['tags'].append(tl)

            messages.append(msg)
            totalemails += 1
            
        # send the current batch of messages to the index for storage
        data = ''
        for r in messages:
            data += json.dumps( {'index':{'_id':r['id']}} ) + '\n'
            data += json.dumps( r ) + '\n'
        r = requests.post(index + '/_bulk', data=data)
        

print "processed " + str(totalfiles) + " files"
print "posted " + str(totalemails) + " emails"




