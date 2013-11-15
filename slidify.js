//
//   slidify.js
//
//   Simple implementation of a carousel/slider.
//
//   Much thanks to Graham King a.k.a darkcoding who basically wrote the
//   original code which I repackaged into a plugin!
//
//   The 'responsive slider' is literally, completely, ripped off from bustle.com!
//   It is the bestest carousel/slider!  <3 <3 <3
//
//
//   TODO  11/12/13  there's multiple times in which the 
//                   entire length of the slider is calculated
//                   and put into a variable:  just do this once
//
//   TODO  11/12/13  the slide stuff is 1-indexed, which is confusing
//
//   TODO  11/13/13  use jquery negative indexing to get to the end!  e.g. foo.eq(-1)
//
//   TODO  though the number of 'page control' things should correspond to 
//         the number of slides
//
//   TODO  11/15/13  defensive program when theres under 4 slides for the 
//         responsive slider  (it needs a minimum of 4!)

//
// NOTE:  doing event.preventDefault can disable the default browser behavior
//        of being able to pan around the page and pinch-to-zoom
//

var DEBUG_SLIDIFY = true;
var DEBUG_LOG_SEPARATOR = '==-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=--==-';

var timesSlidifyRun = 0;

debugSlidify = DEBUG_SLIDIFY ? function(line, msg) { console.log('slidify.js:' + (arguments[1] || '') + '   ' + arguments[0]); } : function(x) {};

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

            var GOING_AHEAD = 'going-ahead';
            var GOING_IN_REVERSE = 'going-in-reverse';

            // touch/finger swipe options
            var TOUCH_SIMPLE = 'simple';
            var TOUCH_NONE = 'none';
            var TOUCH_SLIDES_WITH_FINGER = 'slides-with-finger';

            // Create some defaults, extending them with any options that were provided
            var opts = $.extend( {
                'slide': '.slide',         // selector for each slide
                'slides': '.slides',       // selector for the container *holding* slides
                'left':  '.slide_left',    // selector for the left arrow button
                'right': '.slide_right',   // selector for the right arrow button
                'pagecontrol': '.page_control',   // selector for the page control
                'looped': true,            // whether or not moving next from the last slide goes to the first
                'touch': TOUCH_SIMPLE,
                'duration': 400,           // animate duration, (400 is the default duration for jquery animate)
                
                // callback for when the left/right arrow buttons are clicked
                // 'currSlide' and 'nextSlide' are the respective DOM nodes
                'sliderChangedCallback': function(currSlide, nextSlide) {}  

            }, options);

            return this.each(function(index, value) {

                var slider = $(this);  // holds the container for the slider
                var sliderSlides = slider.find(opts.slides);

                //  3/24/13  for supporting designs in which 
                //  "non-active" slides can be 'partial'lly visible to the user
                var isPartial = slider.hasClass('partial');

                //  11/13/13 
                var isResponsive = slider.hasClass('responsive');

                if(isResponsive) {  // XXX  if a billion slides, this will die 
                    var slideList = sliderSlides.find('.slide');
                    slideList.eq(0).addClass('at-bat');
                    slideList.eq(1).addClass('on-deck');
                    slideList.eq(2).addClass('in-the-hole');
                    slideList.eq(-1).addClass('last-up');

                    debugSlidify('   \'at-bat\' at cursor 0', 98);
                    debugSlidify('   \'on-deck\' at cursor 1', 99);
                    debugSlidify('  \'in-the-hole\' at cursor 2', 100);
                    debugSlidify('  \'last-up\' at cursor 3', 101);
                    debugSlidify(DEBUG_LOG_SEPARATOR, 102);
                }
                else {
                    // the very first slide should be "active", so indicate that
                    slider.find(opts.slide + ':first').addClass(ACTIVE);
                }

                // set the width of an actual slide, defaulting
                // to 970 pixels if we can't find any!
                SLIDE_WIDTH = slider.find(opts.slide).width() || 970;

                // same as slideWidth, but as a string that can be
                // passed to set a CSS `width:` attribute
                SLIDE_WIDTH_PIXELS = [SLIDE_WIDTH, 'px'].join('');

                // constants
                var FIRST_SLIDE_NUMBER = 1;
                var LAST_SLIDE_NUMBER = slider.find(opts.slide).size(); //XXX
                var LEFT  = 'left';
                var RIGHT = 'right';
                var IS_TOUCH_SIMPLE = opts.touch == TOUCH_SIMPLE;
                var IS_TOUCH_NONE = opts.touch == TOUCH_NONE;
                var IS_TOUCH_SLIDES_WITH_FINGER =
                    opts.touch == TOUCH_SLIDES_WITH_FINGER;

                //should be set to true somewhere if...
                //  1. we're on the last slide and the right arrow is pressed
                //  2. we're on the first slide and the left arrow is pressed
                var willLoopAround = false;

                // state variables set in setSliderState()
                var currSlideNum, nextSlideNum;
                var slideOnLeftNum, slideOnRightNum;
                var currSlide, nextSlide, slideOnLeft, slideOnRight;

                enableSlidePageControlButtons();
                setSliderState();
                makeSwipable();

                function doAnimate(direction, doAnimateCallback) {//{{{

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

                    //  now set up the slide/carousel animation based on the
                    //  direction we want to go -->

                    // we always want the "next" slide to be the current
                    nextSlideEnd.left = "0px";

                    switch(direction) {
                        case LEFT:
                            if(currSlideNum <= FIRST_SLIDE_NUMBER) {

                                debugSlidify('slidify.js:120  at start of slides!  currSlideNum: ' + currSlideNum + '   FIRST_SLIDE_NUMBER: ' + FIRST_SLIDE_NUMBER);

                                if(opts.looped) {
                                    nextSlideNum = LAST_SLIDE_NUMBER;
                                }
                                else {
                                    // XXX  don't loop, so stop right away!
                                    return;
                                }
                            }
                            else {
                                nextSlideNum = currSlideNum - 1;
                            }

                            // this moves the slides left
                            currSlideEnd.left   = SLIDE_WIDTH_PIXELS;
                            nextSlideStart.left = '-' + SLIDE_WIDTH_PIXELS;
                            break;

                        case RIGHT:
                            if(currSlideNum  >= LAST_SLIDE_NUMBER) {
                                debugSlidify('slidify.js:121  at end of slides!   currSlideNum: ' + currSlideNum + '   LAST_SLIDE_NUMBER: ' + LAST_SLIDE_NUMBER);

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
                            currSlideEnd.left   = '-' + SLIDE_WIDTH_PIXELS;
                            nextSlideStart.left = SLIDE_WIDTH_PIXELS;
                            break;

                        default:
                            debugSlidify('slidify.js:151  doAnimate() wtf, shouldnt get to default block!');
                            return;
                    }


                    // build the class selector for the next slide
                    var selectorCurrent = getSlideSelector(currSlideNum);
                    var selectorNext = getSlideSelector(nextSlideNum);
                    var currSlide  = slider.find(selectorCurrent);
                    var nextSlide  = slider.find(selectorNext);


                    debugSlidify('slidify.js:152  doAnimate() ' + direction + '   selectorCurrent: ' + selectorCurrent + '   selectorNext: ' + selectorNext + '    currSlideEnd.left: ' + currSlideEnd.left + '    nextSlideEnd.left: ' + nextSlideEnd.left + '   LAST_SLIDE_NUMBER: ' + LAST_SLIDE_NUMBER + '   currSlideNum: ' + currSlideNum + '   nextSlideNum: ' + nextSlideNum);

                    if(isPartial) {

                        //  3/28/13  Chrome here can return "auto" for the .css('left') call!   http://stackoverflow.com/questions/4278148/jquery-cssleft-returns-auto-instead-of-actual-value-in-chrome
                        //
                        var cssLeft =
                            parseInt(sliderSlides.css('left'), 10) || 0;
                        var newCssLeft;
                        var firstSlide = slider.find(opts.slide + ':first');
                        var lastSlide = slider.find(opts.slide + ':last');

                        if(direction == LEFT) {
                            newCssLeft = cssLeft + SLIDE_WIDTH;

                            if(currSlide.prev(opts.slide).size() === 0) {
                                // we need to rotate the last slide to be
                                // situated "in front" of the first, so that
                                // it appears to be circling around

                                debugSlidify('slidify.js:199  ROTATE last slide to the front!');
                                lastSlide.css('position', 'absolute')
                                    .css('left', -SLIDE_WIDTH)
                                    .insertBefore(firstSlide);
                            }
                        }
                        else {
                            newCssLeft = cssLeft - SLIDE_WIDTH;

                            if(nextSlide.next(opts.slide).size() === 0) {
                                debugSlidify('slidify.js:206  ROTATE first slide to the end!');

                                firstSlide.css('position', 'absolute')
                                    .css('left', SLIDE_WIDTH)
                                    .insertAfter(lastSlide);
                            }
                        }


                        debugSlidify('slidify.js:228  doAnimate()   class: ' + sliderSlides.attr('class') + '   style: ' + sliderSlides.attr('style') + '   newCssLeft: ' + newCssLeft + '   cssLeft: ' + cssLeft );

                        sliderSlides.animate({ left: newCssLeft }, {
                            duration: opts.duration,
                            queue: false,
                            easing: 'swing',
                            complete: function() {
                                enableSlidePageControlButtons();
                                currSlide.removeClass(ACTIVE);
                                nextSlide.addClass(ACTIVE);

                                opts.sliderChangedCallback(currSlide, nextSlide);
                                doAnimateCallback();

                                if(direction != LEFT) {
                                    // going right, so we animate the
                                    // current slide off to the left, and
                                    // then circle it to the back of the line
                                    currSlide.css('position', 'absolute')
                                        .css('left', -SLIDE_WIDTH)
                                        .insertAfter(lastSlide);
                                }

                                // clean up CSS which was used purely to 
                                // perform a good looking animation
                                sliderSlides.attr('style', '');
                                nextSlide.attr('style', '');
                                currSlide.attr('style', '');
                            }
                        });

                        if(isResponsive) {
                            nextSlide.animate({ width: '63.6%' }, {
                                queue: false
                            });
                        }
                    }
                    else {
                        debugSlidify('slidify.js:264    regular!');

                        // slide OUT the current slide and slide IN the new one
                        //
                        // the below sets the CSS position of the current slide
                        // to the right or left of the viewport, and then slides
                        // back in the new slide to show into the viewport
                        currSlide.animate(currSlideEnd, {
                            duration: opts.duration,
                            complete: function() {

                                debugSlidify('slidify.js:203  doAnimate()  currSlide.animate callback!  REMOVING ACTIVE CLASS  -> ' + $(this).attr('class'));

                                // since removing the ACTIVE class will make it 
                                // disappear, remove it *after* its slid out
                                $(this).removeClass(ACTIVE);
                                $(this).removeAttr('style');
                            }
                        });

                        nextSlide.addClass(ACTIVE).css(nextSlideStart).animate(nextSlideEnd, {
                            duration: opts.duration,
                            complete: function() {

                                // FIXME if you start the animation and then
                                // sorta scroll the page such that the slider
                                // goes off the screen, these (important)
                                // callbacks might not run!

                                debugSlidify('slidify.js:220  doAnimate()  nextSlide.animate callback!  cleaning up slider state...');

                                // ...because we disable it at the top of doAnimate
                                // to prevent next/prev click spam
                                enableSlidePageControlButtons();

                                opts.sliderChangedCallback(currSlide, nextSlide);

                                doAnimateCallback();
                            }
                        });
                    }

                    setSliderState(nextSlideNum);

                    debugSlidify('slidify.js:241  doAnimate()  finished!  currSlideNum: ' + currSlideNum);

                } // end of doAnimate()      //}}}

                var cursor = 0;
                var cursorAnchor;

                function doCSSAnimationTransition(direction, doAnimateCallback) {//{{{
                    /*
                        XXX TODO  relies on an "out of scope" slideList variable up there ^

                        Q. what happens here?

                        slide           what happens
                        -----           ------------
                        at-bat          gets animated out

                        on-deck         gets animated in, and div is expanded
                                        to the full width of the image: 790px;

                        in-the-hole     gets animated in, and set 60% of the width
                                        of the 'full width' of the image:  480px;

                        (^  extremely plagiarized from bustle.com, which 
                            has a super cool slider I am trying to copy <3 )

                        --------

                        'states' is the four state variables used to perform the 
                        CSS animations which provide the illusion of a
                        cool slider/carousel effect.  
                        
                        Basically, it involves the follow design/layout:

                            [[ last-up ]]   [[ at-bat ]]   [[ on-deck ]]   [[ in-the-hole ]]

                        ...
                        TODO  explain moar ^


                        TODO  there is probably a clever way to implement this without
                              having two keep two lists of states for each direction!
                              --->
                     */
                    var states = ['last-up', 'at-bat', 'on-deck', 'in-the-hole'];  
                    var selectorCurrent = getSlideSelector(currSlideNum);
                    var currSlide  = slider.find(selectorCurrent);

                    // clear state so as to re-apply them so CSS animations run
                    slideList.removeClass(states.join(' '));

                    debugSlidify('doCSSAnimationTransition()'  +
                        '     direction: ' + direction +
                        '     currSlideNum: ' + currSlideNum, 404
                    );


                    /*
                       iterate through the 4 relevant sibling nodes,
                       applying the state classes in the right order!
                    */
                    var statesApplied = 0;
                    var theEnd = slideList.length - 1;
                    var i, j; 

                    var debugdebug = '';

                    if(direction == LEFT) {

                        sliderSlides.addClass(GOING_IN_REVERSE);
                        sliderSlides.removeClass(GOING_AHEAD);

                        //  1. apply the 'at-bat' state to the slide 
                        //     TO THE LEFT of the current
                        //  2. apply the 'on-deck' state the current slide
                        //  3. apply the 'in-the-hole' and 'last-up' states
                        //     TO THE NEXT TWO NODES on the right

                        var onDeckAndInTheHole = ['in-the-hole', 'last-up'];

                        // Step 1
                        if(currSlide.index() == 0) {
                            slideList.eq(-1).addClass('at-bat');
                        }
                        else {
                            currSlide.prev().addClass('at-bat');
                        }

                        // Step 2
                        currSlide.addClass('on-deck');

                        // Step 3
                        for(i = 0; i < onDeckAndInTheHole.length; i++) {
                            j = currSlideNum + i;
                            if(j > theEnd) 
                                k = Math.abs(j - theEnd);
                            else 
                                k = j;

//                             debugSlidify('j: ' + j + '  k: ' + k + '  state: ' + onDeckAndInTheHole[i], 454);

                            slideList.eq(k).addClass(onDeckAndInTheHole[i]);
                        }



                        if(currSlideNum - 1 <= 0) {
//                             console.log('$$$$$$');
                            setSliderState(theEnd);
                        }
                        else {
//                             console.log('@@@@@@');
                            setSliderState(currSlideNum - 1);
                        }

                    }
                    else if(direction == RIGHT) {

                        sliderSlides.addClass(GOING_AHEAD);
                        sliderSlides.removeClass(GOING_IN_REVERSE);

                        //  1. from current position, go as far RIGHT as possible
                        //     applying states
                        //  2. from index 0, go right until there's
                        //     no more states to apply

                        // Step 1
                        for(i = currSlideNum - 1;  i < slideList.length; i++) { 
//                             debugSlidify('aaa ' + i + '   state: ' + states[statesApplied] + '   statesApplied: ' + statesApplied, 605); 
                            slideList.eq(i).addClass(states[statesApplied]);
                            statesApplied += 1;
                        }

                        // Step 2
                        i = 0;
                        while(statesApplied + i < states.length) {
//                             debugSlidify('ccc ' + i + '   state: ' + states[statesApplied + i], 612);
                            slideList.eq(i).addClass(states[statesApplied + i]);
                            i += 1;
                        }

                        if(currSlideNum + 1 > slideList.length) {
                            setSliderState(0);    // loop to the start
                        }
                        else {
                            setSliderState(currSlideNum + 1);
                        }
                    }
                    else {
                        debugSlidify(576, 'wtf shouldnt get here :O');
                    }

                    opts.sliderChangedCallback(currSlide, nextSlide);
//                     debugSlidify(debug, 545);
                    debugSetSliderState();
                    debugSlidify(DEBUG_LOG_SEPARATOR, 547);

                }//}}}

                function setSliderState(curr, left, right) {//{{{
                    /*
                        Set state variables for the current slidified thingy. 

                        Called on
                            1.  first slidify initialization
                            2.  after a slide change is completed  (in doAnimate)

                        IMPORTANT: this comparison of `=== 0` is really important!
                                   0 represents the index of the very first slide!
                     */

                    if(curr || curr === 0)
                        currSlideNum = curr;

                    if(arguments.length == 3) {         // for overrides etc
                        slideOnLeft = left;
                        slideOnRightNum = right;
                    }

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

                }//}}}

                /*
                    Call this after calling setSliderState() to
                    see what it set that state to!
                */
                function debugSetSliderState() {
                    debugSlidify('    setSliderState()' +
                        '   left: ' + slideOnLeftNum +
                        '   curr: ' + currSlideNum + 
                        '   right: ' + slideOnRightNum, 586
                    );

                    if(DEBUG_SLIDIFY) {
                        $('#debug-slidify-place').html('curr: ' + currSlideNum);
                    }
                }

                function updatePageControl() {//{{{
                    var pageControls = slider.find(opts.pagecontrol + ' .control');
                    pageControls.removeClass('on').eq(currSlideNum - 1).addClass('on');
                }//}}}

                function toggleArrowPressed(e) {//{{{
                    if(e.type == 'mousedown') {
                        $(this).addClass('pressed');
                    }
                    else {
                        $(this).removeClass('pressed');
                    }
                }//}}}

                function enableSlidePageControlButtons() {//{{{

                    slider.find(opts.left).unbind('click').click(function() {
                        if(isResponsive) {
                            doCSSAnimationTransition(LEFT);
                        }
                        else {
                            doAnimate(LEFT);
                        }
                        updatePageControl();
                    });

                    slider.find(opts.right).unbind('click').click(function() {
                        if(isResponsive) {
                            doCSSAnimationTransition(RIGHT);
                        }
                        else {
                            doAnimate(RIGHT);
                        }
                        updatePageControl();
                    });

                    // clicking on a arrow buttons should show a i-am-pressed state
                    slider.find([opts.left, opts.right].join(',')).bind('mousedown mouseup mouseout', toggleArrowPressed);
                }//}}}

                function disableNextPrevButtons() {//{{{
                    slider.find([opts.left, opts.right].join(',')).unbind('click');
                }//}}}

                function getWindowScroll() {//{{{
                    //copied from jquery-1.8.3.js:9266
                    return window.pageYOffset || document.documentElement.scrollTop;
                }//}}}

                function makeSwipable() {//{{{
                    /*
                         Binds touch events to support finger swipe/panning
                         on the carousel.  This function uses a bunch of
                         global 'state' variables to coordinate how stuff 
                         will be animated.

                         event.preventDefault() here will prevent the slider
                         and or default browser panning action from doing
                         anything at all  (so you probably dont want this)

                         http://developer.apple.com/library/ios/#documentation/AppleApplications/Reference/SafariWebContent/HandlingEvents/HandlingEvents.html
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

                    // [0] because sliderSlides is a jQuery object
                    if(!sliderSlides[0]) {
                        debugSlidify('slidify.js:257  doh! slidify needs a child ' + opts.slides + ' element to work!');
                        return;
                    }

                    if(!IS_TOUCH_NONE) {

                        sliderSlides[0].addEventListener('touchstart', function(e) {

                            if(animatingSlideChange) {
                                debugSlidify('slidify.js:279  touchstart   animatingSlideChange already, so dont start another');
                                return;
                            }

                            // http://uihacker.blogspot.tw/2011/01/android-touchmove-event-bug.html
                            // http://code.google.com/p/android/issues/detail?id=5491
                            if( navigator.userAgent.match(/Android/i) ) {
                              e.preventDefault();
                            }

                            debugSlidify('------------------------------------');

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

                            debugSlidify('slidify.js:336  touchstart  at ' + touchToString({ x: startX, y:startY }) + '  currSlideNum: ' + currSlideNum + '  windowScrollStart: ' + windowScrollStart + '   usedOneFinger: ' + usedOneFinger + '   animatingSlideChange: ' + animatingSlideChange);

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

                                // debugSlidify('slidify.js:371  touchstart  slideOnRight left: ' + slideOnRight.css('left') + '  slideOnLeft left: ' + slideOnLeft.css('left') + '   SLIDE_WIDTH_PIXELS: ' + SLIDE_WIDTH_PIXELS + '   slideOnRight selector: ' + getSlideSelector(slideOnRightNum) );
                            }
                            else {
                                animatingSlideChange = false;
                            }

                        }, false);


                        sliderSlides[0].addEventListener('touchmove', function(e) {

                            if(!usedOneFinger)
                                return;


                            if(IS_TOUCH_SLIDES_WITH_FINGER) {
                                if(e.touches.length > 1)
                                    return;
                            }

                            if(completingSlideChange) {
                                debugSlidify('slidify.js:406  touchmove  completing slide change, do not start another!!!1');
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

//                             debugSlidify('slidify.js:409  touchmove   deltaX: ' + deltaX + '  deltaY: ' + deltaY + '  startedPanningHorizontaly: ' + startedPanningHorizontaly);

                            if(startedPanningHorizontaly === true &&
                                    Math.abs(deltaY) > 0) {

//                                 debugSlidify('slidify.js:397  touchmove   panned vertically,  but already moved horizontally, so preventing vertical panning altogether');
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


                        sliderSlides[0].addEventListener('touchend', function(e) {

                            var removedAllFingers = e.touches.length === 0;

                            debugSlidify('slidify.js:478  touchend   entered  e.touches.length: ' + e.touches.length + '   e.targetTouches.length: ' + e.targetTouches.length +  '  animatingSlideChange: ' + animatingSlideChange + '  removedAllFingers: ' + removedAllFingers);

                            // there are situations in which we do not
                            // want to perform the animations which
                            // are done on touchend... we handle them here

                            if(IS_TOUCH_SIMPLE && animatingSlideChange) {
                                debugSlidify('slidify.js:490  touchend   animatingSlideChange slides, so dont do animations');
                                return;
                            }

                            if(!removedAllFingers) {
                                debugSlidify('slidify.js:495  touchend  didnt remove all fingers, so dont do more animations');
                                return;
                            }

                            if(!usedOneFinger) {
                                debugSlidify('slidify.js:500  touchend  used more than one finger, do not do anything!');
                                return;
                            }

                            if(completingSlideChange) {
                                debugSlidify('slidify.js:509  touchend  completing slide change, do not start another!!!1');
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

                            debugSlidify('slidify.js:543  touchend  at ' + touchToString({ x:endX, y:endY }) + '  change: ' + touchToString({ x:changeX, y:changeY}) + '  totalScrollAmount? ' + totalScrollAmount + '  windowScrollEnd: ' + windowScrollEnd + '  startedPanningHorizontaly: ' + startedPanningHorizontaly + '  e.touches.length: ' +  e.touches.length );


                            if(tapped) {
                                debugSlidify('slidify.js:547  touchend  just did a tap, so not doin anythin');

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

//                                     debugSlidify('slidify.js:500  touchend  checking threshold    changeX: ' + changeX + '    SLIDE_WIDTH / 2.0: ' + SLIDE_WIDTH / 2.0 + '    shift: ' + shift + '    currSlide left: ' + currSlide.css('left') + '   windowScrollEnd: ' + windowScrollEnd);

                                    if(changeXabs <= THRESHOLD) {

                                        // we haven't passed the threshold
                                        // ...so retract!

//                                         debugSlidify('slidify.js:505  touchend  ' + changeXabs + ' was below threshold of ' + THRESHOLD + ', so RETRACTING...');

                                        shift = '0px';

                                        if(swipedToTheLeft) {   // e.g. went right
                                            shiftNext = SLIDE_WIDTH_PIXELS;
                                        }
                                        else {
                                            shiftNext = '-' + SLIDE_WIDTH_PIXELS;
                                        }
                                    }
                                    else {
//                                         debugSlidify('slidify.js:508  ' + changeXabs + ' WAS ABOVE the threshold of ' + THRESHOLD + ', so doing slide change!');

                                        shiftNext = '0px';

                                        if(swipedToTheLeft) {
                                            setSliderState(slideOnRightNum);
                                        }
                                        else {
                                            setSliderState(slideOnLeftNum);
                                        }
                                    }

                                    completingSlideChange = true;

                                    // finish up the slide change here
                                    //
                                    currSlide.animate({ 'left': shift }, {
                                        duration: opts.duration,
                                        complete: function() {
                                            debugSlidify('slidify.js:484  currSlide complete!');

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
                                            debugSlidify('slidify.js:524  nextSlide complete!');
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
//                                             debugSlidify('slidify.js:646  touchend  swiped left');
                                            direction = RIGHT;
                                        }
                                        else {
//                                             debugSlidify('slidify.js:650  touchend  swiped right');
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
//}}}

                function touchToString(t) {//{{{
                    return '( x:' + t.x + ', y:' + t.y + ' )';
                }//}}}

                function getSlideSelector(slideNum) {//{{{
                    return '.slide' + slideNum;
                }//}}}

            });
        }
    });
})( jQuery );

// vi: foldmethod=marker
