(function($) {
    // see http://docs.jquery.com/Plugins/Authoring etc.

    $.fn.extend({

        /*
            Creates a carousel slider by binding certain
            descendent elements with actions:

                1. The next button has class 'slide_next'

                2. The previous button has class: 'slide_previous'

                3. An "page control" which indicates what slide the user is on
                   is specified with a parent 'page_control' class
                   and with descendent 'control' elements which should
                   be the page control dots.

                   The active page/dot is set with a 'on' class

                4.

            Usage:

                $('div.some_slides_container').slidify();

         */
        slidify: function(options) {

            // Create some defaults, extending them with any options that were provided
            var opts = $.extend( {
                'slide': '.slide',         // selector for each slide
                'left':  '.slide_left',    // selector for the left arrow button
                'right': '.slide_right',   // selector for the right arrow button
                'pagecontrol': '.page_control',   // selector for the page control
                'hasLeftStraddleThing' : false,   // hack to support "featured content"
                'looped': true  // whether or not moving next from the last slide goes to the first
            }, options);

            return this.each(function() {

                var slider = $(this);  // holds the container for the slider

                // set the width of an actual slide, defaulting
                // to 970 pixels if we can't find any!
                SLIDE_WIDTH = slider.find(opts.slide).width() || 970;

                // constants
                var FIRST_SLIDE_NUMBER = 1;
                var LEFT  = 'left';
                var RIGHT = 'right';

                // should be set to true somewhere if...
                //     1.  we're on the last slide and the right arrow is pressed
                //     2.  we're on the first slide and the left arrow is pressed
                var willLoopAround = false;

                // bind the left and arrow buttons
                slider.find(opts.left).click(function() {
                    doAnimate(LEFT);
                });
                slider.find(opts.right).click(function() {
                    doAnimate(RIGHT);
                });

                // clicking on a arrow buttons should show a i-am-pressed state
                slider.find([opts.left, opts.right].join(',')).bind('mousedown mouseup mouseout', toggleArrowPressed);

                function doAnimate(direction) {

                    var LAST_SLIDE_NUMBER = slider.find(opts.slide).size();

                    var pageControlSelector = opts.pagecontrol + ' .control.on';

                    // 10/4/12  the CSS is one-indexed right etc. etc.
                    var currentSlideNumber = slider.find(pageControlSelector).index() + 1;
                    var nextSlideNumber;

                    // same as slideWidth, but as a string that can be
                    // passed to set a CSS `width:` attribute
                    var slideWidthPixels = [SLIDE_WIDTH, 'px'].join('');

                    var currSlideStart = {};
                    var currSlideEnd   = {};
                    var nextSlideStart = {};
                    var nextSlideEnd   = {};

                    //  set up the slide/carousel animation based on the
                    //  given direction we want to go

                    // we always want the "next" slide to be the current
                    nextSlideEnd['left'] = "0px";

                    switch(direction) {
                        case LEFT:
                            if(currentSlideNumber == FIRST_SLIDE_NUMBER) {
//                                 console.log('global.js:251  at start of slides! not movin!  currentSlideNumber: ' + currentSlideNumber + '   FIRST_SLIDE_NUMBER: ' + FIRST_SLIDE_NUMBER);

                                if(opts.looped) {
                                    nextSlideNumber = LAST_SLIDE_NUMBER;
                                }
                                else {
                                    return;   // don't loop, so stop right away!
                                }
                            }
                            else {
                                nextSlideNumber = currentSlideNumber - 1;
                            }

                            // this moves the slides left
                            currSlideEnd['left']   = slideWidthPixels;
                            nextSlideStart['left'] = '-' + slideWidthPixels;

                            break;

                        case RIGHT:
                            if(currentSlideNumber  >= LAST_SLIDE_NUMBER) {
//                                 console.log('global.js:265  at end of slides! not movin!   currentSlideNumber: ' + currentSlideNumber + '   LAST_SLIDE_NUMBER: ' + LAST_SLIDE_NUMBER);

                                if(opts.looped) {
                                    nextSlideNumber = FIRST_SLIDE_NUMBER;
                                }
                                else {
                                    return;
                                }
                            }
                            else {
                                nextSlideNumber = currentSlideNumber + 1;
                            }

                            // ...and this moves the slides right!
                            currSlideEnd['left']   = '-' + slideWidthPixels;
                            nextSlideStart['left'] = slideWidthPixels;

                            break;

                        default:
                            return;
                    }

                    // build the class selector for the next slide
                    var selectorCurrent = '.slide' + currentSlideNumber;
                    var selectorNext    = '.slide' + nextSlideNumber;
                    var currSlide  = slider.find(selectorCurrent);
                    var nextSlide  = slider.find(selectorNext);

//                     console.log('global.js:315   currentSlideNumber: ' + currentSlideNumber + '   nextSlideNumber: ' + nextSlideNumber);

//                     console.log('global.js:317      doAnimate() ' + direction + '   selectorCurrent: ' + selectorCurrent + '   selectorNext: ' + selectorNext + '    currSlide.size(): ' + currSlide.size() + '    nextSlide.size(): ' + nextSlide.size() + '   LAST_SLIDE_NUMBER: ' + LAST_SLIDE_NUMBER);


                    // slide OUT the current slide and slide IN the new one
                    //
                    // the below sets the CSS position of the current slide to
                    // the right or left of the viewport, and then slides back in
                    // the new slide to show into the viewport
                    //

                    currSlide.animate(currSlideEnd, function() {
                        $(this).removeClass('active');
                    });

                    nextSlide.addClass('active').css(nextSlideStart).animate(
                            nextSlideEnd);

                    // finally, the orange page control / bullet things
                    // should reflect the current slide we're on....!
                    var pageControls = slider.find(opts.pagecontrol + ' .control');
                    pageControls.removeClass('on').eq(nextSlideNumber - 1).addClass('on');
                }

                function toggleArrowPressed(e) {
                    if(e.type == 'mousedown') {
                        $(this).addClass('pressed');
                    }
                    else {
                        $(this).removeClass('pressed');
                    }
                }
            });
        }
    });

})( jQuery );


