/*
 * jquery.jsite.js
 *
 * a tool for controlling edit functionality on the CL website
 * almost abstracted enough to be used as a lib on other sites
 *
 * DOES NOT WORK WITHOUT jquery.jtedit.js and jquery.facetview.js
 * 
 * created by Mark MacGillivray - mark@cottagelabs.com
 *
 * copyheart 2012. http://copyheart.org
 *
 */

(function($){
    $.fn.jsite = function(options) {


//------------------------------------------------------------------------------
        // READY THE DEFAULTS

        // specify the defaults - currently pushed from Flask settings
        var defaults = {};

        // and add in any overrides from the call
        $.fn.jsite.options = $.extend(defaults,options);
        var options = $.fn.jsite.options;
        
        
//------------------------------------------------------------------------------

        var updatechildren = function(data,children) {
            if ( data ) {
                if ( data.hasOwnProperty('content') ) {
                    if ( data.content.length && children.length ) {
                        data.children = children;
                        if ( data.hasOwnProperty('url') ) {
                            var url = data.url;
                        } else {
                            var url = '/' + data.id;
                        }
                        delete data.content; // save space
                        $.ajax({
                            "type":"POST",
                            "url":url,
                            "data":JSON.stringify(data),
                            "contentType":"application/json; charset=utf-8",
                            "processData":false
                        });
                    }
                }
            }
        };
        
        // take a snapshot of the page as it currently stands and package it so it can be viewed statically or downloaded
        var packagepage = function(event) {
            event ? event.preventDefault() : false;
            var currstate = $('#contentblock').clone();
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
        
        var embed = function(data) {
            var content = data['content'];
            this.into.html('');
            this.into.append(content);
            this.into.attr('id',data['id']);
            this.into.addClass('expanded');
            options.loggedin ? this.into.bind('click',editinline) : false;
            var children = [];
            this.into.find('.dynamic').each(function() {
                children.push($(this).attr('data-source').replace('.json',''));
                var src = $(this).attr('data-source').replace('.json','') + '.json';
                $.ajax({"url": src, "success": embed, "into": $(this)});
            });
            updatechildren(data,children);
            if ( !this.into.find('.dynamic').length && $('.dynamic').not('.expanded').length == 0 ) {
                // remove previously created versions to clean up before rebuilding
                $('#oap_TOC').remove();
                $('.bconts').remove();
                $('.oap_references').remove();
                $('.oap_header').remove();
                $('.contents').unbind('click',contents);
                // rebuild
                $('#contentblock').oap_headers().oap_refs().oap_toc();
                $('#oap_TOC').hide();
                var contents = function(event) {
                    event ? event.preventDefault() : false;
                    $('#oap_TOC').toggle();
                }
                $('.contents').bind('click',contents);
                $('.contents').html( $('.contents').html() + '<b style="margin-left:5px;" class="caret bconts"></b>' );
            }
        };        
        var viewpage = function(event) {
            // replace any dynamic content divs with the actual content
            // and update the page children whilst at it
            var children = [];
            $('.dynamic').each(function() {
                children.push($(this).attr('data-source').replace('.json',''));
                var src = $(this).attr('data-source').replace('.json','') + '.json';
                $.ajax({"url": src, "success": embed, "into": $(this)});
            });
            updatechildren(options.data,children);
            
            // enable presentation trigger buttons
            var presentation = function(event) {
                event ? event.preventDefault() : false;
                if ( $(this).hasClass('active') ) {
                    $(this).removeClass('active');
                    $('#contentblock').jmpress('deinit');                
                } else {
                    $(this).addClass('active');
                    $('#contentblock').jmpress();
                }
            }
            $('.presentation').bind('click',presentation);
            
            // enable inline edit if logged in
            options.loggedin ? $('.contentsection').bind('click',editinline) : false;
        
            // put any facetviews into any facetview divs
            $('.facetview').each(function() {
                var opts = jQuery.extend(true, {}, options.facetview); // clone the options
                for ( var style in options.facetview_displays ) {
                    $(this).hasClass('facetview-' + style) ? opts = $.extend(opts, options.facetview_displays[style] ) : "";
                };
                $(this).hasClass('facetview-slider') ? opts.pager_slider = true : "";
                $(this).hasClass('facetview-descending') ? opts['sort'] = [{"created_date.exact":{"order":"desc"}}] : "";
                $(this).hasClass('facetview-ascending') ? opts['sort'] = [{"created_date.exact":{"order":"asc"}}] : "";
                if ( $(this).hasClass('facetview-searchable') ) {
                    opts.embedded_search = true;
                } else {
                    opts.embedded_search = false;
                };
                $(this).attr('data-search') ? opts.q = $(this).attr('data-search') : "";
                $(this).attr('data-size') ? opts.paging.size = $(this).attr('data-size') : "";
                $(this).attr('data-from') ? opts.paging.from = $(this).attr('data-from') : "";
                $(this).attr('data-index') ? opts.search_url = '/query/' + $(this).attr('data-index') + '/_search?': "";
                $(this).attr('data-url') ? opts.search_url = $(this).attr('data-url'): "";
                $(this).facetview(opts);
            });

            // enable commenting if necessary
            if ( options.data["comments"] && options.comments ) {
                var disqus = '<div id="comments" class="container"><div class="comments"><div class="row-fluid" id="disqus_thread"></div></div></div> \
                    <script type="text/javascript"> \
                    var disqus_shortname = "' + options.comments + '"; \
                    (function() { \
                        var dsq = document.createElement("script"); dsq.type = "text/javascript"; dsq.async = true; \
                        dsq.src = "http://" + disqus_shortname + ".disqus.com/embed.js"; \
                        (document.getElementsByTagName("head")[0] || document.getElementsByTagName("body")[0]).appendChild(dsq); \
                    })(); \
                </script>';
                $('#main').after(disqus);
            };
            
        };
        
        // SHOW A BLOCK AS EDITABLE INLINE
        var editinline = function(event) {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            var id = $(this).attr('data-id');
            !id ? id = $(this).attr('id') : false;
            var block = $('#' + id);
            var height = block.height();
            block.html('');
            block.append('<div id="pad_' + id + '"></div>');
            if ( options.collaborative ) {
                $('#pad_'+id).pad({
                  'padId'             : id,
                  'host'              : options.pads_address,
                  'baseUrl'           : options.pads_baseurl,
                  'showControls'      : false,
                  'showChat'          : false,
                  'showLineNumbers'   : false,
                  'userName'          : options.loggedin,
                  'useMonospaceFont'  : false,
                  'noColors'          : true,
                  'hideQRCode'        : true,
                  'height'            : (height+100) + 'px',
                  'border'            : 0,
                  'borderStyle'       : 'solid'
                });
            } else {
                alert('should put RTE back in here');
            }
            block.append('<div class="blockoptions"> \
                <a class="label edit_page_direct" data-id="' + id + '" href="#">fullscreen</a> \
                <a class="label edit_exit" data-id="' + id + '" href="#">exit</a> \
            </div>');
            $('.edit_exit').bind('click',editexit);
            $('.edit_page_direct').bind('click',editpage);
        }
        $('.edit_inline').bind('click',editinline);
        var editexit = function(event) {
            event ? event.preventDefault() : false;
            var id = $(this).attr('data-id');
            $('#pad_'+id).remove();
            var src = id.replace('.json','') + '.json';
            $.ajax({"url": src, "success": embed, "into": $('#'+id)});
        };

        // SHOW EDITABLE VERSION OF PAGE
        var editpage = function(event) {
            event ? event.preventDefault() : "";
            var id = $(this).attr('data-id');
            !id ? id = options.data.id : false;
            $('#pad_'+id).length ? $('#pad_'+id).remove() : false;
            var collab_edit = '<div id="collab_edit"></div>';
            $('body').append(collab_edit);
            $('#collab_edit').css({
                'padding':0,
                'margin':'60px 0 0 0',
                'position':'absolute',
                'top':0,
                'left':0,
                'width':'100%'
            });
            if ( options.collaborative ) {
                setTimeout(function() {$('#collab_edit').pad({
                  'padId'             : id,
                  'host'              : options.pads_address,
                  'baseUrl'           : options.pads_baseurl,
                  'showControls'      : true,
                  'showChat'          : true,
                  'showLineNumbers'   : true,
                  'userName'          : options.loggedin,
                  'useMonospaceFont'  : false,
                  'noColors'          : false,
                  'hideQRCode'        : false,
                  'height'            : '100%',
                  'border'            : 0,
                  'borderStyle'       : 'solid'
                });}, 500);
            } else {
                var editor = '<div class="row-fluid" style="margin-bottom:20px;"><div class="span12"> \
                    <textarea class="tinymce jtedit_value jtedit_content" id="form_content" name="content" \
                    style="width:99%;min-height:300px;" placeholder="content. text, markdown or html will work."> \
                    </textarea></div></div>';
                $('#article').append(editor);
                if ( options.richtextedit ) {
	                $('textarea.tinymce').tinymce({
		                script_url : '/static/vendor/tinymce/jscripts/tiny_mce/tiny_mce.js',
		                theme : "advanced",
		                plugins : "autolink,lists,style,layer,table,advimage,advlink,inlinepopups,media,searchreplace,contextmenu,paste,fullscreen,noneditable,nonbreaking,xhtmlxtras,advlist",
		                theme_advanced_buttons1 : "bold,italic,underline,|,justifyleft,justifycenter,justifyright,justifyfull,formatselect,fontselect,fontsizeselect,|,forecolor,backcolor,|,bullist,numlist,|,outdent,indent,blockquote,|,sub,sup,|,styleprops",
		                theme_advanced_buttons2 : "undo,redo,|,cut,copy,paste,|,search,replace,|,hr,link,unlink,anchor,image,charmap,media,table,|,insertlayer,moveforward,movebackward,absolute,|,cleanup,code,help,visualaid,fullscreen",
		                theme_advanced_toolbar_location : "top",
		                theme_advanced_toolbar_align : "left",
		                theme_advanced_statusbar_location : "bottom",
		                theme_advanced_resizing : true,

	                });
	            }
                $('#form_content').val(options.data.content);
            }
            $('#collab_edit').height( $(window).height() - 70 );
            $('#padid').html(id);
        }


        // EDIT OPTION BUTTON FUNCTIONS
        var editoptions = function() {
            var showopts = function(event) {
                event ? event.preventDefault() : "";
                $('#collab_edit').toggle();
                $('#collab_edit').height( $(window).height() - 70 );
                $('#metaopts').toggle();
            }
            $('.edit_page').bind('click',editpage);
            $('.package_page').bind('click',packagepage);
            $('#metaopts').remove()
            
            // for convenience
            var record = options.data
            
            // create page settings options panel
            var metaopts = '\
                <div id="metaopts" class="row-fluid" style="background:#eee; -webkit-border-radius: 6px; -moz-border-radius: 6px; border-radius: 6px; margin-bottom:10px;margin-top:60px;padding-bottom:20px;"> \
                    <div class="row-fluid"> \
                        <div class="span8" style="padding:5px;"><h2>page settings</h2></div> \
                        <div class="span4" style="padding:5px;"> \
                            <button class="pagesettings close" style="margin-right:8px;"> x </button> \
                            <button class="save_option_edits close" style="margin-right:8px;"> save </button> \
                        </div> \
                    </div> \
                    <div class="row-fluid"> \
                        <div class="span6" id="page_info" style="padding:5px;"> \
                            <h3>page info</h3> \
                            <div class="row-fluid"><div class="span3"><strong>navigation title:</strong></div><div class="span9"><input type="text" class="span12 jtedit_value" data-path="title" /></div></div> \
                            <div class="row-fluid"><div class="span3"><strong>page address:</strong></div><div class="span9"><input type="text" class="span12 jtedit_value" data-path="url" /></div></div> \
                            <div class="row-fluid"><div class="span3"><strong>primary author:</strong></div><div class="span9"><input type="text" class="span12 jtedit_value" data-path="author" /></div></div> \
                            <div class="row-fluid"><div class="span3"><strong>brief summary:</strong></div><div class="span9"><textarea class="span12 jtedit_value" data-path="excerpt"></textarea></div></div> \
                            <div class="row-fluid"><div class="span3"><strong>tags:</strong></div><div class="span9"><textarea class="span12 page_options page_tags"></textarea></div></div> \
                            <div class="row-fluid"><div class="span3"></div><div class="span9"> \
                                <a class="btn btn-primary save_option_edits" href="#">Save these settings</a> \
                                <a class="btn btn-warning delete_page" href="#">Delete this page</a> \
                            </div></div> \
                        </div> \
                        <div class="span6" id="access_settings" style="padding:5px;"> \
                            <h3>access settings</h3> \
                            <input type="checkbox" class="page_options access_page" /> <strong>anyone can access</strong> this page without login <br> \
                            <input type="checkbox" class="page_options mode_page" /> <strong>editable by default</strong>, to anyone that can view it <br> \
                            <input type="checkbox" class="page_options nav_page" /> <strong>list this page</strong> in public search results <br> \
                            <input type="checkbox" class="page_options page_comments" /> <strong>page comments</strong> enabled on this page<br> \
                            <br>\
                            <h3>embed content</h3> \
                            <div class="row-fluid"><div class="span3"><strong>file url:</strong></div><div class="span9"><input type="text" class="span12 page_options jtedit_value" data-path="embed" /></div></div> \
                        </div> \
                    </div> \
                    <div id="jtedit_space"></div> \
                </div>';
            
            $('body').prepend(metaopts);
            $('#metaopts').hide();
            $('.pagesettings').bind('click',showopts);
            
            // set pre-existing values into page settings
            options.data['editable'] ? $('.mode_page').attr('checked',true) : "";
            options.data['accessible'] ? $('.access_page').attr('checked',true) : "";
            options.data['visible'] ? $('.nav_page').attr('checked',true) : "";
            options.data['comments'] ? $('.page_comments').attr('checked',true) : "";
            options.data['tags'] ? $('.page_tags').val(options.data['tags']) : "";

            // handle changes to page settings
            var save = function(event) {
                var record = $.parseJSON($('#jtedit_json').val());
                $('.mode_page').attr('checked') == 'checked' ? record['editable'] = true : record['editable'] = false;
                $('.page_comments').attr('checked') == 'checked' ? record['comments'] = true : record['comments'] = false;
                $('.access_page').attr('checked') == 'checked' ? record['accessible'] = true : record['accessible'] = false;
                $('.nav_page').attr('checked') == 'checked' ? record['visible'] = true : record['visible'] = false;
                var tags = $('.page_tags').val().split(',');
                record['tags'] = [];
                for ( var item in tags ) {
                    var titem = $.trim(tags[item]);
                    titem.length != 0 ? record['tags'].push(titem) : false;
                }
                $('#jtedit_json').val(JSON.stringify(record,"","    "));
                $.fn.jtedit.saveit(false,false,record);
                showopts();
            }
            $('.save_option_edits').bind('click',save);
            
            var deletepage = function(event) {
                event ? event.preventDefault() : false;
                $.fn.jtedit.deleteit();
            }
            $('.delete_page').bind('click',deletepage);

            $('#jtedit_space').jtedit({'data':options.data, 
                                        'makeform': false, 
                                        'actionbuttons': false,
                                        'jsonbutton': false,
                                        'delmsg':"", 
                                        'savemsg':"", 
                                        //"saveonupdate":true, 
                                        "reloadondelete":"/",
                                        "reloadonsave":""});
        }
        

//------------------------------------------------------------------------------
        // TWEETS
        var tweets = function() {
            $(".tweet").tweet({
                username: options.twitter,
                avatar_size: 48,
                count: 5,
                join_text: "auto",
                auto_join_text_default: "",
                auto_join_text_ed: "",
                auto_join_text_ing: "",
                auto_join_text_reply: "",
                auto_join_text_url: "",
                loading_text: "loading tweets..."
            })
        }

        // scroll to anchors with offset
        var scroller = function(event) {
            if ( $(this).attr('href').length > 1 && $(this).attr('href').substring(0,1) == '#' ) {
                event.preventDefault()
                $('html,body').animate({scrollTop: $('a[name=' + $(this).attr('href').replace('#','') +  ']').offset().top - 70}, 10)
            }
        }

        var contactus = function(event) {
            event.preventDefault()
            
            var try_again = function(event) {
                event.preventDefault()
                
                var form = $(this).parent().siblings("form")
                $(this).parent().detach()
                form.show()
            }
            
            var form = $(this).parent()
            var message = form.children('[name="message"]').val()
            var email = form.children('[name="email"]').val()
            var action = form.attr("action")
            $.post(action, {"message" : message, "email" : email})
                .success(function() {
                    form.hide()
                    form.parent().prepend('<div class="alert alert-success" style="text-align:left;">thanks for your message! we\'ll get back to you as soon as we can</div>')
                })
                .error(function() {
                    form.hide()
                    form.parent().prepend('<div class="alert alert-error" style="text-align:left;">oops! something went wrong sending your message; please <a href="/contact" id="contact_try_again">try again</a></div>') 
                    $('#contact_try_again').bind('click', try_again)
                })
        }

        return this.each(function() {
                        
            // bind new page creation to new page button
            var newpage = function(event) {
                event.preventDefault();
                var subaddr = window.location.pathname;
                subaddr.charAt(subaddr.length-1) != '/' ? subaddr += '/' : "";
                var newaddr = prompt('what / where ?',subaddr);
                newaddr.indexOf('/null') == -1 ? window.location = newaddr : "";
            };
            $('#new_page').bind('click',newpage);

            // bind anchor scroller offset fix
            $('a').bind('click',scroller);

            // bind the twitter display if twitter account provided
            options.twitter ? tweets() : false;
            
            options.loggedin ? editoptions() : false;
            viewpage();

        });

    };

    // options are declared as a function so that they can be retrieved
    // externally (which allows for saving them remotely etc)
    $.fn.jsite.options = {};

})(jQuery)

