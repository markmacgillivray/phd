import json, requests, csv, string, uuid

target = 'http://localhost:9200/phd/mission'

mapping = {
    "mission" : {
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

sourcefile = open('university_missions.csv','r')

reader = csv.DictReader( sourcefile )
records = [ row for row in reader ]

requests.delete(target)
requests.post(target+'/_mapping',json.dumps(mapping))

for record in records:
    record['missionprocessed'] = [k for k in "".join([i for i in record.get('mission',"").lower() + record.get('simplemission',"").lower() if i in ([m for m in string.lowercase] + [" "])]).replace("universitys","university").replace("sciences","science").replace("students","student").replace("communities","community").replace("worlds","world").replace("worldin","world").split(" ") if k not in ["and","to","the","of","in","a", "is","our","for","with","we","by","through","be","an","that","its","as","which", "all","at","will","on","are","this","their","it","from","who","make","within","have","meet","both","other","those","or","they","these","them", "university","mission",""]]
    if 'group' in record: record['group'] = record['group'].split(',')
    record['id'] = uuid.uuid4().hex
    requests.post(target + '/' + record['id'], data=json.dumps(record))






