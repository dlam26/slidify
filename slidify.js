//  
//   slidify.js
//


//
// NOTE:  doing event.preventDefault can disable the default browser behavior 
//        of being able to pan around the page and pinch-to-zoom
//

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
            var TOUCH_SLIDES_WITH_FINGER = 'slides-with-finger';

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

                console.log('slidify.js:64  initiating slidified slider #' + index + ' with touch style, ' + opts.touch);

                var slider = $(this);  // holds the container for the slider

                // the first slide should be "active", so add a class to it
                slider.find(opts.slide + ':first').addClass(ACTIVE);

                // set the width of an actual slide, defaulting
                // to 970 pixels if we can't find any!
                SLIDE_WIDTH = slider.find(opts.slide).width() || 970;

                // same as slideWidth, but as a string that can be
                // passed to set a CSS `width:` attribute
                SLIDE_WIDTH_PIXELS = [SLIDE_WIDTH, 'px'].join('');

                // constants
                var FIRST_SLIDE_NUMBER = 1;
                var LAST_SLIDE_NUMBER = slider.find(opts.slide).size();   // XXX
                var LEFT  = 'left';
                var RIGHT = 'right';
                var IS_TOUCH_SIMPLE = opts.touch == TOUCH_SIMPLE;
                var IS_TOUCH_SLIDES_WITH_FINGER = opts.touch == TOUCH_SLIDES_WITH_FINGER;

                // should be set to true somewhere if...
                //     1.  we're on the last slide and the right arrow is pressed
                //     2.  we're on the first slide and the left arrow is pressed
                var willLoopAround = false;

                var currSlideNum, prevSlideNum, nextSlideNum;
                var currSlide, prevSlide, nextSlide;  // for TOUCH_SLIDES_WITH_FINGER

                enableNextPrevButtons();
                makeSwipable();
                setSlideNumbers();

                // clicking on a arrow buttons should show a i-am-pressed state
                slider.find([opts.left, opts.right].join(',')).bind('mousedown mouseup mouseout', toggleArrowPressed);

                var leftArrow  = slider.find(opts.left);
                var rightArrow = slider.find(opts.right);

                function doAnimate(direction, doAnimateCallback) {

                    doAnimateCallback = doAnimateCallback || function(){};

                    // disable the next/prev buttons so you can't spam clicks
                    disableNextPrevButtons();

                    var pageControlSelector = opts.pagecontrol + ' .control.on';

                    // 10/4/12  the CSS is one-indexed right etc. etc.
                    // 12/18/12  old method, before 
                    //var currSlideNum = slider.find(opts.slide + '.' + ACTIVE).index() + 1;


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

                            if(currSlideNum <= FIRST_SLIDE_NUMBER) {

                                console.log('slidify.js:120  at start of slides!  currSlideNum: ' + currSlideNum + '   FIRST_SLIDE_NUMBER: ' + FIRST_SLIDE_NUMBER);

                                if(opts.looped) {
                                    nextSlideNum = LAST_SLIDE_NUMBER;
                                }
                                else {
                                    return;   // don't loop, so stop right away!
                                }
                            }
                            else {
                                nextSlideNum = currSlideNum - 1;
                            }

                            // this moves the slides left
                            currSlideEnd['left']   = SLIDE_WIDTH_PIXELS;
                            nextSlideStart['left'] = '-' + SLIDE_WIDTH_PIXELS;

                            break;

                        case RIGHT:
                            
                            if(currSlideNum  >= LAST_SLIDE_NUMBER) {
                                console.log('slidify.js:121  at end of slides!   currSlideNum: ' + currSlideNum + '   LAST_SLIDE_NUMBER: ' + LAST_SLIDE_NUMBER);

                                if(opts.looped) {
                                    nextSlideNum = FIRST_SLIDE_NUMBER;
                                }
                                else {
                                    return;
                                }
                            }
                            else {
                                nextSlideNum = currSlideNum + 1;
                            }

                            // ...and this moves the slides right!
                            currSlideEnd['left']   = '-' + SLIDE_WIDTH_PIXELS;
                            nextSlideStart['left'] = SLIDE_WIDTH_PIXELS;

                            break;

                        default:
                            console.log('slidify.js:151  doAnimate() wtf, shouldnt get to default block!');
                            return;
                    }


                    // build the class selector for the next slide
                    var selectorCurrent = getSlideSelector(currSlideNum);
                    var selectorNext = getSlideSelector(nextSlideNum);
                    var currSlide  = slider.find(selectorCurrent);
                    var nextSlide  = slider.find(selectorNext);


                    console.log('slidify.js:152  doAnimate() ' + direction + '   selectorCurrent: ' + selectorCurrent + '   selectorNext: ' + selectorNext + '    currSlideEnd.left: ' + currSlideEnd.left + '    nextSlideEnd.left: ' + nextSlideEnd.left + '   LAST_SLIDE_NUMBER: ' + LAST_SLIDE_NUMBER + '   currSlideNum: ' + currSlideNum + '   nextSlideNum: ' + nextSlideNum + '   currSlide.size(): ' + currSlide.size() + '   nextSlide.size(): ' + nextSlide.size());


                    // slide OUT the current slide and slide IN the new one
                    //
                    // the below sets the CSS position of the current slide to
                    // the right or left of the viewport, and then slides back in
                    // the new slide to show into the viewport
                    //

                    currSlide.animate(currSlideEnd, {

                        complete: function() {

                            console.log('slidify.js:203  doAnimate()  currSlide.animate callback!  REMOVING ACTIVE CLASS  -> ' + $(this).attr('class'));

                            // since removing the ACTIVE class will make it disappear,
                            // remove it *after* its slid out
                            $(this).removeClass(ACTIVE);
                            $(this).removeAttr('style');
                        }

                    });

                    nextSlide.addClass(ACTIVE).css(nextSlideStart).animate(nextSlideEnd, {

                        complete: function() {

                            // FIXME if you start the animation and then sorta scroll
                            //       the page such that the slider goes off the screen,
                            //       these (important) callbacks might not run!

                            console.log('slidify.js:220  doAnimate()  nextSlide.animate callback!  cleaning up slider state...');

                            // ...because we disable it at the top of doAnimate
                            // to prevent next/prev click spam
                            enableNextPrevButtons();

                            opts.sliderChangedCallback(
                                currSlideNum, nextSlideNum);

                            doAnimateCallback();
                        }
                    });

                    // finally, the orange page control / bullet things
                    // should reflect the current slide we're on....!
                    var pageControls = slider.find(opts.pagecontrol + ' .control');
                    pageControls.removeClass('on').eq(nextSlideNum - 1).addClass('on');

                    setSlideNumbers(nextSlideNum);

                    console.log('slidify.js:241  doAnimate()  finished!  currSlideNum: ' + currSlideNum);

                } // end of doAnimate()

                function toggleArrowPressed(e) {
                    if(e.type == 'mousedown') {
                        $(this).addClass('pressed');
                    }
                    else {
                        $(this).removeClass('pressed');
                    }
                }

                //  Called on
                //      1.  first slidify initialization
                //      2.  after a slide change is completed  (in doAnimate)
                //
                function setSlideNumbers(withCurrentSlideNumber) {

                    if(withCurrentSlideNumber)
                        currSlideNum = withCurrentSlideNumber;

                    if(!currSlideNum) {
                        currSlideNum = 1;
                        nextSlideNum = currSlideNum + 1;
                        prevSlideNum = LAST_SLIDE_NUMBER;
                    }
                    else if(currSlideNum == LAST_SLIDE_NUMBER) {
                        nextSlideNum = 1;
                        prevSlideNum = LAST_SLIDE_NUMBER - 1;
                    }
                    else {
                        nextSlideNum = currSlideNum + 1;
                        prevSlideNum = currSlideNum - 1;
                    }

                    console.log('slidify.js:256  setSlideNumbers()   prev: ' + prevSlideNum + '   curr: ' + currSlideNum + '   next: ' + nextSlideNum);

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

                function getWindowScroll() {
                    //copied from jquery-1.8.3.js:9266  
                    return window.pageYOffset || document.documentElement.scrollTop;
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
                    var animatingSlideChange = false;

                    var windowDidScroll = false;
                    var windowScrollInitial;

                    // because slider is a jQuery object
                    var sliderSlides = slider.find(opts.slides)[0];

                    if(!sliderSlides) {
                        console.log('slidify.js:257  doh! slidify needs a child ' + opts.slides + ' element to work!');
                        return;
                    }

                    sliderSlides.addEventListener('touchstart', function(e) {

                        console.log('----------------------------------------');

                        if(IS_TOUCH_SIMPLE && animatingSlideChange) {
                            console.log('slidify.js:279  touchstart   animatingSlideChange already, so dont start another');
                            return;
                        }

                        var start = e.targetTouches[0];

                        // reset everything
                        startX = start.pageX;
                        startY = start.pageY;
                        endX   = 0;
                        endY   = 0;
                        prevX  = 0;
                        prevY  = 0;
                        deltaX = 0;
                        deltaY = 0;

                        windowScrollInitial = getWindowScroll();

                        console.log('slidify.js:336  touchstart at ' + touchToString({ x: startX, y:startY }));

                        if(IS_TOUCH_SLIDES_WITH_FINGER) {
                            currSlide = slider.find(getSlideSelector(currSlideNum));
                            prevSlide = slider.find(getSlideSelector(prevSlideNum));
                            nextSlide = slider.find(getSlideSelector(nextSlideNum));

                            // position the next and previous slides 
                            // in preparation

                            prevSlide.css('left', '-' + SLIDE_WIDTH_PIXELS);
                            nextSlide.css('left', SLIDE_WIDTH_PIXELS);

//                             prevSlide.addClass('active');
//                             nextSlide.addClass('active');
                        }

                    }, false);


                    sliderSlides.addEventListener('touchmove', function(e) {

//                         console.log('slidify.js:302   touchmove');

                        endX = e.changedTouches[0].pageX;
                        endY = e.changedTouches[0].pageY;
                        prevX = prevX || endX;
                        prevY = prevY || endY;
                        deltaX = prevX - endX;
                        deltaY = prevY - endY;

                        if(deltaX === 0 && deltaY === 0) {
                            movedMoreVertically = true;
                        }
                        else {
                            movedMoreVertically = Math.abs(deltaY) > Math.abs(deltaX);
                        }

                        var windowScroll = getWindowScroll();


                        console.log('slidify.js:353  touchmove   deltaX: ' + deltaX + '   deltaY: ' + deltaY + '   diff: ' + (Math.abs(deltaY) - Math.abs(deltaX)) + '    windowScroll: ' + windowScroll);

                        var swipedLeft = deltaX > 0;


                        if(IS_TOUCH_SLIDES_WITH_FINGER) {

                            var shift = parseInt(currSlide.css('left'), 10) - deltaX;
                            currSlide.css('left', shift);

//                             console.log('slidify.js:370   currSlide.css("left"): ' + currSlide.css("left"));

                            /*
                            if(swipedLeft) {
                                // shift the current slide out to the left 
                                // and shift the next slide in from the left

                                var leftShift = parseInt(nextSlide.css('left'), 10) + deltaX;
                                nextSlide.css('left', leftShift);

                            }
                            else { 
                                var rightShift = parseInt(prevSlide.css('left'), 10) + deltaX;
                                prevSlide.css('left', rightShift);
                            }
                            */

                        }
                        else {
                            //if(IS_TOUCH_SIMPLE) {

//                             if(animatingSlideChange) {
//                                 console.log('slidify.js:309  touchmove   already animating slides, so dont start another');
//                                 return;
//                             }


                            if(movedMoreVertically || animatingSlideChange) {
                                // allow vertical panning to proceed as usual
                                var byNotPuttingPreventDefaultHere;
                            }
                            else {

//                                 console.log('slidify.js:331  touchmove   user appeared to slide across slides, so preventDefault  Math.abs(deltaY): ' + Math.abs(deltaY) + '   Math.abs(deltaX): ' + Math.abs(deltaX));

                                // user has appeared to slide across the slides,
                                // so DONT scroll the screen in the mobile browser 
                                // as it'll make .animate()'s callback not-seem-to-fire
                                e.preventDefault();
                            }

                        }

                        prevX = endX;
                        prevY = endY;

                    }, false);


                    sliderSlides.addEventListener('touchend', function(e) {

                        if(IS_TOUCH_SIMPLE && animatingSlideChange) {
                            console.log('slidify.js:333  touchend   animatingSlideChange slides, so dont start another');
                            return;
                        }

                        // calculate end state
                        var tapped = (endX === 0 && endY === 0);
                        var changeX = endX - startX;
                        var changeY = endY - startY;
                        var swipedToTheLeft = changeX < 0;

                        //   maybe shouldnt be here, as I copied it from touchmove
                        movedMoreVertically = Math.abs(changeX) < Math.abs(changeY);

                        // XXX  arg, if you pan to switch slides and it 
                        //      scrolls the screen, the callback for the 
                        //      currSlide.animate call  wont be called!!!1
                        //
//                         movedMoreVertically = movedMoreVertically || Math.abs(changeX -changeY) < 70;

                        console.log('slidify.js:326  touchend at ' + touchToString({ x:endX, y:endY }) + '  change: ' + touchToString({ x:changeX, y:changeY})
                        );

                        if(tapped) {
                            console.log('slidify.js:330  just did a tap, so not doin anythin');
                        }
                        else if(animatingSlideChange) {
                            console.log('slidify.js:333  changing slides, dont do anythin');
                        }
                        else {

                            if(IS_TOUCH_SLIDES_WITH_FINGER) {

                                // retract or complete a slide change 
                                // past a given threshold


                                var threshold = SLIDE_WIDTH / 3.0;
                                var thresholdShift;

                                if(Math.abs(changeX) > threshold) { 
                                    // then perform the full slide change
                                    thresholdShift = SLIDE_WIDTH_PIXELS;
                                }
                                else {
                                    // otherwise retract 
                                    thresholdShift = '0px';
                                }


                                console.log('slidify.js:453  check threshold    changeX: ' + changeX + '    SLIDE_WIDTH / 2.0: ' + SLIDE_WIDTH / 2.0 + '    thresholdShift: ' + thresholdShift + '    currSlide left: ' + currSlide.css('left'));

                                slider.find(getSlideSelector(currSlideNum)).animate( 
                                    { 'left': thresholdShift }, 
                                    {
                                        complete: function() {

                                            console.log('slidify.js:484  threshold retract!');
                                        }
                                    }
                                );
                            }
                            else {
                                // TOUCH_SIMPLE

                                // don't do anything if the user panned more vertically
                                // than horizontally, because that'll seem weird
                                //
                                if( movedMoreVertically || changeX === 0) {

                                    console.log('slidify.js:518  touchend   movedMoreVertically, so allow panning     Math.abs(changeX): ' + Math.abs(changeX) + '  <  Math.abs(changeY): ' + Math.abs(changeY)); 
                                }
                                else if(windowScrollInitial != getWindowScroll()) {

                                    // FIXME TODO XXX HACK -  it feels like 
                                    // there's gotta be a better solution 
                                    // for this hmm...

                                    console.log('slidify.js:527  touchend   window scrolled/panned, do not do animation as the jQuery animate callback won\'t fire for some weird reason...   initial: ' + windowScrollInitial + '    curr: ' + getWindowScroll());

                                }
                                else if(windowScrollInitial === 0 && changeY > changeX && changeY > 30) {

                                    // FIXME TODO

                                    console.log('slidify.js:539  touchend  hack fix for no jquery animate callback when the window scrolls whiling changing slides  ...at the very top of a page   changeY: ' + changeY +  '    changeX: ' + changeX );
                                }
                                else {
                                    // perform the swipe and slide change
                                    
                                    e.preventDefault();   // disable panning

                                    var direction;        // figure out where to go

                                    if(swipedToTheLeft) {
                                        console.log('slidify.js:361  touchend  swiped left');
                                        direction = RIGHT;
                                    }
                                    else {
                                        console.log('slidify.js:367  touchend  swiped right');
                                        direction = LEFT;
                                    }

                                    //  animate the slide change, and disable 
                                    //  additional swipes while the animation
                                    //  is still going
                                    //
                                    animatingSlideChange = true;

                                    doAnimate(direction, function() {
                                        animatingSlideChange = false;
                                    });
                                }
                            }
                        }

                    }, false);
                }


                function touchToString(t) {
                    return '( x:' + t.x + ', y:' + t.y + ' )';
                }


                function getSlideSelector(slideNum) {
                    return '.slide' + slideNum;
                }

            });
        }
    });

})( jQuery );
