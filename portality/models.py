
from datetime import datetime

from portality.core import app

from portality.dao import DomainObject as DomainObject

'''
Define models in here. They should all inherit from the DomainObject.
Look in the dao.py to learn more about the default methods available to the Domain Object.
When using portality in your own flask app, perhaps better to make your own models file somewhere and copy these examples
'''


# an example account object, which requires the further additional imports
# There is a more complex example below that also requires these imports
from werkzeug import generate_password_hash, check_password_hash
from flask.ext.login import UserMixin


class Reference(DomainObject):
    __type__ = 'reference'


class Wikipedia(DomainObject):
    __type__ = 'wikipedia'


class Survey(DomainObject):
    __type__ = 'survey'


class Account(DomainObject, UserMixin):
    __type__ = 'account'

    def set_password(self, password):
        self.data['password'] = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.data['password'], password)

    @property
    def is_super(self):
        return not self.is_anonymous() and self.id in app.config['SUPER_USER']
    
    
# a special object that allows a search onto all index types - FAILS TO CREATE INSTANCES
class Everything(DomainObject):
    __type__ = 'everything'

    @classmethod
    def target(cls):
        t = 'http://' + str(app.config['ELASTIC_SEARCH_HOST']).lstrip('http://').rstrip('/') + '/'
        t += app.config['ELASTIC_SEARCH_DB'] + '/'
        return t


# a page manager object, with a couple of extra methods
class Pages(DomainObject):
    __type__ = 'pages'

    @classmethod
    def pull_by_url(cls,url):
        res = cls.query(q={"query":{"term":{'url.exact':url}}})
        if res.get('hits',{}).get('total',0) == 1:
            return cls(**res['hits']['hits'][0]['_source'])
        else:
            return None

    def update_from_form(self, request):
        newdata = request.json if request.json else request.values
        self.data['editable'] = False
        self.data['accessible'] = False
        self.data['visible'] = False
        self.data['comments'] = False
        for k, v in newdata.items():
            if k == 'tags':
                tags = []
                for tag in v.split(','):
                    if len(tag) > 0: tags.append(tag)
                self.data[k] = tags
            elif k in ['editable','accessible','visible','comments']:
                if v == "on":
                    self.data[k] = True
                else:
                    self.data[k] = False
            elif k not in ['submit']:
                self.data[k] = v
        if not self.data['url'].startswith('/'):
            self.data['url'] = '/' + self.data['url']
        if 'title' not in self.data or self.data['title'] == "":
            self.data['title'] = 'untitled'

    def save_from_form(self, request):
        self.update_from_form(request)
        self.save()


# a typical record object, with a couple of extra methods
class Record(DomainObject):
    __type__ = 'record'


