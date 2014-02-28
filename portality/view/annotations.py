import json

from flask import Blueprint, request, make_response, abort

from portality.models import Annotation as Annotation

from portality.core import app, current_user


blueprint = Blueprint('annotations', __name__)

CREATE_FILTER_FIELDS = ('updated', 'created', 'consumer')
UPDATE_FILTER_FIELDS = ('updated', 'created', 'user', 'consumer')


# simplified from the reference annotator store implementation
# https://github.com/okfn/annotator-store/blob/master/annotator/store.py


@blueprint.after_request
def after_request(response):
    ac = 'Access-Control-'
    rh = response.headers

    rh[ac + 'Allow-Origin'] = request.headers.get('origin', '*')
    rh[ac + 'Expose-Headers'] = 'Content-Length, Content-Type, Location'

    if request.method == 'OPTIONS':
        rh[ac + 'Allow-Headers'] = ('Content-Length, Content-Type, '
                                    'X-Annotator-Auth-Token, X-Requested-With')
        rh[ac + 'Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
        rh[ac + 'Max-Age'] = '86400'

    return response


# ROOT
@blueprint.route('/')
def root():
    resp = make_response( json.dumps({}) )
    resp.mimetype = "application/json"
    return resp


@blueprint.route('/annotations')
def index():
    # get all annotations and return them in a list
    annotations = Annotation.all()
    resp = make_response( json.dumps(annotations) )
    resp.mimetype = "application/json"
    return resp


# CREATE
@blueprint.route('/annotations', methods=['POST'])
def create_annotation():

    if request.json is not None:
        # save the annotation with necessary info
        annotation = Annotation()
        annotation.data = request.json

        if not current_user.is_anonymous():        
            annotation['user'] = current_user.id

        #annotation['consumer'] = g.user.consumer.key

        annotation.save()

        resp = make_response( annotation.json )
        resp.mimetype = "application/json"
        return resp

    else:
        abort(400)


@blueprint.route('/annotations/<id>')
def read_annotation(id):
    # return the identified annotation
    annotation = Annotation.pull(id)
    if annotation is None:
        abort(404)
    else:
        resp = make_response( annotation.json )
        resp.mimetype = "application/json"
        return resp


@blueprint.route('/annotations/<id>', methods=['POST', 'PUT'])
def update_annotation(id):
    # update the identified annotation with the additional data
    annotation = Annotation.pull(id)
    if annotation is None:
        abort(404)

    elif request.json is not None:
        for k, v in request.json.items():
            if k not in ['id','submit']:
                annotation.data[k] = v

        annotation.save()

        resp = make_response( annotation.json )
        resp.mimetype = "application/json"
        return resp


@blueprint.route('/annotations/<id>', methods=['DELETE'])
def delete_annotation(id):
    # delete the identified annotation
    annotation = Annotation.pull(id)

    if annotation is None:
        abort(404)
    else:
        annotation.delete()
        return '', 204





