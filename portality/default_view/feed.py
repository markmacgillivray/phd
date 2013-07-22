from flask import Blueprint, request, abort, make_response
from cl import dao
from cl.core import app

from lxml import etree
from datetime import datetime, timedelta

blueprint = Blueprint('feed', __name__)

@blueprint.route('/<title>')
def feed(title):
    # atom feeds require query strings, even if it is just "*"
    if 'q' not in request.values:
        abort(404)
    
    return get_feed_resp(title, request.values['q'], request)
    

def get_feed_resp(title, query, req):
    # build an elastic search query, which gives us all accessible, visible pages 
    # which conform to the supplied query string.  We obtain a maximum of 20 entries
    # or the amount in the configuration
    qs = {'query': {'query_string': { 'query': "accessible:true AND visible:true AND (" + query + ")"}}}
    qs['sort'] = [{"last_updated.exact" : {"order" : "desc"}}]
    qs['size'] = app.config['MAX_FEED_ENTRIES'] if app.config['MAX_FEED_ENTRIES'] else 20
    
    # get the records from elasticsearch
    resp = dao.Record.query(q=qs)
    records = [r.get("_source") for r in resp.get("hits", {}).get("hits", []) if "_source" in r]
    
    # reconstruct the original request url (urgh, why is this always such a pain)
    url = app.config["BASE_URL"] + req.path + "?q=" + query
    
    # make a new atom feed object
    af = AtomFeed(title, url)
    
    # for each of the records, if the date is newer than the max age, add it to 
    # the feed.  Since all the objects are in the correct order, as soon as we
    # hit a date that's out of range we can stop processing all the rest.
    newer_than = None
    if app.config['MAX_FEED_ENTRY_AGE']:
        newer_than = datetime.now() - timedelta(seconds=app.config['MAX_FEED_ENTRY_AGE'])
    for record in records:
        lu = record.get("last_updated")
        if lu is not None:
            dr = datetime.strptime(lu, "%Y-%m-%d %H%M")
            if newer_than is None or (newer_than is not None and dr >= newer_than):
                af.add_entry(record)
            else:
                break
        
    # serialise and respond with the atom xml
    resp = make_response(af.serialise())
    resp.mimetype = "application/atom+xml"
    return resp

class AtomFeed(object):
    ATOM_NAMESPACE = "http://www.w3.org/2005/Atom"
    ATOM = "{%s}" % ATOM_NAMESPACE
    NSMAP = {None : ATOM_NAMESPACE}

    def __init__(self, title, url):
        self.title = title + " - " + app.config['SERVICE_NAME']
        self.url = url
        self.generator = app.config['FEED_GENERATOR']
        self.icon = app.config['BASE_URL'] + "/static/favicon.ico"
        self.logo = app.config["FEED_LOGO"]
        self.link = app.config['BASE_URL']
        self.rights = app.config['FEED_LICENCE']
        self.last_updated = None
        
        self.entries = {}
    
    def add_entry(self, page):
        lu = page.get("last_updated")
        last_updated = None
        if lu is not None:
            dr = datetime.strptime(lu, "%Y-%m-%d %H%M")
            last_updated = datetime.strftime(dr, "%Y-%m-%dT%H:%M:%SZ")
            if self.last_updated is None or dr > self.last_updated:
                self.last_updated = dr
        
        entry = {}
        entry['author'] = page.get("author", app.config["SERVICE_NAME"])
        entry["categories"] = page.get("tags", [])
        entry["content_src"] = app.config['BASE_URL'] + page.get("url")
        entry["id"] = "urn:uuid:" + page.get("id")
        entry['alternate'] = app.config['BASE_URL'] + page.get("url")
        entry['rights'] = app.config['FEED_LICENCE']
        entry['summary'] = page.get("excerpt") if page.get("excerpt") is not None and page.get("excerpt") != "" else "No summary available"
        entry['title'] = page.get("title", "untitled")
        entry['updated'] = last_updated
        
        if last_updated in self.entries:
            self.entries[last_updated].append(entry)
        else:
            self.entries[last_updated] = [entry]
        
    def serialise(self):
        if self.last_updated is None:
            self.last_updated = datetime.now()
        
        feed = etree.Element(self.ATOM + "feed", nsmap=self.NSMAP)
        
        title = etree.SubElement(feed, self.ATOM + "title")
        title.text = self.title
        
        if self.generator is not None:
            generator = etree.SubElement(feed, self.ATOM + "generator")
            generator.text = self.generator
        
        icon = etree.SubElement(feed, self.ATOM + "icon")
        icon.text = self.icon
        
        if self.logo is not None:
            logo = etree.SubElement(feed, self.ATOM + "logo")
            logo.text = self.logo
        
        self_link = etree.SubElement(feed, self.ATOM + "link")
        self_link.set("rel", "self")
        self_link.set("href", self.url)
        
        link = etree.SubElement(feed, self.ATOM + "link")
        link.set("rel", "related")
        link.set("href", self.link)
        
        rights = etree.SubElement(feed, self.ATOM + "rights")
        rights.text = self.rights
        
        updated = etree.SubElement(feed, self.ATOM + "updated")
        dr = datetime.strftime(self.last_updated, "%Y-%m-%dT%H:%M:%SZ")
        updated.text = dr
        
        entry_dates = self.entries.keys()
        entry_dates.sort(reverse=True)
        for ed in entry_dates:
            es = self.entries.get(ed)
            for e in es:
                self._serialise_entry(feed, e)
        
        tree = etree.ElementTree(feed)
        return etree.tostring(tree, pretty_print=True, xml_declaration=True, encoding="utf-8")
    
    def _serialise_entry(self, feed, e):
        entry = etree.SubElement(feed, self.ATOM + "entry")
        
        author = etree.SubElement(entry, self.ATOM + "author")
        name = etree.SubElement(author, self.ATOM + "name")
        name.text = e['author']
        if e['author'] != app.config['SERVICE_NAME']:
            puri = etree.SubElement(author, self.ATOM + "uri")
            puri.text = app.config["BASE_URL"] + "/people/" + e['author']
        
        for cat in e.get("categories", []):
            c = etree.SubElement(entry, self.ATOM + "category")
            c.set("term", cat)
        
        cont = etree.SubElement(entry, self.ATOM + "content")
        cont.set("src", e['content_src'])
        
        id = etree.SubElement(entry, self.ATOM + "id")
        id.text = e['id']
        
        # this is not strictly necessary, as we have an atom:content element, but it can't harm
        alt = etree.SubElement(entry, self.ATOM + "link")
        alt.set("rel", "alternate")
        alt.set("href", e['alternate'])
        
        rights = etree.SubElement(entry, self.ATOM + "rights")
        rights.text = e['rights']
        
        summary = etree.SubElement(entry, self.ATOM + "summary")
        summary.text = e['summary']
        
        title = etree.SubElement(entry, self.ATOM + "title")
        title.text = e['title']
        
        updated = etree.SubElement(entry, self.ATOM + "updated")
        updated.text = e['updated']
        
        