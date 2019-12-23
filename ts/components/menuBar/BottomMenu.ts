namespace BottomMenu {
    let clickable: boolean = true;
    let $menuPanel: JQuery; //$("#bottomMenu");
    let _isMenuOpen: boolean = false;
    let _isPoppedOut: boolean = false;
    let menuAnimCheckers: XDDeferred<void>[] = [];
    let needsMainMenuBackOpen: boolean = false;

    export function setup(): void {
        $menuPanel = $("#bottomMenu");
        setupButtons();
        Log.setup();
        initialize();
    };

    function initialize(): void {
        $menuPanel[0].addEventListener(window["transitionEnd"], function(event) {
            if (!$(event.target).is("#bottomMenu")) {
                return;
            }
            if (!$menuPanel.hasClass("open")) {
                $menuPanel.find(".bottomMenuContainer").hide();
            }
            resolveMenuAnim();
        });
    };

    export function close(topMenuOpening: boolean = false): void {
        closeMenu(topMenuOpening);
        if (topMenuOpening) {
            resolveMenuAnim();
        }
    };

    export function isMenuOpen(): boolean {
        return _isMenuOpen;
    };

    export function isPoppedOut(): boolean {
        return _isPoppedOut;
    };

    export function openSection(sectionIndex: number): void {
        openMenu(sectionIndex);
    };

    export function openUDFMenuWithMainMenu(): void {
        openMenu(0, true);
    }

    // setup buttons to open bottom menu
    function setupButtons(): void {
        $menuPanel.on("click", ".close", function() {
            let wasFromMainMenu = $menuPanel.hasClass("fromMainMenu");
            BottomMenu.close(false);
            if (wasFromMainMenu) {
                MainMenu.close(true);
            }
        });

        $menuPanel.on("click", ".popOut", function() {
            if ($menuPanel.hasClass('poppedOut')) {
                // width is changing
                popInModal(true);
            } else {
                popOutModal();
            }
        });

        $menuPanel.draggable({
            "handle": ".heading.draggable",
            "cursor": "-webkit-grabbing",
            "containment": "window"
        });

        let sideDragging: string;
        $menuPanel.on("mousedown", ".ui-resizable-handle", function() {
            const $handle: JQuery = $(this);
            if ($handle.hasClass("ui-resizable-w")) {
                sideDragging = "left";
            } else if ($handle.hasClass("ui-resizable-e")) {
                sideDragging = "right";
            } else if ($handle.hasClass("ui-resizable-n")) {
                sideDragging = "top";
            } else if ($handle.hasClass("ui-resizable-s")) {
                sideDragging = "bottom";
            } else if ($handle.hasClass("ui-resizable-se")) {
                sideDragging = "bottomRight";
            }
        });

        let poppedOut: boolean = false;
        let menuIsSmall: boolean = false;
        const smallWidth: number = 425;

        $menuPanel.resizable({
            "handles": "n, e, s, w, se",
            "minWidth": 295,
            "minHeight": 300,
            "start": function() {
                $("#container").addClass("menuResizing");
                if (!$menuPanel.hasClass("poppedOut")) {
                    poppedOut = false;
                } else {
                    poppedOut = true;
                }

                // set boundaries so it can't resize past window
                let panelRight: number = $menuPanel[0].getBoundingClientRect().right;
                let panelBottom: number = $menuPanel[0].getBoundingClientRect().bottom;

                if (sideDragging === "left") {
                    $menuPanel.css("max-width", panelRight - 10);
                } else if (sideDragging === "right") {
                    panelRight = $(window).width() - panelRight +
                                 $menuPanel.width();
                    $menuPanel.css("max-width", panelRight - 10);
                } else if (sideDragging === "top") {
                    $menuPanel.css("max-height", panelBottom);
                } else if (sideDragging === "bottom") {
                    panelBottom = $(window).height() - panelBottom +
                                  $menuPanel.height();
                    $menuPanel.css("max-height", panelBottom);
                } else if (sideDragging === "bottomRight") {
                    panelRight = $(window).width() - panelRight +
                                 $menuPanel.width();
                    $menuPanel.css("max-width", panelRight);
                    panelBottom = $(window).height() - panelBottom +
                                  $menuPanel.height();
                    $menuPanel.css("max-height", panelBottom);
                }

                if ($menuPanel.width() > 425) {
                    menuIsSmall = false;
                } else {
                    menuIsSmall = true;
                }
            },
            "stop": function() {
                $menuPanel.css("max-width", "").css("max-height", "");
                let width: number = $menuPanel.width();

                width = Math.min(width, $(window).width() - $("#menuBar").width() - 10);

                $menuPanel.width(width);
                if (width > 425) {
                    $menuPanel.removeClass("small");
                } else {
                    $menuPanel.addClass("small");
                }
                refreshEditor();
                $("#container").removeClass("menuResizing");
            },
            "resize": function(_event, ui) {
                if (ui.size.width > smallWidth) {
                    if (menuIsSmall) {
                        menuIsSmall = false;
                        $menuPanel.removeClass("small");
                    }
                } else if (!menuIsSmall) {
                    menuIsSmall = true;
                    $menuPanel.addClass("small");
                }
                refreshEditor();

                if (!poppedOut) {
                    return;
                }
                if (ui.position.left <= 0) {
                    $menuPanel.css("left", 0);
                }
                if (ui.position.top <= 0) {
                    $menuPanel.css("top", 0);
                }
            }
            // containment: "document"
        });

        $("#bottomMenuBarTabs").on("click", ".sliderBtn", function() {
            if (!clickable) {
                return;
            }
            toggleSection($(this).index("#bottomMenuBarTabs .sliderBtn"));
        });
    }

    function closeMenu(topMenuOpening: boolean = false): boolean {
        if (needsMainMenuBackOpen && !topMenuOpening) {
            needsMainMenuBackOpen = false;
            let $activeTab = $(".topMenuBarTab.active");
            if ($activeTab.hasClass("mainMenuOpen") &&
                !$activeTab.hasClass("noLeftPanel")
            ) {
                if ($menuPanel.hasClass("fromMainMenu") &&
                    $("#udfSection").hasClass("active")
                ) {
                    topMenuOpening = true;
                    MainMenu.close(true);
                } else {
                    MainMenu.open();
                    return;
                }
            }
        }
        $menuPanel.removeClass("open");
        $("#container").removeClass("bottomMenuOpen");
        _isMenuOpen = false;
        // recenter table titles if on workspace panel
        $("#bottomMenuBarTabs .sliderBtn.active").removeClass("active");
        if ((topMenuOpening && !_isPoppedOut) ||  $("#container").hasClass("noWorkbookMenuBar")){
            noAnim();
        } else if (!_isPoppedOut && $("#modelingDagPanel").hasClass("active")) {
            checkMenuAnimFinish()
            .then(function() {
                TblFunc.moveFirstColumn();
                DagCategoryBar.Instance.showOrHideArrows();
            });
        }
        popInModal(null, topMenuOpening);
        return !topMenuOpening;
    }

    function toggleSection(sectionIndex: number): void {
        if (sectionIndex == null) {
            sectionIndex = 0;
        }
        let hasAnim: boolean = true;

        const $menuSections: JQuery = $menuPanel.find(".menuSection");
        // const $sliderBtns = $("#bottomMenuBarTabs .sliderBtn");
        const $section: JQuery = $menuSections.eq(sectionIndex);

        if ($menuPanel.hasClass("open") && $section.hasClass("active")) {
            // section is active, close right side bar
            if ($menuPanel.hasClass("poppedOut")) {
                // disable closing if popped out
                return;
            } else {
                if (needsMainMenuBackOpen || $("#container").hasClass("noWorkbookMenuBar")) {
                    hasAnim = false;
                }
                closeMenu();
            }
        } else {
            hasAnim = openMenu(sectionIndex);
        }

        // dealay the next click as the menu open/close has animation
        if (hasAnim) {
            clickable = false;
            $("#menuBar").addClass("animating");
            checkMenuAnimFinish()
            .then(function() {
                $("#menuBar").removeClass("animating");
                clickable = true;
            });
        }
    }

    export function unsetMenuCache(): void {
        needsMainMenuBackOpen = false;
    };

    function openMenu(sectionIndex: number, fromMainMenu?: boolean): boolean {
        // bottom menu was closed or it was open and we"re switching to
        // this section
        const $menuSections: JQuery = $menuPanel.find(".menuSection");
        const $sliderBtns: JQuery = $("#bottomMenuBarTabs .sliderBtn");
        const $section: JQuery = $menuSections.eq(sectionIndex);
        let hasAnim: boolean = true;

        const wasOpen: boolean = $menuPanel.hasClass("open");
        $sliderBtns.removeClass("active");
        let $activeBtn = $sliderBtns.eq(sectionIndex)
        $activeBtn.addClass("active");

        if (fromMainMenu) {
            $menuPanel.addClass("fromMainMenu");
            $activeBtn.addClass("fromMainMenu");
        } else {
            $menuPanel.removeClass("fromMainMenu");
            $activeBtn.removeClass("fromMainMenu");
        }

        $menuPanel.find(".bottomMenuContainer").show();

        $menuSections.removeClass("active");
        // mark the section and open the menu
        $section.addClass("active");
        let isBottomMenuOpening: boolean = false;
        if ($("#mainMenu").hasClass("open")) {
            needsMainMenuBackOpen = true;
            isBottomMenuOpening = true;
            MainMenu.close(isBottomMenuOpening);
            noAnim();
            hasAnim = false;
        }
        if ($("#container").hasClass("noWorkbookMenuBar")) {
            isBottomMenuOpening = true;
        }

        $menuPanel.addClass("open");
        $("#container").addClass("bottomMenuOpen");
        _isMenuOpen = true;
        // recenter table titles only if: on workspace panel,
        // main menu was not open && bottom menu was not open
        if (!isBottomMenuOpening && !wasOpen) {
            if ($("#modelingDagPanel").hasClass("active")) {
                checkMenuAnimFinish()
                .then(function() {
                    TblFunc.moveFirstColumn();
                    DagCategoryBar.Instance.showOrHideArrows();
                });
            }
        } else {
            $("#container").addClass("noMenuAnim");
            // only needed for a split second to remove animation effects
            setTimeout(function() {
                $("#container").removeClass("noMenuAnim");
            }, 0);
            TblFunc.moveFirstColumn();
            DagCategoryBar.Instance.showOrHideArrows();
            hasAnim = false;
        }

        const sectionId: string = $section.attr("id");
        if (sectionId ==="udfSection") {
            $("#udfButtonWrap").removeClass("xc-hidden");
            UDFPanel.Instance.switchMode();
        } else {
            $("#udfButtonWrap").addClass("xc-hidden");
        }

        refreshEditor();
        return hasAnim;
    }

    function noAnim(): void {
        $menuPanel.addClass("noAnim");
        setTimeout(function() {
            $menuPanel.removeClass("noAnim");
        }, 100);
    }

    function checkMenuAnimFinish(): XDPromise<void> {
        const menuAnimDeferred: XDDeferred<void> = PromiseHelper.deferred();
        menuAnimCheckers.push(menuAnimDeferred);
        return menuAnimDeferred.promise();
    }

    function popOutModal(): void {
        _isPoppedOut = true;
        const offset: {left: number, top: number} = $menuPanel.offset();

        $menuPanel.addClass("poppedOut");
        const $popOut: JQuery = $menuPanel.find(".popOut");
        xcTooltip.changeText($popOut, SideBarTStr.PopBack);
        $popOut.removeClass("xi_popout").addClass("xi_popin");
        xcTooltip.hideAll();
        $menuPanel.css({
            "left": offset.left - 5,
            "top": offset.top - 5
        });
        $("#container").addClass("bottomMenuOut");
        if ($("#modelingDagPanel").hasClass("active")) {
            checkMenuAnimFinish()
            .then(function() {
                TblFunc.moveFirstColumn();
                DagCategoryBar.Instance.showOrHideArrows();
            });
        }
    }

    function popInModal(adjustTables: boolean = false, noAnimation: boolean = false): void {
        if (noAnimation) {
            noAnim();
        }

        $menuPanel.removeClass("poppedOut");
        $menuPanel.attr("style", "");
        const $popOut: JQuery = $menuPanel.find(".popOut");
        xcTooltip.changeText($popOut, SideBarTStr.PopOut);
        $popOut.removeClass("xi_popin").addClass("xi_popout");
        xcTooltip.hideAll();
        $("#container").removeClass("bottomMenuOut");
        _isPoppedOut = false;
        refreshEditor();

        if (adjustTables && $("#modelingDagPanel").hasClass("active")) {
            checkMenuAnimFinish()
            .then(function() {
                TblFunc.moveFirstColumn();
                DagCategoryBar.Instance.showOrHideArrows();
            });
        }
    }

    function resolveMenuAnim(): void {
        for (let i = 0; i < menuAnimCheckers.length; i++) {
            if (menuAnimCheckers[i]) {
                menuAnimCheckers[i].resolve();
            }
        }
        menuAnimCheckers = [];
    }

    function refreshEditor(): void {
        if ($("#udfSection").hasClass("active") &&
            !$("#udf-fnSection").hasClass("xc-hidden"))
        {
            UDFPanel.Instance.getEditor().refresh();
        }
    }
}
