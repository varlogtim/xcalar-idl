namespace TooltipManager {
    // default options
    let options = {
        overlayOpacity: 0.5,
        popoverPosition: 'bottom',
        popoverHorzPadding: 19,
        popoverVertPadding: 19,
        popoverMargin: 10,
        highlightPadding: 10,
        preventSelection: false, // prevent highlighted area from being clickable
        loop: false, // if true, returns to step 1 after last step
        includeNumbering: true,
        closeOnModalClick: false, // close modal when background is clicked
        actionsRequired: ""
    };
    // let options = {};
    let $currElem: JQuery;
    let $popover: JQuery;
    let validPositions: string[] = ['left', 'right', 'top', 'bottom'];
    let arrowHeight: number = 10;
    let currElemRect: ClientRect | DOMRect;
    let pathTemplate: string = "M0 0 L20000 0 L20000 20000 L 0 20000 Z ";
    let popoverBorderWidth: number = 2;
    let resizeTimeout;
    let stepNumber: number = -1;
    let video;
    let $videoCloseArea;
    let currWalkthrough: TooltipInfo[];
    let $clickEle: JQuery;
    let title: string;
    let checkBoxChecked: boolean = false;



    export function start(walkthroughInfo: WalkthroughInfo, tooltips: TooltipInfo[],
            step: number, userOptions?: any): XDPromise<void> {
        stepNumber = step - 1;
        currWalkthrough = tooltips;
        title = walkthroughInfo.tooltipTitle;
        let deferred: XDDeferred<void> = PromiseHelper.deferred();

        if (userOptions) {
            setOptions(userOptions);
        }

        let promise;

        if (walkthroughInfo.isSingleTooltip) {
            // This is for future singular tooltip popups, rather than walkthroughs.
            // We can assume the tooltip is on the screen we're on now.
            promise = PromiseHelper.resolve();
        } else {
            promise = switchScreen(walkthroughInfo.startScreen);
        }

        promise
        .then(() => {
            if (walkthroughInfo.background) {
                createOverlay(true);
            } else if (options.closeOnModalClick) {
                createOverlay(false);
            }

            /*if (options.video) {
                setupVideo();
                setupVideoBreakpoints();
                options.preventSelection = false;
            }*/
            if (options.preventSelection) {
                createElementLayer();
            }
            createHighlightBox();
            createPopover(walkthroughInfo.isSingleTooltip, title);
            nextStep();
            $(window).resize(winResize);

            // temp
            //$('#xcalarVid').attr('muted', "true");
            deferred.resolve();
        })
        .fail((e) => {
            console.error("Could not open walkthrough: " + e);
            deferred.reject();
        });
        return deferred.promise();
    };

    function switchScreen(screen: TooltipStartScreen): JQueryPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        let switchPromise;
        if (!$("#fileBrowser").hasClass("xc-hidden")) {
            // Close any file browser open, just in case.
            FileBrowser.close();
        }
        switch(screen) {
            case(TooltipStartScreen.SQLWorkspace):
                if (!XVM.isSQLMode()) {
                    switchPromise = XVM.setMode(XVM.Mode.SQL);
                } else {
                    switchPromise = PromiseHelper.resolve();
                }
                switchPromise
                .then(() => {
                    // Switch to SQL workspace if not open
                    if (!$("#sqlTab").hasClass("active")) {
                        $("#sqlTab").click();
                    }
                    deferred.resolve();
                })
                .fail(deferred.reject);
                break;
            case (TooltipStartScreen.ADVModeDataflow):
                if (!XVM.isAdvancedMode()) {
                    switchPromise = XVM.setMode(XVM.Mode.Advanced);
                } else {
                    switchPromise = PromiseHelper.resolve();
                }
                switchPromise
                .then(() => {
                    // Switch to dataflow screen if not open
                    if (!$("#modelingDataflowTab").hasClass("active")) {
                        $("#dagButton").click();
                    }
                    // open dataflow list if not open
                    if (!$("#dataflowMenu").hasClass("active")) {
                        $("#dagButton").click();
                    }
                    deferred.resolve();
                })
                .fail(deferred.reject);
                break;
            case (TooltipStartScreen.Workbooks):
                if (!WorkbookPanel.isWBMode()) {
                    WorkbookPanel.show(true);
                }
                deferred.resolve();
                break;
            default:
                deferred.resolve();
                break;
        }
        return deferred.promise();
    }

    function createOverlay(showBackground: boolean) {

        let gClass = "";
        if (!showBackground) {
            gClass = ' class="hiddenOverlay"';
        }

        let svg: string = '<svg id="intro-overlay"><g' + gClass + '><path id="intro-path"' +
            ' d="' + pathTemplate + '"></path></g></svg>';

        let $overlay: JQuery = $(svg);
        $('body').append($overlay);
        setTimeout(function() {
            $overlay.css('opacity', options.overlayOpacity);
        }, 0);
        if (options.closeOnModalClick) {
            $overlay.mousedown(closeWalkthrough);
        }
    }

    function createHighlightBox() {
        $('body').append('<div id="intro-highlightBox"></div>');
    }

    function createElementLayer() {
        $('body').append('<div id="intro-elementLayer"></div>');
    }

    function createPopover(isSingleTooltip: boolean, title: string) {
        let next: string = "";
        let tooltipCheckbox = "";
        if(!isSingleTooltip) {
            next = '<div class="next">' +
                        '<i class="icon xi-next"></i>' +
                    '</div>'
        }

        if (title === WKBKTStr.Location) {
            const checked = checkBoxChecked ? "checked" : "";
            tooltipCheckbox = '<section>' +
                                    '<div id="alertCheckBox" class="checkboxSection">' +
                                    '<div class="checkbox ' + checked + '">' +
                                    '<i class="icon xi-ckbox-empty"></i>' +
                                    '<i class="icon xi-ckbox-selected"></i>' +
                                    '</div>' +
                                    '<div class="checkboxText">Don\'t show again</div>' +
                                    '</div>' +
                                '</section>'
        }


        // UI subject to change
        let popoverHtml: string = '<div id="intro-popover" style="padding:' +
                            options.popoverVertPadding + 'px ' +
                            options.popoverHorzPadding + 'px;">' +
                            '<div class="topArea">' +
                                '<div class="title">' +
                                    title +
                                '</div>' +
                                '<div class="close">' +
                                    '<i class="icon xc-action xi-close cancel"></i>' +
                                '</div>' +
                            '</div>' +
                            '<div class="textContainer">' +
                                '<div class="text"></div>' +
                            '</div>' +
                            '<div class="bottomArea">' +
                                tooltipCheckbox +
                                next +
                                '<div class="intro-number"></div>' +
                            '</div>' +
                            '<div class="intro-arrow top"></div>' +
                          '</div>';
        $popover = $(popoverHtml);
        $('body').append($popover);

        // fade in popover, currently 400 ms
        $popover.css('opacity', 0);
        setTimeout(function() {
            $popover.css('opacity', 1);
        }, 100);

        if (!options.includeNumbering) {
            $popover.find('.intro-number').hide();
        }

        $popover.find('.next').click(function() {
            nextStep();
        });

        $popover.find('.close').click(function() {
            closeWalkthrough();
        });

        $popover.find('#alertCheckBox').click(function() {
            const $checkBox = $popover.find('#alertCheckBox').find('.checkbox');
            checkBoxChecked = !checkBoxChecked;
            if (checkBoxChecked) {
                $checkBox.addClass("checked");
            } else {
                $checkBox.removeClass("checked");
            }
            TooltipWalkthroughs.setShowWorkbook(!checkBoxChecked);
        });

    }


    /* controls nextStep whether it be forward, backwards or skipping
    *  @param {Object} arg : options include skip: boolean, back: boolean
    */
    function nextStep(arg?) {
        stepNumber++;

        clearListeners();
        // if currentStep goes past total number of steps
        if (!(arg && arg.skip) && stepNumber >= currWalkthrough.length) {
            closeWalkthrough();
            return;
        }
        if ($currElem) {
            $currElem.removeClass(".intro-highlightedElement");
        }

        /**if (options.video) {
            $popover.css({'opacity': 0});

            if (stepNumber === 0) {
                $popover.css({'visibility': 'hidden'});
            } else {
                setTimeout(function(){
                    $popover.css({'visibility': 'hidden'});
                }, 1000);
            }

            removeHighlightBox();
            video.play();
            if (stepNumber >= currWalkthrough.length) {
                return;
            }
        }*/
        // prevent currentStep from going out of range
        stepNumber = Math.max(0, stepNumber);
        stepNumber = Math.min(stepNumber, currWalkthrough.length - 1);

        if (stepNumber >= currWalkthrough.length - 1) {
            showPopoverEndState();
        }

        if (stepNumber > 0) {
            let oldInteractiveEle = currWalkthrough[stepNumber - 1].interact_div;
            if (currWalkthrough[stepNumber - 1].type == TooltipType.Click) {
                ensureOpenScreen(oldInteractiveEle);
            }
        }
        highlightNextElement();
    }

    /**
     * This ensures that some hardcoded interactive elements open respective panels.
     * In the future this function could be removed entirely, but for now there are some
     * behaviors that may need to be hardcoded.
     * @param interact_div
     */
    function ensureOpenScreen(interact_div) {
        if (!interact_div) {
            return;
        }
        switch(interact_div) {
            case (hardcodedInteractives.DatasetCreateTablePanel):
                DataSourceManager.startImport(false);
                MainMenu.open(true);
                break;
            case (hardcodedInteractives.SQLCreateTablePanel):
                DataSourceManager.startImport(true);
                MainMenu.open(true);
                break;
            default:
                break;
        }
        return;
    }

    function clearListeners() {
        if ($clickEle) {
            $clickEle.off(".tooltip");
        }
    }

    /*
    * Set options
    * @param {Object} userOptions : options the user wishes to change
    */
   function setOptions(userOptions) {
        for (let option in userOptions) {
            options[option] = userOptions[option];
        }

        return (options);
    };

    function highlightNextElement() {
        let currentStep = currWalkthrough[stepNumber];

        $currElem = $(currentStep.highlight_div);
        if ($currElem.length == 0) {
            // the next element was not successfully found.
            closeWalkthrough();
            TooltipWalkthroughs.emergencyPopup();
            return;
        }

        $currElem.addClass('intro-highlightedElement');
        currElemRect = $currElem[0].getBoundingClientRect();
        if (currElemRect.width == 0 || currElemRect.height == 0) {
            // the next element is not successfully displayed.
            closeWalkthrough();
            TooltipWalkthroughs.emergencyPopup();
            return;
        }

        moveElementLayer();
        moveHighlightBox();
        updatePopover(true);
    }

    function moveElementLayer() {
        let rect: ClientRect | DOMRect = currElemRect;
        if (options.preventSelection) {
            $('#intro-elementLayer').css({
                width: rect.width + 4,
                height: rect.height + 8,
                top: rect.top - 2,
                left: rect.left - 2
            });
        }
    }

    function updatePopover(initial?) {
        if (!initial) {
            $popover.css('opacity', 1);
        }
        clearListeners();

        let $popoverNumber = $popover.find('.intro-number');
        $popoverNumber.text("Steps " + String(stepNumber + 1) + "/" + currWalkthrough.length);
        let $infoArrow: JQuery = $popover.find('.intro-arrow');
        $infoArrow.removeClass('top bottom left right');
        $infoArrow.css({'top': 0, 'bottom': 'auto'});

        if (currWalkthrough[stepNumber].title) {
            $popover.find('.title').html(currWalkthrough[stepNumber].title);
        }
        $popover.find('.text').html(currWalkthrough[stepNumber].text);
        let windowWidth: number = $(window).width();
        let windowHeight: number = $(window).height();
        let textHeight: number = $popover.find('.text').outerHeight();
        let textWidth: number = $popover.find('.text').outerWidth();
        let popoverHeight: number = textHeight + (options.popoverVertPadding * 2) +
                            (popoverBorderWidth * 2);
        // we can't directly calculate popover width because it has a
        // width transition that changes its width over time
        let popoverWidth: number = textWidth +
                           (options.popoverHorzPadding * 2) +
                           (popoverBorderWidth * 2);
        let rect: ClientRect | DOMRect = currElemRect;
        let top: number = 0;
        let minLeft: number = 5;
        let center: number = rect.left + (rect.width / 2);
        let centerVert: number = rect.top + (rect.height / 2);
        let tempLeft: number = center - (popoverWidth / 2);
        let left: number = Math.max(minLeft, tempLeft);
        let userPosition = $currElem.data('introposition');
        let positionIndex: number = validPositions.indexOf(userPosition);
        if (positionIndex !== -1 ) {
            userPosition = validPositions[positionIndex];
        } else {
            userPosition = 'auto';
        }

        if (userPosition === 'auto') {
            if (options.popoverPosition === 'bottom') {
                let bottomOfPopover: number = rect.bottom + popoverHeight +
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
            let arrowLeft: number = Math.max(5, center - left - arrowHeight);
            let maxArrowLeft: number = popoverWidth - (arrowHeight * 2) - 5;
            arrowLeft = Math.min(arrowLeft, maxArrowLeft);
            $infoArrow.css('left', arrowLeft);
        } else {
            let currentArrowTop: number = top + popoverBorderWidth;
            let vertDiff: number = centerVert - currentArrowTop;
            // console.log(currentArrowTop, centerVert, vertDiff);
            $infoArrow.css('top', vertDiff - 10);

        }

        $popover.find('.textContainer').height(textHeight);

        let currentStep: TooltipInfo = currWalkthrough[stepNumber];

        if (currentStep.type != TooltipType.Text) {
            $popover.find(".next").addClass("unavailable");
            $clickEle = $(currentStep.interact_div).eq(0);
            if (currentStep.type == TooltipType.Click) {
                $clickEle.on("click.tooltip", (e) => {
                    $clickEle.off("click.tooltip");

                    // changed to timeout from the following:
                    // e.stopPropagation();
                    // $clickEle.click();
                    // nextStep()

                    // stopPropagation didn't work and caused double click
                    // just nextStep() didn't work because the next element doesn't exist yet
                    setTimeout(()=>nextStep(), 0);
                });
            } else if (currentStep.type == TooltipType.Value) {
                $clickEle.on("keyup.tooltip", () => {
                    if ($clickEle.val() == currentStep.value) {
                        $clickEle.off("keyup.tooltip");
                        nextStep();
                    }
                })
            } else if (currentStep.type == TooltipType.DoubleClick) {
                $clickEle.on("dblclick.tooltip", () => {
                    $clickEle.off("dblclick.tooltip");

                    // changed to timeout from the following:
                    // e.stopPropagation();
                    // $clickEle.click();
                    // nextStep()

                    // stopPropagation didn't work and caused double click
                    // just nextStep() didn't work because the next element doesn't exist yet
                    setTimeout(()=>nextStep(), 0);
                });
            }
        } else {
            $popover.find(".next").removeClass("unavailable");
        }
    }

    function moveHighlightBox() {
        let rect: ClientRect | DOMRect = currElemRect;
        $('#intro-highlightBox').css({
            width: rect.width,
            height: rect.height,
            top: rect.top,
            left: rect.left
        });

        let left: number = rect.left - options.highlightPadding;
        let right: number = rect.right + options.highlightPadding;
        let top: number = rect.top - options.highlightPadding;
        let bottom: number = rect.bottom + options.highlightPadding;
        let path: string = pathTemplate +
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

    function removeHighlightBox() {
        $('#intro-overlay path').attr('d', pathTemplate);
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
            //adjustVideoClosePosition();
        }, 40);
    }

    function showPopoverEndState() {
        $popover.find('.next, .skip').addClass('unavailable');
    }


    export function closeWalkthrough() {
        stepNumber = -1;
        clearListeners();
        removeHighlightBox();

        $('#intro-overlay').css('opacity', 0);
        $('#intro-videoClose').remove();
        setTimeout(function() {
            $('#intro-overlay').remove();
        }, 300);
        $popover.css('opacity', 0).remove();
        $('#intro-highlightBox').remove();
        $('#intro-elementLayer').remove();
        $('.intro-highlightedElement').removeClass('intro-highlightedElement');
        $('intro-popover').remove();
        $(window).off('resize', winResize);
    }

    /**function setupVideo() {
        let $video = $(options.video);
        video = $video[0];
        video.play();
        let closeHtml = '<div id="intro-videoClose">' +
                            '<span>' +
                                CommonTxtTstr.Exit.toUpperCase() +
                            '</span>' +
                        '</div>';
        $('body').append(closeHtml);
        $videoCloseArea = $('#intro-videoClose');
        $videoCloseArea.click(function() {
            closeWalkthrough();
        });
        video.onloadedmetadata = adjustVideoClosePosition;
        video.onended = function() {
            $('#intro-videoClose').show();
        };
    }

    function setupVideoBreakpoints() {

        video.addEventListener("timeupdate", function() {
            if (this.currentTime >= options.videoBreakpoints[stepNumber]) {
                this.pause();
                moveHighlightBox();
                // highlightNextElement();
                $popover.css({'visibility': 'visible', 'opacity': 1});
            }
        });
    }

    function adjustVideoClosePosition() {
        if (!options.video) {
            return;
        }
        let $video = $(options.video);
        let offsetTop = $video.offset().top;
        let offsetLeft = $video.offset().left;
        let width = $video.width();
        let height = $video.height();
        $videoCloseArea.css({
            top: offsetTop,
            left: offsetLeft,
            width: width,
            height: height
        });
    }*/
}

enum TooltipType {
    Click = "click",
    DoubleClick = "doubleclick",
    Text = "text",
    Value = "value"
}

enum TooltipStartScreen {
    SQLWorkspace = "SQLWorkspace",
    ADVModeDataflow = "Adv Mode Dataflow",
    Workbooks = "Workbook Screen"
}

enum hardcodedInteractives {
    SQLCreateTablePanel = "#sourceTblButton",
    DatasetCreateTablePanel = "#inButton"
}