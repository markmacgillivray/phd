import csv, json, requests


# set the index and mapping to use
index = 'http://localhost:9200/phd/wellcome'

mapping = {
    "wellcome" : {
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


# get the google doc at 
# https://docs.google.com/a/cottagelabs.com/spreadsheets/d/1RXMhqzOZDqygWzyE4HXi9DnJnxjdp0NOhlHcB5SrSZo/edit#gid=0
# currently must manually remove the 4 link columns before the notes at the end, 
# as they have the same name as the starting columns. Could ask to rename them, 
# but links may not be that useful for vis anyway - they are just calculated from 
# the ID columns 
# also, need to strip pound signs from the values - done manually
f = csv.DictReader(open('wellcome.csv'))


# for each line, process and load a record of it into the index
for ref in f:
    # could add ID checks here to combine duplicate records instead of creating new
    requests.post('http://localhost:9200/phd/wellcome/', data=json.dumps(ref))
    
    
    
    
