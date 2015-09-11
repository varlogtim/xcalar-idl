window.Intro = (function($, Intro) {
    var options = {
        overlayOpacity    : 0.5,
        popoverPosition   : 'bottom',
        popoverHorzPadding: 37,
        popoverVertPadding: 15,
        popoverMargin     : 10,
        highlightPadding  : 10,
        popoverText       : [],
        preventSelection  : true,
        loop              : false,
        includeNumbering  : false,
        closeOnModalClick : false,
        onStart           : "",
        onComplete        : "",
        onNextStep        : ""
    };
    var $currElem;
    var currentStep = -1;
    var validPositions = ['left', 'right', 'top', 'bottom'];
    var arrowHeight = 10;
    var currElemRect;
    var pathTemplate = "M0 0 L20000 0 L20000 20000 L 0 20000 Z ";
    var popoverBorderWidth = 2;
    var resizeTimeout;

    /*
    * Set initial options
    * @param {Object} userOptions : options the user wishes to change
    */
    Intro.setOptions = function(userOptions) {
        for (option in userOptions) {
            options[option] = userOptions[option];
        }
        return (options);
    };

    Intro.start = function() {
        if (typeof options.onStart === "function") {
            options.onStart();
        }
        
        currentStep = -1;
        $stepElems = $('[data-introstep]:visible');
        if ($stepElems.length === 0) {
            return ('No steps defined');
        }
        orderStepElems();

        createOverlay();
        if (options.preventSelection) {
            createElementLayer();
        }
        createHighlightBox();
        createPopover();
        nextStep();
        $(window).resize(winResize);
    };

    function orderStepElems() {
        $stepElems.sort(function (a, b) {
            var stepA = parseInt($(a).data('introstep'));
            var stepB = parseInt($(b).data('introstep'));
            return (stepA < stepB) ? -1 : (stepA > stepB) ? 1 : 0;
        });
    }

    function createOverlay() {
        var svg = '<svg id="intro-overlay"><g><path id="intro-path"' +
                  ' d="' + pathTemplate + '"></path></g></svg>';
        var $overlay = $(svg);
        $('body').append($overlay);
        setTimeout(function() {
            $overlay.css('opacity', options.overlayOpacity);
        }, 0);
        if (options.closeOnModalClick) {
            $overlay.mousedown(closeIntro);
        }
    }

    function createHighlightBox() {
        $('body').append('<div id="intro-highlightBox"></div>');
    }

    function createElementLayer() {
        $('body').append('<div id="intro-elementLayer"></div>');
    }

    function createPopover() {
        var popoverHtml = '<div id="intro-popover" style="padding:' +
                            options.popoverVertPadding + 'px ' +
                            options.popoverHorzPadding + 'px;">' +
                            '<div class="textContainer">' +
                                '<div class="text"></div>' +
                            '</div>' +
                            '<div class="buttonContainer left clearfix">' +
                                '<div class="back" title="back"></div>' +
                                '<div class="skipBack" ' +
                                    'title="skip to first step"></div>' +
                                '<div class="close left" title="exit"></div>' +
                            '</div>' +
                            '<div class="buttonContainer right clearfix">' +
                                '<div class="next" title="next"></div>' +
                                '<div class="skip" title="skip to last step">' +
                                '</div>' +
                                '<div class="close right" title="exit"></div>' +
                            '</div>' +
                            '<div class="intro-arrow top"></div>' +
                            '<div class="intro-number">' +
                                '<div class="innerNumber">1</div>' +
                            '</div>' +
                          '</div>';
        var $popover = $(popoverHtml);
        $('body').append($popover);

        // fade in popover, currently 400 ms
        $popover.css('opacity', 0);
        setTimeout(function() {
            $popover.css('opacity', 1);
        }, 100);
        
        if (!options.includeNumbering) {
            $popover.find('.intro-number').hide();
        }

        $popover.find('.back').click(function() {
            nextStep({back: true});
        });
        $popover.find('.next').click(function() {
            nextStep();
        });
        $popover.find('.skip').click(function() {
            nextStep({skip: true});
        });
        $popover.find('.skipBack').click(function() {
            nextStep({skip: true, back: true});
        });
        $popover.find('.close').click(function() {
            closeIntro();
        });
        $('body').keydown(keypressAction);
    }

    /* controls nextStep whether it be forward, backwards or skipping
    *  @param {Object} arg : options include skip: boolean, back: boolean
    */
    function nextStep(arg) {
        if (arg) {
            if (arg.skip) {
                if (arg.back) {
                    currentStep = 0;
                } else {
                    currentStep = $stepElems.length;
                }
            } else if (arg.back) {
                currentStep--;
            }
        } else {
            currentStep++;
        }
        // prevent currentStep from going out of range
        currentStep = Math.max(0, currentStep);
        currentStep = Math.min(currentStep, $stepElems.length - 1);

        $('#intro-popover').find('.back, .next, .skip, .skipBack')
                           .removeClass('unavailable');
        $('#intro-popover').find('.close').removeClass('available');
        if (currentStep >= $stepElems.length - 1) {
            showPopoverEndState();
        }
        if (currentStep === 0) {
            showPopoverStartState();
        }
        highlightNextElement();
    }

    function highlightNextElement() {
        // clean up previous elements
        $stepElems.removeClass('intro-highlightedElement');

        $currElem = $stepElems.eq(currentStep);
        if (typeof options.onNextStep === "function") {
            options.onNextStep($currElem);
        }
        $currElem.addClass('intro-highlightedElement');

        currElemRect = $currElem[0].getBoundingClientRect();
        
        moveElementLayer();
        moveHighlightBox();
        updatePopover(true);
    }

    function moveElementLayer() {
        var rect = currElemRect;
        if (options.preventSelection) {
            $('#intro-elementLayer').css({
                width : rect.width + 4,
                height: rect.height + 8,
                top   : rect.top - 2,
                left  : rect.left - 2
            });
        }
    }

    function updatePopover(initial) {
        var $popover = $('#intro-popover');
        if (!initial) {
            $popover.css('opacity', 1);
        }
        
        var $popoverNumber = $popover.find('.intro-number');
        $popoverNumber.removeClass('left right');
        $popoverNumber.find('.innerNumber').text(currentStep + 1);
        var $infoArrow = $popover.find('.intro-arrow');
        $infoArrow.removeClass('top bottom left right');
        $infoArrow.css({'top': 0, 'bottom': 'auto'});

        $popover.find('.text').html(options.popoverText[currentStep]);
        var windowWidth = $(window).width();
        var windowHeight = $(window).height();
        var textHeight = $popover.find('.text').outerHeight();
        var textWidth = $popover.find('.text').outerWidth();
        var popoverHeight = textHeight + (options.popoverVertPadding * 2) +
                            (popoverBorderWidth * 2);
        // we can't directly calculate popover width because it has a
        // width transition that changes its width over time
        var popoverWidth = textWidth +
                           (options.popoverHorzPadding * 2) +
                           (popoverBorderWidth * 2);
        var rect = currElemRect;
        var top = 0;
        var minLeft = 5;
        var center = rect.left + (rect.width / 2);
        var centerVert = rect.top + (rect.height / 2);
        var tempLeft = center - (popoverWidth / 2);
        var left = Math.max(minLeft, tempLeft);
        var userPosition = $currElem.data('introposition');
        var positionIndex = validPositions.indexOf(userPosition);
        if (positionIndex !== -1 ) {
            userPosition = validPositions[positionIndex];
        } else {
            userPosition = 'auto';
        }

        if (userPosition === 'auto') {
            if (options.popoverPosition === 'bottom') {
                var bottomOfPopover = rect.bottom + popoverHeight +
                                      options.popoverMargin + arrowHeight;
                if (bottomOfPopover <= windowHeight) {
                    top = rect.bottom + options.popoverMargin + arrowHeight;
                    $infoArrow.addClass('bottom');
                } else {
                    top = rect.top - popoverHeight -
                          options.popoverMargin - arrowHeight;
                    $infoArrow.addClass('top');
                }
            }
        } else {
            switch (userPosition) {
                case ('top'):
                    top = currElemRect.top - popoverHeight -
                          options.popoverMargin - arrowHeight;
                    break;
                case ('bottom'):
                    top = rect.bottom + options.popoverMargin + arrowHeight;
                    break;
                case ('left'):
                    top = currElemRect.top +
                         ((currElemRect.height - popoverHeight) / 2);
                    left = currElemRect.left - popoverWidth -
                           options.popoverMargin - arrowHeight;
                    $infoArrow.css({
                        'left': 'auto'
                    });
                    $popoverNumber.addClass('left');
                    break;
                case ('right'):
                    top = currElemRect.top +
                         ((currElemRect.height - popoverHeight) / 2);
                    left = currElemRect.right + options.popoverMargin +
                           arrowHeight;
                    break;
            }
          
            $infoArrow.addClass(userPosition);
        }
        top = Math.max(0, top);
        top = Math.min(windowHeight - popoverHeight, top);
        $popover.css('top', top);
        

        if (left + popoverWidth > windowWidth) {
            left = windowWidth - popoverWidth - options.popoverMargin;
            $infoArrow.css('left', currElemRect.left - left - 5);
            $popoverNumber.addClass('left');
        }
      
        $popover.css({
            'left': left
        });

        if (!$infoArrow.hasClass('left') && !$infoArrow.hasClass('right')) {
            var arrowLeft = Math.max(5, center - left - arrowHeight);
            var maxArrowLeft = popoverWidth - (arrowHeight * 2) - 5;
            arrowLeft = Math.min(arrowLeft, maxArrowLeft);
            $infoArrow.css('left', arrowLeft);
        } else {
            var currentArrowTop = top + popoverBorderWidth;
            var vertDiff = centerVert - currentArrowTop;
            // console.log(currentArrowTop, centerVert, vertDiff);
            $infoArrow.css('top', vertDiff - 10);

        }
       
        $popover.find('.textContainer').height(textHeight);
    }

    function moveHighlightBox() {
        var rect = currElemRect;
        $('#intro-highlightBox').css({
            width : rect.width,
            height: rect.height,
            top   : rect.top,
            left  : rect.left
        });

        var left = rect.left - options.highlightPadding;
        var right = rect.right + options.highlightPadding;
        var top = rect.top - options.highlightPadding;
        var bottom = rect.bottom + options.highlightPadding;
        var path = pathTemplate +
                   ' M' + left + ' ' + top +
                   ' L' + right + ' ' + top +
                   ' L' + right + ' ' + bottom +
                   ' L' + left + ' ' + bottom;

        if (d3) { //  how do we do a better check for d3?
            d3.select('#intro-path').transition().duration(300)
                                    .ease('ease-out').attr('d', path);
        } else {
            $('#intro-path').attr('d', path);
        }
    }

    function winResize() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function() {
            if ($currElem.length) {
                currElemRect = $currElem[0].getBoundingClientRect();
                moveElementLayer();
                updatePopover();
                moveHighlightBox();
            }
        }, 40);
    }

    function showPopoverEndState() {
        $('#intro-popover').find('.next, .skip').addClass('unavailable');
        $('#intro-popover').find('.close.right').addClass('available');
    }

    function showPopoverStartState() {
        $('#intro-popover').find('.back, .skipBack').addClass('unavailable');
        $('#intro-popover').find('.close.left').addClass('available');
    }

    function closeIntro() {
        currentStep = 0;
        $('#intro-overlay path').attr('d', pathTemplate);

        $('#intro-overlay').css('opacity', 0);
        setTimeout(function() {
            $('#intro-overlay').remove();
        }, 300);
        $('#intro-popover').css('opacity', 0).remove();
        $('#intro-highlightBox').remove();
        $('#intro-elementLayer').remove();
        $('.intro-highlightedElement').removeClass('intro-highlightedElement');
        $(window).off('resize', winResize);
        $('body').off('keydown', keypressAction);
        if (typeof options.onComplete === "function") {
            options.onComplete();
        }
    }

    function keypressAction(e) {
        if (e.which === 37 || e.which === 38) { // up / left to go back
            nextStep({back: true});
        } else if (e.which === 39 || e.which === 40) { // down / right for next
            nextStep();
        } else if (e.which === 27 || e.which === 13) { // escape / enter to exit
            closeIntro();
        }
    }
    return (Intro);
}(jQuery, {}));
