//
//   slidify.js
//
//
// (thanks to Graham King a.k.a darkcoding who basically wrote the original code which I repackaged into a plugin!)


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

                   The active page/dot is set with an additional 'on' class

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
                'looped': true,            // whether or not moving next from the last slide goes to the first
                'touch': TOUCH_SIMPLE,
                'duration': 400,           // animate duration  http://api.jquery.com/animate/    400 is the default duration for jquery animate!
                'sliderChangedCallback': function(currSlideNumber, newSlideNumber) {}  // called when the left/right arrow buttons are clicked
            }, options);

            return this.each(function(index, value) {

//                 console.log('slidify.js:64  initiating slidified slider #' + index + ' with touch style, ' + opts.touch);

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
                var IS_TOUCH_NONE = opts.touch == TOUCH_NONE;
                var IS_TOUCH_SLIDES_WITH_FINGER = opts.touch == TOUCH_SLIDES_WITH_FINGER;

                //should be set to true somewhere if...
                //  1. we're on the last slide and the right arrow is pressed
                //  2. we're on the first slide and the left arrow is pressed
                var willLoopAround = false;

                var currSlideNum, nextSlideNum;
                var slideOnLeftNum, slideOnRightNum;
                var currSlide, nextSlide, slideOnLeft, slideOnRight;

                enableSlidePageControlButtons();
                makeSwipable();
                setSlideNumbers();


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
                                    return;   // XXX  don't loop, so stop right away!
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
                                    return;  // XXX
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
                        duration: opts.duration,
                        complete: function() {

                            console.log('slidify.js:203  doAnimate()  currSlide.animate callback!  REMOVING ACTIVE CLASS  -> ' + $(this).attr('class'));

                            // since removing the ACTIVE class will make it disappear,
                            // remove it *after* its slid out
                            $(this).removeClass(ACTIVE);
                            $(this).removeAttr('style');
                        }
                    });

                    nextSlide.addClass(ACTIVE).css(nextSlideStart).animate(nextSlideEnd, {
                        duration: opts.duration,
                        complete: function() {

                            // FIXME if you start the animation and then sorta scroll
                            //       the page such that the slider goes off the screen,
                            //       these (important) callbacks might not run!

                            console.log('slidify.js:220  doAnimate()  nextSlide.animate callback!  cleaning up slider state...');

                            // ...because we disable it at the top of doAnimate
                            // to prevent next/prev click spam
                            enableSlidePageControlButtons();

                            opts.sliderChangedCallback(currSlideNum, nextSlideNum);

                            doAnimateCallback();
                        }
                    });


                    setSlideNumbers(nextSlideNum);

                    console.log('slidify.js:241  doAnimate()  finished!  currSlideNum: ' + currSlideNum);

                } // end of doAnimate()


                //  Called on
                //      1.  first slidify initialization
                //      2.  after a slide change is completed  (in doAnimate)
                //
                function setSlideNumbers(withNewCurrentSlideNumber) {

                    if(withNewCurrentSlideNumber)
                        currSlideNum = withNewCurrentSlideNumber;

                    if(!currSlideNum || currSlideNum == FIRST_SLIDE_NUMBER) {
                        currSlideNum = 1;
                        slideOnRightNum = currSlideNum + 1;
                        slideOnLeftNum = LAST_SLIDE_NUMBER;
                    }
                    else if(currSlideNum == LAST_SLIDE_NUMBER) {
                        slideOnRightNum = 1;
                        slideOnLeftNum = LAST_SLIDE_NUMBER - 1;
                    }
                    else {
                        slideOnRightNum = currSlideNum + 1;
                        slideOnLeftNum = currSlideNum - 1;
                    }

                    console.log('slidify.js:256  setSlideNumbers()   left: ' + slideOnLeftNum + '   curr: ' + currSlideNum + '   right: ' + slideOnRightNum);

                }

                function updatePageControl() {
                    console.log('slidify.js;264  updatePageControl()  ' + (currSlideNum - 1));
                    var pageControls = slider.find(opts.pagecontrol + ' .control');
                    pageControls.removeClass('on').eq(currSlideNum - 1).addClass('on');
                }

                function toggleArrowPressed(e) {
                    if(e.type == 'mousedown') {
                        $(this).addClass('pressed');
                    }
                    else {
                        $(this).removeClass('pressed');
                    }
                }

                function enableSlidePageControlButtons() {

                    slider.find(opts.left).click(function() {
                        console.log('slidify.js:208  Clicked left');
                        doAnimate(LEFT);
                        updatePageControl();
                    });

                    slider.find(opts.right).click(function() {
                        console.log('slidify.js:212  Clicked right');
                        doAnimate(RIGHT);
                        updatePageControl();
                    });

                    // clicking on a arrow buttons should show a i-am-pressed state
                    slider.find([opts.left, opts.right].join(',')).bind('mousedown mouseup mouseout', toggleArrowPressed);
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
                         Binds touch events to support finger swipe/panning
                         on the carousel.  This function uses a bunch of
                         global 'state' variables which are set at the first


                         e.g. http://developer.apple.com/library/ios/#documentation/AppleApplications/Reference/SafariWebContent/HandlingEvents/HandlingEvents.html

                         event.preventDefault() here will prevent the slider
                         and or default browser panning action from doing
                         anything at all  (so you probably dont want this)
                    */

                    // state variables
                    var startX, startY, endX, endY, prevX, prevY;
                    var changeX, changeY, changeXabs, changeYabs;

                    var windowScrollStart, windowScrollEnd;
                    var startedPanningHorizontaly;

                    // true when the user has started a slide transition
                    // and still has their finger on the device surface
                    var animatingSlideChange;

                    // true when the user has begun a slide transition past
                    // the THRESHOLD, and has released their finger
                    var completingSlideChange;

                    var usedOneFinger;

                    // [0] because slider is a jQuery object
                    //      XXX FIXME  what if no slides???
                    var sliderSlides = slider.find(opts.slides)[0];

                    if(!sliderSlides) {
                        console.log('slidify.js:257  doh! slidify needs a child ' + opts.slides + ' element to work!');
                        return;
                    }

                    if(!IS_TOUCH_NONE) {

                        sliderSlides.addEventListener('touchstart', function(e) {

                            console.log('------------------------------------');

                            // setup initial state
                            startX = e.targetTouches[0].pageX;
                            startY = e.targetTouches[0].pageY;
                            endX   = 0;
                            endY   = 0;
                            prevX  = 0;
                            prevY  = 0;
                            deltaX = 0;
                            deltaY = 0;
                            windowScrollStart = getWindowScroll();
                            startedPanningHorizontaly = undefined;
                            usedOneFinger = e.touches.length == 1;


                            // http://uihacker.blogspot.tw/2011/01/android-touchmove-event-bug.html
                            // http://code.google.com/p/android/issues/detail?id=5491
                            if( navigator.userAgent.match(/Android/i) ) {
                              e.preventDefault();
                            }

                            if(animatingSlideChange) {
                                console.log('slidify.js:279  touchstart   animatingSlideChange already, so dont start another');
                                return;
                            }

                            console.log('slidify.js:336  touchstart  at ' + touchToString({ x: startX, y:startY }) + '  currSlideNum: ' + currSlideNum + '  windowScrollStart: ' + windowScrollStart + '   usedOneFinger: ' + usedOneFinger + '   animatingSlideChange: ' + animatingSlideChange);

                            if(IS_TOUCH_SLIDES_WITH_FINGER) {
                                animatingSlideChange = true;

                                currSlide = slider.find(getSlideSelector(currSlideNum));
                                slideOnLeft = slider.find(getSlideSelector(slideOnLeftNum));
                                slideOnRight = slider.find(getSlideSelector(slideOnRightNum));

                                // position the next and previous slides
                                // "offscreen" to the left and right of the
                                // current one in preperation of the animation
                                //
                                slideOnLeft.css('left', '-' + SLIDE_WIDTH_PIXELS);
                                slideOnRight.css('left', SLIDE_WIDTH_PIXELS);
                                slideOnLeft.addClass(ACTIVE);
                                slideOnRight.addClass(ACTIVE);

                                // console.log('slidify.js:371  touchstart  slideOnRight left: ' + slideOnRight.css('left') + '  slideOnLeft left: ' + slideOnLeft.css('left') + '   SLIDE_WIDTH_PIXELS: ' + SLIDE_WIDTH_PIXELS + '   slideOnRight selector: ' + getSlideSelector(slideOnRightNum) );
                            }
                            else {
                                animatingSlideChange = false;
                            }

                        }, false);


                        sliderSlides.addEventListener('touchmove', function(e) {

                            if(!usedOneFinger)
                                return;


                            if(IS_TOUCH_SLIDES_WITH_FINGER) {
                                if(e.touches.length > 1)
                                    return;
                            }

                            if(completingSlideChange) {
                                console.log('slidify.js:406  touchmove  completing slide change, do not start another!!!1');
                                return;
                            }

                            endX = e.changedTouches[0].pageX;
                            endY = e.changedTouches[0].pageY;
                            prevX = prevX || endX;
                            prevY = prevY || endY;

                            changeX = endX - startX;
                            changeY = endY - startY;
                            changeXabs = Math.abs(changeX);
                            changeYabs = Math.abs(changeY);

                            var deltaX = prevX - endX;
                            var deltaY = prevY - endY;

                            // 1/2/13   ensure slide transition even
                            //          when zoomed in...
                            if(changeXabs > changeYabs) {
                                e.preventDefault();
                            }

                            if(deltaX === 0 && deltaY === 0) {
                                var tappedSoDontDoAnything;
                            }
                            else {
                                if(startedPanningHorizontaly === undefined) {
                                    if(Math.abs(deltaY) > Math.abs(deltaX)) {
                                        startedPanningHorizontaly = false;
                                    }
                                    else {
                                        startedPanningHorizontaly = true;
                                    }
                                }
                            }

//                             console.log('slidify.js:409  touchmove   deltaX: ' + deltaX + '  deltaY: ' + deltaY + '  startedPanningHorizontaly: ' + startedPanningHorizontaly);

                            if(startedPanningHorizontaly === true &&
                                    Math.abs(deltaY) > 0) {

//                                 console.log('slidify.js:397  touchmove   panned vertically,  but already moved horizontally, so preventing vertical panning altogether');
                                e.preventDefault();
                            }

                            var swipedLeft = deltaX > 0;

                            if(IS_TOUCH_SLIDES_WITH_FINGER) {

                                // Important!  If the page is being
                                // panned/scrolled iOS will queue up any
                                // changes to the DOM, and performs them after
                                // the pan/scroll is done!
                                //
                                // So to stop this UI weirdness, don't shift
                                // the slides if the pan started vertically
                                //
                                if(startedPanningHorizontaly === true) {

                                    // this shifts the current and adjacent slides
                                    // with the finger...!
                                    //
                                    // XXX will this handle parseInt's NaN's right???
                                    //
                                    var left = parseInt(currSlide.css('left'), 10) || 0;
                                    currSlide.css('left', left - deltaX);

                                    left = parseInt(slideOnRight.css('left'), 10) || SLIDE_WIDTH;
                                    slideOnRight.css('left', left - deltaX);

                                    left = parseInt(slideOnLeft.css('left'), 10) || SLIDE_WIDTH;
                                    slideOnLeft.css('left', left - deltaX);
                                }
                            }

                            prevX = endX;
                            prevY = endY;

                        }, false);


                        sliderSlides.addEventListener('touchend', function(e) {

                            var removedAllFingers = e.touches.length === 0;

                            console.log('slidify.js:478  touchend   entered  e.touches.length: ' + e.touches.length + '   e.targetTouches.length: ' + e.targetTouches.length +  '  animatingSlideChange: ' + animatingSlideChange + '  removedAllFingers: ' + removedAllFingers);

                            // there are situations in which we do not
                            // want to perform the animations which
                            // are done on touchend... we handle them here

                            if(IS_TOUCH_SIMPLE && animatingSlideChange) {
                                console.log('slidify.js:490  touchend   animatingSlideChange slides, so dont do animations');
                                return;
                            }

                            if(!removedAllFingers) {
                                console.log('slidify.js:495  touchend  didnt remove all fingers, so dont do more animations');
                                return;
                            }

                            if(!usedOneFinger) {
                                console.log('slidify.js:500  touchend  used more than one finger, do not do anything!');
                                return;
                            }

                            if(completingSlideChange) {
                                console.log('slidify.js:509  touchend  completing slide change, do not start another!!!1');
                                return;
                            }

                            // calculate end state
                            changeX = endX - startX;
                            changeY = endY - startY;
                            changeXabs = Math.abs(changeX);
                            changeYabs = Math.abs(changeY);
                            var tapped = (endX === 0 && endY === 0);
                            var swipedToTheLeft = changeX < 0;

                            windowScrollEnd = getWindowScroll();
                            var totalScrollAmount = Math.abs(windowScrollEnd - windowScrollStart);

                            currSlide = slider.find(getSlideSelector(currSlideNum));

                            //   maybe shouldnt be here, as I copied it from touchmove
                            var movedMoreVertically = changeXabs < changeYabs;

                            console.log('slidify.js:543  touchend  at ' + touchToString({ x:endX, y:endY }) + '  change: ' + touchToString({ x:changeX, y:changeY}) + '  totalScrollAmount? ' + totalScrollAmount + '  windowScrollEnd: ' + windowScrollEnd + '  startedPanningHorizontaly: ' + startedPanningHorizontaly + '  e.touches.length: ' +  e.touches.length );


                            if(tapped) {
                                console.log('slidify.js:547  touchend  just did a tap, so not doin anythin');

                                // XXX IMPORTANT!  We still need to clean up
                                //     state still ...probably should turn this
                                //     stuff into a cleanupState() function or
                                //     something

                                animatingSlideChange = false;

                                if(IS_TOUCH_SLIDES_WITH_FINGER) {
                                    slideOnLeft.css('left', '');
                                    slideOnRight.css('left', '');
                                    slideOnLeft.removeClass(ACTIVE);
                                    slideOnRight.removeClass(ACTIVE);
                                }

                                return;
                            }
                            else {

                                if(IS_TOUCH_SLIDES_WITH_FINGER) {
                                    // retract or complete a slide change
                                    // past a given distance threshold
                                    // (currently 1/5 of the slide width)

                                    var THRESHOLD = Math.floor(SLIDE_WIDTH / 5.0);

                                    // shift is used to animate the current
                                    // slide, whereas shiftNext is used to
                                    // animate the *incoming* one
                                    var shift, shiftNext;

                                    if(swipedToTheLeft) {
                                        shift = '-' + SLIDE_WIDTH_PIXELS;
                                        nextSlide = slideOnRight;
                                    }
                                    else {
                                        shift = SLIDE_WIDTH_PIXELS;
                                        nextSlide = slideOnLeft;
                                    }

//                                     console.log('slidify.js:500  touchend  checking threshold    changeX: ' + changeX + '    SLIDE_WIDTH / 2.0: ' + SLIDE_WIDTH / 2.0 + '    shift: ' + shift + '    currSlide left: ' + currSlide.css('left') + '   windowScrollEnd: ' + windowScrollEnd);

                                    if(changeXabs <= THRESHOLD) {

                                        // we haven't passed the threshold
                                        // ...so retract!

//                                         console.log('slidify.js:505  touchend  ' + changeXabs + ' was below threshold of ' + THRESHOLD + ', so RETRACTING...');

                                        shift = '0px';

                                        if(swipedToTheLeft) {   // e.g. went right
                                            shiftNext = SLIDE_WIDTH_PIXELS;
                                        }
                                        else {
                                            shiftNext = '-' + SLIDE_WIDTH_PIXELS;
                                        }
                                    }
                                    else {
//                                         console.log('slidify.js:508  ' + changeXabs + ' WAS ABOVE the threshold of ' + THRESHOLD + ', so doing slide change!');

                                        shiftNext = '0px';

                                        if(swipedToTheLeft) {
                                            setSlideNumbers(slideOnRightNum);
                                        }
                                        else {
                                            setSlideNumbers(slideOnLeftNum);
                                        }
                                    }

                                    completingSlideChange = true;

                                    // finish up the slide change here
                                    //
                                    currSlide.animate({ 'left': shift }, {
                                        duration: opts.duration,
                                        complete: function() {
                                            console.log('slidify.js:484  currSlide complete!');

                                            var retracted = shift == '0px';

                                            if(!retracted) {
                                                if(swipedToTheLeft)
                                                    slideOnLeft.removeClass(ACTIVE);
                                                else
                                                    slideOnRight.removeClass(ACTIVE);

                                                $(this).removeClass(ACTIVE);
                                            }
                                            else {
                                                slideOnLeft.removeClass(ACTIVE);
                                                slideOnRight.removeClass(ACTIVE);
                                            }
                                        }
                                    });

                                    nextSlide.animate({ 'left': shiftNext }, {
                                        duration: opts.duration,
                                        complete: function() {
                                            console.log('slidify.js:524  nextSlide complete!');
                                            animatingSlideChange = false;
                                            completingSlideChange = false;

                                        }
                                    });

                                }
                                else {
                                    // TOUCH_SIMPLE
                                    // perform the swipe and slide change

                                    if(!movedMoreVertically && totalScrollAmount === 0) {

                                        e.preventDefault();   // disable panning

                                        var direction;        // figure out where to go

                                        if(swipedToTheLeft) {
//                                             console.log('slidify.js:646  touchend  swiped left');
                                            direction = RIGHT;
                                        }
                                        else {
//                                             console.log('slidify.js:650  touchend  swiped right');
                                            direction = LEFT;
                                        }

                                        // animate the slide change, and disable
                                        // additional swipes while the animation
                                        // is still going
                                        //
                                        animatingSlideChange = true;

                                        doAnimate(direction, function() {
                                            animatingSlideChange = false;
                                        });

                                    }
                                }

                                updatePageControl();
                            }

                        }, false);

                    } //   if(!IS_TOUCH_NONE) {


                } // makeSwipable() end


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
