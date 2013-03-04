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

            // add a TOC div to the page
            obj.prepend('<div id="oap_TOC"><ul style="list-style-type:none;"></ul></div>');

            // for each header in the apdoc,
            $(':header', obj).each(function() {
                // define the anchor name
                var anchorname = $(this).oap_textonly().replace(/\s/gi,'');
                // create the anchor tag and push it onto the TOC
                $(this).append('<a class="oap_anchor" name="' + anchorname + '"></a>');
                $('#oap_TOC ul').append('<li>' + $(this).oap_indent() + $(this).find('.oap_header').html() + ' <a href="#' + anchorname + '">' + $(this).oap_textonly() + '</a></li>');
            });

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
            identifier: '.ref',
        };
        // and add in any overrides from the call
        var options = $.extend(defaults, options);
        // do the function
        return this.each(function() {
            // get this object
            obj = $(this);

            // for every a tag in the oap_doc that does not have oap_ignore class
            $('a.' + options.identifier, obj).each(function(index) {
        	    var counter = index + 1;    	            // move up from zero based loop index
	            var reference = $(this).html();        // get the html out of the link
            	var link = $(this).attr('href');       // get the link out of the a

            	// check to see if oap_ref_counter already exists
            	// if so should only point to the ref that is already there

            	$(this).html('[' + counter + ']');             // add IEEE-style square brackets to the ref number

                var data = {
                    'id': reference,
                    'link':[{'url':link}]
                };
                $(this).attr('data-title') ? data.title = $(this).attr('data-title') : false;
                $(this).attr('data-author') ? data.author = $(this).attr('data-author').split(',') : false;
                $(this).attr('data-journal-name') ? data.journal = {"name":$(this).attr('data-journal-name')} : false;

                var parent = $(this).parents('.dynamic').attr('data-source');
                !parent ? parent = $(this).parents('.contentsection').attr('data-source') : false;
                parent ? data['_parents'] = [parent] : false;

                if ( link.indexOf('doi') >= 0 ) {
                    data.identifier = [{'type':'doi','id':link.replace('http://dx.doi.org/','')}];
                };
                // post the ref to the index
                if ( true /*options.index*/ ) {
                    $.ajax({
                        'type':'POST',
                        'url':'/references/' + reference,
                        "data":JSON.stringify(data),
                        "contentType":"application/json; charset=utf-8",
                        "processData":false
                    })
                }

            	// then append reference to the docdiv
            	var refdiv = '<div class="oap_references">' + 
            	    '<span class="oap_tocite">[' + counter + ']<a class="oap_reftocite" href="' + counter + '"> ^^ </a></span>' + 
            	    '<span class="oap_theref">' + reference + '</span></div>';
                obj.append(refdiv);
                if ( link.length > 0 ) {
                    $('.oap_references:last .oap_theref').append(' : <a href="' + link + '">' + link + '</a>');
                }

                // add a click event to the ref pointer that goes to the reference
                var gotoref = function(event) {
        	        event.preventDefault();
                    var number = $(this).html().replace(/ref /,'');
        	        window.scrollTo( 0, ($('.oap_tocite:contains(' + number + ')').offset().top - 60) )
        	    }
            	$(this).bind('click',gotoref);
            });

            // add click event to the reftocite links so we can jump back to the reference
            var backtocite = function(event) {
                event.preventDefault();
                window.scrollTo( 0, ($('a:contains(' + $(this).attr('href') + ')', obj).offset().top - 60) )
            }
            $('.oap_reftocite').bind('click',backtocite);

        }); // end of the function  
    };
})(jQuery);


