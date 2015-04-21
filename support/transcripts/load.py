import json, requests, uuid

target = 'http://localhost:9200/phd/transcript'

mapping = {
    "transcript" : {
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

requests.delete(target)
requests.post(target+'/_mapping',json.dumps(mapping))

records = json.load(open('transcripts.json','r'))

for record in records:
    record['id'] = uuid.uuid4().hex
    requests.post(target + '/' + record['id'], data=json.dumps(record))