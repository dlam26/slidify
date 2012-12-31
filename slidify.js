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
                'looped': true,            // whether or not moving next from the last slide goes to the first
                'touch': TOUCH_SIMPLE,
                'duration': 400,           // animate duration  http://api.jquery.com/animate/    400 is the default duration for jquery animate!
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
                var IS_TOUCH_NONE = opts.touch == TOUCH_NONE;
                var IS_TOUCH_SLIDES_WITH_FINGER = opts.touch == TOUCH_SLIDES_WITH_FINGER;

                // should be set to true somewhere if...
                //     1.  we're on the last slide and the right arrow is pressed
                //     2.  we're on the first slide and the left arrow is pressed
                var willLoopAround = false;

                var currSlideNum, slideOnLeftNum, slideOnRightNum;
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
                                    slideOnRightNum = LAST_SLIDE_NUMBER;
                                }
                                else {
                                    return;   // XXX  don't loop, so stop right away!
                                }
                            }
                            else {
                                slideOnRightNum = currSlideNum - 1;
                            }

                            // this moves the slides left
                            currSlideEnd['left']   = SLIDE_WIDTH_PIXELS;
                            nextSlideStart['left'] = '-' + SLIDE_WIDTH_PIXELS;

                            break;

                        case RIGHT:

                            if(currSlideNum  >= LAST_SLIDE_NUMBER) {
                                console.log('slidify.js:121  at end of slides!   currSlideNum: ' + currSlideNum + '   LAST_SLIDE_NUMBER: ' + LAST_SLIDE_NUMBER);

                                if(opts.looped) {
                                    slideOnRightNum = FIRST_SLIDE_NUMBER;
                                }
                                else {
                                    return;  // XXX
                                }
                            }
                            else {
                                slideOnRightNum = currSlideNum + 1;
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
                    var selectorNext = getSlideSelector(slideOnRightNum);
                    var currSlide  = slider.find(selectorCurrent);
                    var slideOnRight  = slider.find(selectorNext);


                    console.log('slidify.js:152  doAnimate() ' + direction + '   selectorCurrent: ' + selectorCurrent + '   selectorNext: ' + selectorNext + '    currSlideEnd.left: ' + currSlideEnd.left + '    nextSlideEnd.left: ' + nextSlideEnd.left + '   LAST_SLIDE_NUMBER: ' + LAST_SLIDE_NUMBER + '   currSlideNum: ' + currSlideNum + '   slideOnRightNum: ' + slideOnRightNum + '   currSlide.size(): ' + currSlide.size() + '   slideOnRight.size(): ' + slideOnRight.size());


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

                    slideOnRight.addClass(ACTIVE).css(nextSlideStart).animate(nextSlideEnd, {
                        duration: opts.duration,
                        complete: function() {

                            // FIXME if you start the animation and then sorta scroll
                            //       the page such that the slider goes off the screen,
                            //       these (important) callbacks might not run!

                            console.log('slidify.js:220  doAnimate()  slideOnRight.animate callback!  cleaning up slider state...');

                            // ...because we disable it at the top of doAnimate
                            // to prevent next/prev click spam
                            enableSlidePageControlButtons();

                            opts.sliderChangedCallback(currSlideNum, slideOnRightNum);

                            doAnimateCallback();
                        }
                    });

                    // finally, the orange page control / bullet things
                    // should reflect the current slide we're on....!
                    var pageControls = slider.find(opts.pagecontrol + ' .control');
                    pageControls.removeClass('on').eq(slideOnRightNum - 1).addClass('on');

                    setSlideNumbers(slideOnRightNum);

                    console.log('slidify.js:241  doAnimate()  finished!  currSlideNum: ' + currSlideNum);

                } // end of doAnimate()


                //  Called on
                //      1.  first slidify initialization
                //      2.  after a slide change is completed  (in doAnimate)
                //
                function setSlideNumbers(withNewCurrentSlideNumber) {

                    if(withNewCurrentSlideNumber)
                        currSlideNum = withNewCurrentSlideNumber;

                    if(!currSlideNum) {
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
                    });

                    slider.find(opts.right).click(function() {
                        console.log('slidify.js:212  Clicked right');
                        doAnimate(RIGHT);
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
                    var startX, startY, endX, endY, prevX, prevY, deltaX, deltaY;
                    var movedMoreVertically = true;
                    var startedMovingHorizontaly;
                    var animatingSlideChange;
                    var windowScrollStart, windowScrollEnd;

                    // [0] because slider is a jQuery object
                    //      XXX FIXME  what if no slides???
                    var sliderSlides = slider.find(opts.slides)[0];

                    if(!sliderSlides) {
                        console.log('slidify.js:257  doh! slidify needs a child ' + opts.slides + ' element to work!');
                        return;
                    }

                    if(!IS_TOUCH_NONE) {

                        sliderSlides.addEventListener('touchstart', function(e) {

                            console.log('----------------------------------------');

                            if(IS_TOUCH_SIMPLE && animatingSlideChange) {
                                console.log('slidify.js:279  touchstart   animatingSlideChange already, so dont start another');
                                return;
                            }

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
                            startedMovingHorizontaly = false;
                            animatingSlideChange = false;

                            console.log('slidify.js:336  touchstart  at ' + touchToString({ x: startX, y:startY }) + '  currSlideNum: ' + currSlideNum);

                            if(IS_TOUCH_SLIDES_WITH_FINGER) {
                                currSlide = slider.find(getSlideSelector(currSlideNum));
                                slideOnLeft = slider.find(getSlideSelector(slideOnLeftNum));
                                slideOnRight = slider.find(getSlideSelector(slideOnRightNum));

                                // position the next and previous slides
                                // "offscreen" to the left and right of the
                                // current one in preperation of the animation
                                //
                                slideOnLeft.css('left', '-' + SLIDE_WIDTH_PIXELS);
                                slideOnRight.css('left', SLIDE_WIDTH_PIXELS);
                                slideOnLeft.addClass('active');
                                slideOnRight.addClass('active');

                                // console.log('slidify.js:371  touchstart  slideOnRight left: ' + slideOnRight.css('left') + '  slideOnLeft left: ' + slideOnLeft.css('left') + '   SLIDE_WIDTH_PIXELS: ' + SLIDE_WIDTH_PIXELS + '   slideOnRight selector: ' + getSlideSelector(slideOnRightNum) );
                            }

                        }, false);


                        sliderSlides.addEventListener('touchmove', function(e) {

                            endX = e.changedTouches[0].pageX;
                            endY = e.changedTouches[0].pageY;
                            prevX = prevX || endX;
                            prevY = prevY || endY;
                            deltaX = prevX - endX;
                            deltaY = prevY - endY;

                            if(deltaX === 0 && deltaY === 0) {
                                movedMoreVertically = true;         // XXX really?
                            }
                            else {
                                if(Math.abs(deltaY) > Math.abs(deltaX)) {
                                    movedMoreVertically = true;

                                }
                                else {
                                    startedMovingHorizontaly = true;
                                    movedMoreVertically = false;
                                }
                            }

                            // console.log('slidify.js:409  touchmove   deltaX: ' + deltaX + '  deltaY: ' + deltaY);


                            if(startedMovingHorizontaly && Math.abs(deltaY) > 0) {
                                console.log('slidify.js:397  touchmove   panned vertically,  but already moved horizontally, so preventing vertical panning altogether');
                                e.preventDefault();
                            }

                            var swipedLeft = deltaX > 0;

                            if(IS_TOUCH_SLIDES_WITH_FINGER) {

                                // FIXME   do these parseInt's handle NaN's right???

                                // this shifts the CURRENT slide with the finger
                                var left = parseInt(currSlide.css('left'), 10) || 0;
                                currSlide.css('left', left - deltaX);

                                left = parseInt(slideOnRight.css('left'), 10) || SLIDE_WIDTH;
                                slideOnRight.css('left', left - deltaX);

                                left = parseInt(slideOnLeft.css('left'), 10) || SLIDE_WIDTH;
                                slideOnLeft.css('left', left - deltaX);
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
                            var changeXabs = Math.abs(changeX);
                            var changeYabs = Math.abs(changeY);
                            var swipedToTheLeft = changeX < 0;

                            windowScrollEnd = getWindowScroll();
                            var totalScrollAmount = Math.abs(windowScrollEnd - windowScrollStart);

                            currSlide = slider.find(getSlideSelector(currSlideNum));

                            //   maybe shouldnt be here, as I copied it from touchmove
                            movedMoreVertically = changeXabs < changeYabs;

                            console.log('slidify.js:326  touchend at ' + touchToString({ x:endX, y:endY }) + '  change: ' + touchToString({ x:changeX, y:changeY}) + '  window scroll amount? ' + totalScrollAmount);


                            if(tapped) {
                                console.log('slidify.js:330  just did a tap, so not doin anythin');
                            }
                            else if(animatingSlideChange) {
                                console.log('slidify.js:333  animatingSlideChange already, so dont do anythin');
                            }
                            else {

                                if(IS_TOUCH_SLIDES_WITH_FINGER) {

                                    // retract or complete a slide change
                                    // past a given threshold

                                    var THRESHOLD = Math.floor(SLIDE_WIDTH / 3.0);

                                    var shift, shiftNext;

                                    if(swipedToTheLeft) {
                                        shift = '-' + SLIDE_WIDTH_PIXELS;
                                        nextSlide = slideOnRight;
                                    }
                                    else {
                                        shift = SLIDE_WIDTH_PIXELS;
                                        nextSlide = slideOnLeft;
                                    }


                                    console.log('slidify.js:500  touchend  checking threshold    changeX: ' + changeX + '    SLIDE_WIDTH / 2.0: ' + SLIDE_WIDTH / 2.0 + '    shift: ' + shift + '    currSlide left: ' + currSlide.css('left') + '   scroll: ' + getWindowScroll());

                                    // if we haven't passed the threshold, so retract!
                                    if(changeXabs <= THRESHOLD) {

                                        console.log('slidify.js:505  ' + changeXabs + ' was below threshold of ' + THRESHOLD + ', so RETRACTING...');

                                        shift = '0px';

                                        if(swipedToTheLeft) {   // e.g. went right
                                            shiftNext = SLIDE_WIDTH_PIXELS;
                                        }
                                        else {
                                            shiftNext = '-' + SLIDE_WIDTH_PIXELS;
                                        }
                                    }
                                    else {
                                        console.log('slidify.js:508  ' + changeXabs + ' WAS ABOVE the threshold of ' + THRESHOLD + ', so doing slide change!');

                                        shiftNext = '0px';

                                        if(swipedToTheLeft) {
                                            setSlideNumbers(slideOnRightNum);
                                        }
                                        else {
                                            setSlideNumbers(slideOnLeftNum);
                                        }
                                    }

                                    animatingSlideChange = true;

                                    // finish up the slide change here
                                    //
                                    currSlide.animate({ 'left': shift }, {
                                        duration: opts.duration,
                                        complete: function() {
                                            console.log('slidify.js:484  currSlide complete!');
                                        }
                                    });

                                    nextSlide.animate({ 'left': shiftNext }, {
                                        duration: opts.duration,
                                        complete: function() {
                                            console.log('slidify.js:524  nextSlide complete!');
                                            animatingSlideChange = false;

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
