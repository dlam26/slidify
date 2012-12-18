// TODO:  rename left/right to prev/next etc.
//          why?  the button that goes to the next slide might not
//          not neccessarily be on the right!

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

            // class denoting the slide which is currently visible
            var ACTIVE = 'active';

            // touch/finger swipe options 
            var TOUCH_SIMPLE = 'simple';
            var TOUCH_NONE = 'none';
            var TOUCH_SLIDES_WITH_FINGER = 'slideswithfinger';

            // Create some defaults, extending them with any options that were provided
            var opts = $.extend( {
                'slide': '.slide',         // selector for each slide
                'slides': '.slides',       // selector for the container holding slides
                'left':  '.slide_left',    // selector for the left arrow button
                'right': '.slide_right',   // selector for the right arrow button
                'pagecontrol': '.page_control',   // selector for the page control
                'hasLeftStraddleThing' : false,   // hack to support "featured content"
                'looped': true,  // whether or not moving next from the last slide goes to the first

                'touch': TOUCH_SIMPLE,  

                'sliderChangedCallback': function(currSlideNumber, newSlideNumber) {}  // called when the left/right arrow buttons are clicked
            }, options);

            return this.each(function(index, value) {

                var slider = $(this);  // holds the container for the slider

                // the first slide should be "active", so add a class to it
                slider.find(opts.slide + ':first').addClass(ACTIVE);

                // set the width of an actual slide, defaulting
                // to 970 pixels if we can't find any!
                SLIDE_WIDTH = slider.find(opts.slide).width() || 970;

                // constants
                var FIRST_SLIDE_NUMBER = 1;
                var LEFT  = 'left';
                var RIGHT = 'right';
                var IS_TOUCH_SIMPLE = opts.touch == TOUCH_SIMPLE;

                // should be set to true somewhere if...
                //     1.  we're on the last slide and the right arrow is pressed
                //     2.  we're on the first slide and the left arrow is pressed
                var willLoopAround = false;

                // bind the left and arrow buttons
                enableNextPrevButtons();
                makeSwipable();

                // clicking on a arrow buttons should show a i-am-pressed state
                slider.find([opts.left, opts.right].join(',')).bind('mousedown mouseup mouseout', toggleArrowPressed);

                var leftArrow  = slider.find(opts.left);
                var rightArrow = slider.find(opts.right);

                function doAnimate(direction) {

                    // disable the next/prev buttons so you can't spam clicks
                    disableNextPrevButtons();

                    var LAST_SLIDE_NUMBER = slider.find(opts.slide).size();

                    var pageControlSelector = opts.pagecontrol + ' .control.on';

                    // 10/4/12  the CSS is one-indexed right etc. etc.
                    var currentSlideNumber = slider.find(opts.slide + '.' + ACTIVE).index() + 1;
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

                            if(currentSlideNumber <= FIRST_SLIDE_NUMBER) {

                                console.log('slidify.js:120  at start of slides!  currentSlideNumber: ' + currentSlideNumber + '   FIRST_SLIDE_NUMBER: ' + FIRST_SLIDE_NUMBER);

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
                                console.log('slidify.js:121  at end of slides!   currentSlideNumber: ' + currentSlideNumber + '   LAST_SLIDE_NUMBER: ' + LAST_SLIDE_NUMBER);

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
                            console.log('slidify.js:151  doAnimate() wtf, shouldnt get to default block!');
                            return;
                    }


                    // build the class selector for the next slide
                    var selectorCurrent = '.slide' + currentSlideNumber;
                    var selectorNext    = '.slide' + nextSlideNumber;
                    var currSlide  = slider.find(selectorCurrent);
                    var nextSlide  = slider.find(selectorNext);


                    console.log('slidify.js:152      doAnimate() ' + direction + '   selectorCurrent: ' + selectorCurrent + '   selectorNext: ' + selectorNext + '    currSlideEnd.left: ' + currSlideEnd.left + '    nextSlideEnd.left: ' + nextSlideEnd.left + '   LAST_SLIDE_NUMBER: ' + LAST_SLIDE_NUMBER + '   currentSlideNumber: ' + currentSlideNumber + '   nextSlideNumber: ' + nextSlideNumber + '   currSlide.size(): ' + currSlide.size() + '   nextSlide.size(): ' + nextSlide.size());


                    // slide OUT the current slide and slide IN the new one
                    //
                    // the below sets the CSS position of the current slide to
                    // the right or left of the viewport, and then slides back in
                    // the new slide to show into the viewport
                    //

                    currSlide.animate(currSlideEnd, {

                        complete: function() {

                            console.log('REMOVING ACTIVE CLASS  -> ' + $(this).attr('class'));

                            // since removing the ACTIVE class will make it disappear,
                            // remove it *after* its slid out
                            $(this).removeClass(ACTIVE);
                            $(this).removeAttr('style');

                        }

                    });

                    nextSlide.addClass(ACTIVE).css(nextSlideStart).animate(
                        nextSlideEnd,
                        function() {

                            // ...because we disable it at the top of doAnimate
                            // to prevent next/prev click spam
                            enableNextPrevButtons();

                            opts.sliderChangedCallback(
                                currentSlideNumber, nextSlideNumber);
                        }
                    );

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

                function enableNextPrevButtons() {

                    slider.find(opts.left).click(function() {
                        console.log('slidify.js:208  Clicked left');
                        doAnimate(LEFT);
                    });

                    slider.find(opts.right).click(function() {
                        console.log('slidify.js:212  Clicked right');
                        doAnimate(RIGHT);
                    });
                }

                function disableNextPrevButtons() {
                    slider.find([opts.left, opts.right].join(',')).unbind('click');
                }

                function makeSwipable() {
                    /*
                         bind touch events!      
                         e.g. http://developer.apple.com/library/ios/#documentation/AppleApplications/Reference/SafariWebContent/HandlingEvents/HandlingEvents.html

                         event.preventDefault() here will prevent the slider 
                         and or default browser panning action from doing 
                         anything at all  (so you probably dont want this)
                    */ 

                    var startX, startY, endX, endY, prevX, prevY, deltaX, deltaY;
                    var movedMoreVertically = true;
                    var isChangingSlides = false;

                    // because slider is a jQuery object
                    var sliderSlides = slider.find(opts.slides)[0];

                    if(!sliderSlides) {
                        console.log('slidify.js:257  doh! slidify needs a child ' + opts.slides + ' element to work!');
                        return;
                    }

                    sliderSlides.addEventListener('touchstart', function(e) {

                        if(isChangingSlides)
                            return;

                        console.log('----------------------------------------');

                        // reset everything
                        startX = 0;
                        startY = 0;
                        endX   = 0;
                        endY   = 0;
                        prevX  = 0;
                        prevY  = 0;
                        deltaX = 0;
                        deltaY = 0;

                        var start = e.targetTouches[0];

                        console.log('slidify.js:281   touchstart   ' + touchToString({ x:start.pageX, y:start.pageY }));


                        startX = e.targetTouches[0].pageX;
                        startY = e.targetTouches[0].pageY;

                    }, false);

                    sliderSlides.addEventListener('touchmove', function(e) {

//                         console.log('slidify.js:302   touchmove');

                        endX = e.changedTouches[0].pageX;
                        endY = e.changedTouches[0].pageY;
                        deltaX = prevX - endX;
                        deltaY = prevY - endY;

                        movedMoreVertically = Math.abs(deltaY) > Math.abs(deltaX);

                        if(movedMoreVertically || isChangingSlides) {
                            // allow vertical panning to proceed as usual
                        }
                        else { 
                            // user has appeared to slide across the slides,
                            // so DONT scroll the screen in the mobile browser 
                            // as it'll make .animate()'s callback not-seem-to-fire
                            e.preventDefault();
                        }

                        prevX = endX;
                        prevY = endY;

                    }, false);


                    sliderSlides.addEventListener('touchend', function(e) {

                        var tapped = (endX === 0 && endY === 0);

                        console.log('slidify.js:326   touchend at ' + 
                                      touchToString({ x: endX, y: endY }));

                        if(tapped) {
                            console.log('slidify.js:330  just did a tap, so not doin anythin');
                        }
                        else if(isChangingSlides) {
                            console.log('slidify.js:333  changing slides, dont do anythin');
                        }
                        else {
                            e.preventDefault();

                            var changeX = endX - startX;
                            var changeY = endY - startY;
                            var swipedToTheLeft = changeX < 0;

                            // don't do anything if the user panned more vertically
                            // than horizontally, because that'll seem weird
                            //
                            if( movedMoreVertically || changeX === 0) {

                                console.log('slidify.js:341  movedMoreVertically, so no do stuff'); 
                            }
                            else {

                                console.log('slidify.js:357   touchend! change? ' +
                                        touchToString({ x:changeX, y:changeY }));

                                if(swipedToTheLeft) {

                                    console.log('slidify.js:361  swiped left');
                                    doAnimate(RIGHT);
                                }
                                else {
                                    console.log('slidify.js:367  swiped right');
                                    doAnimate(LEFT);
                                }
                            }
                        }

                    }, false);
                }


                function touchToString(t) {
                    return '( x:' + t.x + ', y:' + t.y + ' )';
                }

            });
        }
    });

})( jQuery );


