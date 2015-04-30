/*
 * jquery.oaptools.js
 *
 * a set of open academic publishing tools
 *
 * extends jquery and requires jquery-ui
*/


/* ---------------------------------------------------------------------
 * oap_headers()
 *
 * define function to add section numbering to headers
 * ---------------------------------------------------------------------
 */
(function($){
    $.fn.oap_headers = function(options) {
        // specify the defaults
        var defaults = {
            ignore: '.oap_ignore',
        };
        // and add in any overrides from the call
        var options = $.extend(defaults, options);
        // do the function
        return this.each(function() {
            // get this object
            obj = $(this);

            // prepare an array to represent numbers e.g 1.1.1
            var counts = new Array();
            counts[0] = 0;
            var currpos = 0;
            var prevheader = 0;

            // for every header in this obj that is not marked to ignore
            $(':header', obj).not(options.ignore).each(function() {
                var thisheader = $(this)[0].nodeName.replace(/[A-z]/gi,'');
                if ( prevheader == 0 ) {
                    prevheader = thisheader;
                }
                var hdiff = thisheader - prevheader;
                if ( hdiff > 0 ) {
                    currpos = counts.push(1) - 1;
                } else if ( hdiff == 0 ) {
                    counts[currpos] = counts[currpos] + 1;
                } else if ( hdiff < 0 ) {
                    var pops = 0;
                    while (pops > hdiff) {
                        counts.pop();
                        pops = pops - 1;
                    }
                    currpos = currpos + hdiff;
                    counts[currpos] = counts[currpos] + 1;
                }
                prevheader = thisheader;
                $(this).prepend('<span class="oap_header">' + counts.toString().replace(/,/gi,'.') + ' </span>');
            });
        }); // end of the function  
    };
})(jQuery);



/* ---------------------------------------------------------------------
 * oap_toc()
 *
 * build a stand-alone table of contents for the document
 * ---------------------------------------------------------------------
 */
(function($){
    $.fn.oap_toc = function(options) {
        // specify the defaults
        var defaults = {
            prependto: this,
            depth: 10,
            statictoo: false,
            statictoodepth: 3
        };
        // and add in any overrides from the call
        var options = $.extend(defaults, options);
        // do the function
        return this.each(function() {
            // get this object
            obj = $(this);

            // function to get only the text of current element, not including children text
            $.fn.oap_textonly = function() {
                return $(this).clone().children().remove().end().text();
            };
            // function to indent by spaces based on header type
            $.fn.oap_indent = function() {
                var eltype = ( jQuery(this)[0].nodeName.replace(/[A-z]/,'') - 1 ) * 4;
                var count = 0;
                var output = "";
                while (count < eltype) {
                    count = count + 1;
                    output = output + "&nbsp;";
                };
                return output;
            };

            // add a TOC div to the page where required
            $(options.prependto).prepend('<div id="oap_TOC"><ul style="list-style-type:none;"></ul></div>');

            if ( options.statictoo ) {
                // put a contents nav on the top that shows when contents is not in view
                $('body').append('<div id="oap_nav" style="display:none;z-index:1000000000;position:fixed;top:0;left:5px;padding:4px 6px 4px 6px;background-color:#333;color:#ccc;-webkit-border-radius: 0 0 4px 4px;-moz-border-radius: 0 0 4px 4px;border-radius: 0 0 4px 4px;-webkit-box-shadow: inset 0 3px 5px rgba(0,0,0,.05);-moz-box-shadow: inset 0 3px 5px rgba(0,0,0,.05);box-shadow: inset 0 3px 5px rgba(0,0,0,.05);"><ul style="list-style-type:none;margin:0px;"><li><a id="oap_navopts" style="color:#ccc;" href="#">CONTENTS</a></li></ul></div>');
            }

            // for each header in the apdoc,
            $(':header', obj).each(function() {
                var d = jQuery(this)[0].nodeName.replace(/[A-z]/,'');
                if ( d <= options.depth ) {
                    // define the anchor name
                    var anchorname = $(this).oap_textonly().replace(/\s/gi,'');
                    // create the anchor tag and push it onto the TOC
                    $(this).append('<a class="oap_anchor" name="' + anchorname + '"></a>');
                    var hdr = $(this).find('.oap_header').html();
                    hdr == null ? hdr = '' : hdr = hdr + ' ';
                    $('#oap_TOC ul', obj).append('<li>' + $(this).oap_indent() + hdr + '<a href="#' + anchorname + '">' + $(this).oap_textonly() + '</a></li>');
                    if ( options.statictoo && d <= options.statictoodepth ) {
                        $('#oap_nav ul', obj).append('<li>' + $(this).oap_indent() + hdr + '<a href="#' + anchorname + '">' + $(this).oap_textonly() + '</a></li>');
                    }
                };
            });

            if ( options.statictoo ) {
                // show the contents nav as appropriate, in expanded or collapsed form
                var offtop = $('#oap_TOC').offset().top;
                var offbottom = $('#oap_TOC').offset().top + $('#oap_TOC').height();
                $(window).scroll(function() {
                    if ( (offtop < $(window).scrollTop() && $(window).scrollTop() < offbottom) || $(window).scrollTop() < 200 ) {
                        $('#oap_nav').hide();
                    } else {
                        $('#oap_nav').show();                    
                    }
                });

                var origmrg = '';
                var oap_navopts = function(event) {
                    event.preventDefault();
                    if ( $(this).hasClass('collapsed') ) {
                        $(this).removeClass('collapsed');
                        $(this).parent().siblings().show();
                        origmrg = obj.css('marginLeft');
                        obj.css({'margin-left':$('#oap_nav').width() + 'px'});
                    } else {
                        $(this).addClass('collapsed');
                        $(this).parent().siblings().hide();
                        obj.css({'margin-left':origmrg});
                    }
                };
                $('#oap_navopts').bind('click',oap_navopts);
                $('#oap_navopts').trigger('click');
            }

        }); // end of the function  
    };
})(jQuery);


/* ---------------------------------------------------------------------
 * oap_refs()
 *
 * search for references, style them and build a reference section
 * default refs are <a class="oap_refs"> tags
 * ---------------------------------------------------------------------
 */
(function($){
    $.fn.oap_refs = function(options) {
        // specify the defaults
        var defaults = {
            identifier: 'a',
            ignore: 'oap_ignore',
            storage_url: '/query/reference/',
            refscrolloffset: 40,
            appendto: this // wherever the references div should be appended
        };
        // and add in any overrides from the call
        var options = $.extend(defaults, options);

        var storeref = function(obj) { // TODO: this is not implemented yet
            var link = obj.attr('href');
            var data = {
                'id': reference,
                'link':[{'url':link}]
            };
            obj.attr('data-title') ? data.title = obj.attr('data-title') : false;
            obj.attr('data-author') ? data.author = obj.attr('data-author').split(',') : false;
            obj.attr('data-journal-name') ? data.journal = {"name":obj.attr('data-journal-name')} : false;
            if ( link.indexOf('doi') >= 0 ) {
                data.identifier = [{'type':'doi','id':link.replace('http://dx.doi.org/','')}];
            };
            // post the ref to the storage
            $.ajax({
                'type':'POST',
                'url':'/query/reference/' + reference,
                "data":JSON.stringify(data),
                "contentType":"application/json; charset=utf-8",
                "processData":false
            })
            return data;
        }

        // a click event so the ref pointer goes to the reference in the list
        var gotoref = function(event) {
	        event.preventDefault();
            var number = $(this).html().replace('[','').replace(']','');
	        window.scrollTo( 0, ($('.oap_reftocite:contains(' + number + ')').offset().top - options.refscrolloffset) )
	    }

        // then a click to jump back to the reference in the page
        var backtocite = function(event) {
            event.preventDefault();
            window.scrollTo( 0, ($('a:contains([' + $(this).attr('href') + '])', obj).offset().top - options.refscrolloffset) )
        }

        // the function that writes the reference to the page
        var writeref = function(data,counter,ident,obj) {
            // create the reference string
            if ( data.missing ) {
                var reference = "? ";
                if ( obj.attr('href') ) {
                    reference += '<a target="_blank" href="' + obj.attr("href") + '">' + obj.attr("href") + '</a>';
                }
            } else {
                var reference = "";
                if ( data.author ) {
                    for ( var i = 0; i < data.author.length; i++ ) {
                        var nm = data.author[i].name
                        if ( nm ) {
                            if ( i != 0 ) { reference += ", "; }
                            reference += nm;
                        }
                    }
                    reference.length > 0 ? reference += " " : false;
                }
                if ( data.year ) {
                    reference += "(" + data.year + ") ";
                }
                reference.length > 0 ? reference += '<br>' : false;
                if ( data.title ) {
                    reference += '<b>' + data.title + '</b>';
                }
                if ( data.journal ) {
                    reference += '<br>';
                    if ( data.journal.title ) {
                        reference += ' in <i>' + data.journal.title + '</i>';
                    }
                    if ( data.journal.name ) {
                        reference += ' in ' + data.journal.name;
                    }
                    if ( data.journal.volume ) {
                        reference += " " + data.journal.volume;
                    }
                    if ( data.journal.issue ) {
                        reference += " (" + data.journal.issue + ')';
                    }
                }
                if ( data.publisher ) {
                    if ( typeof(data.publisher) == "string" ) {
                        reference += '<br>' + data.publisher;
                    } else {
                        reference += '<br>' + data.publisher.name;
                    }
                }
            }

            // update the in-document reference link
        	obj.html('[' + counter + ']');
        	obj.attr('alt','#' + ident + ": " + data.title);
        	obj.attr('title','#' + ident + ": " + data.title);
        	obj.addClass('hidden-print');
        	obj.after('<span class="printref">[' + counter + ']</span>');

            // add the link to the ref if possible
            if ( data.link ) {
                reference += '<br><a class="hidden-print" target="_blank" href="' + data.link[0].url + '">' + data.link[0].url + '</a>';
                reference += '<span class="printref">' + data.link[0].url + '</span>';
            }

        	// then append reference to the docdiv
        	var reftab = '<tr class="oap_references">' + 
        	    '<td style="text-align:right;border:none;"><a class="hidden-print oap_reftocite" alt="^ back to ' + ident + 
        	    '" title="^ back to ' + ident + '" href="' + counter + '">' + counter + 
        	    '</a><span class="printref">' + counter + '</span></td><td class="oap_theref" style="border:none;"><p>' + reference + '</p></td></tr>';
            $('#oapreftable').append(reftab);

            // and attach click events
            $('.oap_reftocite').last().bind('click',backtocite);
        	obj.bind('click',gotoref);
        }

        writerefs = function(data) {
            $(options.appendto).append('<table class="table" id="oapreftable"></table>');
            var refs = {};
            for ( var i = 0; i < data.hits.hits.length; i++ ) {
                var d = data.hits.hits[i]['_source'];
                refs[d['id']] = d;
            }
            $(options.identifier + ':contains("#")', obj).not(options.ignore).each(function(index) {
                var counter = index + 1;
                var ident = $(this).html().replace('#','');
                if ( ident in refs ) {
                    var rec = refs[ident];
                } else {
                    // TODO: send to reference storage - see storeref above
                    //var rec = storeref($(this))
                    var rec = {"missing":true};
                }
                writeref(rec,counter,ident,$(this));
            });
        }

        // do the function
        return this.each(function() {
            // get this object
            obj = $(this);

            // get all the references for this page
            $.ajax({
                'type':'GET',
                'url': options.storage_url + '_search?q=*&size=10000',
                'success': writerefs
            });

        }); // end of the function  
    };
})(jQuery);


/* ---------------------------------------------------------------------
 * oap_figs()
 *
 * search for figures, and number then
 * default refs are <span class="oap_fig"> tags
 * ---------------------------------------------------------------------
 */
(function($){
    $.fn.oap_figs = function(options) {
        // specify the defaults
        var defaults = {
            identifier: '.oap_fig',
            ignore: 'oap_ignore'
        };
        // and add in any overrides from the call
        var options = $.extend(defaults, options);

        // do the function
        return this.each(function() {
            // get this object
            obj = $(this);

            $(options.identifier).not(options.ignore).each(function(index) {
                var counter = index + 1;
                var content = "Figure " + counter + ": " + $(this).html();
                $(this).html(content);
            });

        }); // end of the function  
    };
})(jQuery);


