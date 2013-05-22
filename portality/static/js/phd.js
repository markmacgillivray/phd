

// take a snapshot of the page as it currently stands and package it so it can be viewed statically or downloaded
var packagepage = function(event) {
    event ? event.preventDefault() : false;
    var currstate = $('#index').clone();
    currstate.find('script').remove();
    currstate.find('#metaopts').remove();
    currstate.prepend( '<h1>Contents</h1>' + $('#oap_TOC').clone() );
    currstate.find('#oap_TOC').attr('style','');
    var currentstate = '<html><head>';
    /*currentstate += ' \
<link rel="stylesheet" type="text/css" media="all" href="http://cottagelabs.com/static/vendor/bootstrap/css/bootstrap.min.css" /> \
<link rel="stylesheet" type="text/css" media="all" href="http://cottagelabs.com/static/css/bootstrap-readable.min.css" /> \
<link rel="stylesheet" type="text/css" media="all" href="http://cottagelabs.com/static/vendor/bootstrap/css/bootstrap-responsive.min.css" /> \
<link rel="stylesheet" type="text/css" media="all" href="http://cottagelabs.com/static/css/style.css" /> \
<link rel="stylesheet" type="text/css" media="all" href="http://cottagelabs.com/static/vendor/facetview/css/facetview.css" />';*/
    currentstate += '</head><body>' + currstate.html() + '</body></html>';
    $.ajax({
        'type':'POST',
        'url': '/package/',
        'data': currentstate,
        'contentType': 'text/plain; charset="UTF-8"',
        'processData':false
    });
};

var prepoaptools = function() {
    $('#oap_TOC').remove();
    $('.oap_references').remove();
    $('.oap_header').remove();
    $('#index').oap_headers().oap_refs().oap_toc();
    $('#oap_TOC').hide();
    $('.contents').bind('click',function(event){event.preventDefault(); $('#oap_TOC').toggle();});
    dynamicsedit();
}

var dynamicsedit = function() {
    var dynamictrigger = function(event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        $(this).hasClass('dynamicon') ? $(this).removeClass('dynamicon').addClass('dynamicoff') : $(this).removeClass('dynamicoff').addClass('dynamicon');    
    }
    var gotopage = function(event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        if ( $('.dynamicpagenav').hasClass('dynamicon') ) {
            var id = $(this).attr('data-source');
            !id ? id = $(this).attr('id') : false;
            window.location = window.location.href.substring(0,window.location.href.length-1) + id;
        }
    }        
    var outline = function() {
        if ( $('.dynamicpagenav').hasClass('dynamicon') ) {
            $(this).css({
                outline: "1px solid red"
            });
        }
    }
    var unline = function() {
        $(this).css({
            outline: "none"
        });
    }
    $('.dynamic').bind('mouseover',outline).bind('mouseout',unline);
    $('.dynamic').bind('click',gotopage);
    
    $('.dynamicpagenav').bind('click',dynamictrigger);
}

