namespace BottomMenu {
    let clickable: boolean = true;
    let $bottomMenu: JQuery; //$("#bottomMenu");
    let _isMenuOpen: boolean = false;
    let menuAnimCheckers: XDDeferred<void>[] = [];
    let _popup: PopupPanel;

    export function setup(): void {
        $bottomMenu = $("#bottomMenu");
        setupButtons();
        setupPopup();
        Log.setup();
        initialize();
    };

    function initialize(): void {
        $bottomMenu[0].addEventListener(window["transitionEnd"], function(event) {
            if (!$(event.target).is("#bottomMenu")) {
                return;
            }
            if (!$bottomMenu.hasClass("open")) {
                $bottomMenu.find(".bottomMenuContainer").hide();
            }
            resolveMenuAnim();
        });
        $("#dagViewContent")[0].addEventListener(window["transitionEnd"], function(event) {
            if (!$(event.target).is("#dagViewContent")) {
                return;
            }
            resolveMenuAnim();
        });
    };

    export function close(): void {
        closeMenu();
    };

    export function isMenuOpen(): boolean {
        return _isMenuOpen;
    };

    export function isPoppedOut(): boolean {
        return _popup ? !_popup.isDocked() : false;
    };

    export function openSection(sectionIndex: number): void {
        openMenu(sectionIndex);
    };

    export function openUDFMenuWithMainMenu(): void {
        openMenu(0, true);
    }

    function setupPopup(): void {
        _popup = new PopupPanel("bottomMenu", {
            draggableHeader: ".heading.draggable"
        });
        _popup
        .on("Undock", () => {
            _undock();
        })
        .on("Dock", () => {
            _dock();
        });


        let poppedOut: boolean = false;

        $bottomMenu.resizable({
            "handles": "w, e, s, n, nw, ne, sw, se",
            "minWidth": 290,
            "minHeight": 300,
            "containment": "document",
            "start": function() {
                $("#container").addClass("menuResizing");
                if (!$bottomMenu.hasClass("poppedOut")) {
                    poppedOut = false;
                } else {
                    poppedOut = true;
                }
            },
            "resize": function() {
                refreshEditor();

                if (!poppedOut) {
                    return;
                }
            },
            "stop": function() {
                $bottomMenu.css("max-width", "").css("max-height", "");
                let width: number = $bottomMenu.width();

                width = Math.min(width, $(window).width() - $("#menuBar").width() - 10);
                $bottomMenu.width(width);
                refreshEditor();
                $("#container").removeClass("menuResizing");
            }
        });
    }

    // setup buttons to open bottom menu
    function setupButtons(): void {
        $bottomMenu.on("click", ".close", function() {
            BottomMenu.close();
        });

        $("#bottomMenuBarTabs").on("click", ".sliderBtn", function(event) {
            if (!clickable) {
                return;
            }
            // XXX temp hack
            const $button = $(event.currentTarget);
            const id = $button.attr("id");
            if (id === "udfTab") {
                UDFPanel.Instance.toggleDisplay();
            } else if (id === "debugTab") {
                DebugPanel.Instance.toggleDisplay();
            }
            return
            // XXX end of temp hack
            toggleSection($(this).index("#bottomMenuBarTabs .sliderBtn"));
        });
    }

    function closeMenu() {
        $bottomMenu.removeClass("open");
        $("#container").removeClass("bottomMenuOpen");
        _isMenuOpen = false;
        // recenter table titles if on workspace panel
        $("#bottomMenuBarTabs .sliderBtn.active").removeClass("active");
        if (!isPoppedOut() && $("#sqlWorkSpacePanel").hasClass("active")) {
            checkAnimFinish()
            .then(function() {
                TblFunc.moveFirstColumn();
                DagCategoryBar.Instance.showOrHideArrows();
            });
        }
        if (isPoppedOut()) {
            _popup.toggleDock();
        }
    }

    function toggleSection(sectionIndex: number): void {
        if (sectionIndex == null) {
            sectionIndex = 0;
        }
        let hasAnim: boolean = true;

        const $menuSections: JQuery = $bottomMenu.find(".menuSection");
        // const $sliderBtns = $("#bottomMenuBarTabs .sliderBtn");
        const $section: JQuery = $menuSections.eq(sectionIndex);

        if ($bottomMenu.hasClass("open") && $section.hasClass("active")) {
            // section is active, close right side bar
            if (isPoppedOut()) {
                // disable closing if popped out
                return;
            } else {
                closeMenu();
            }
        } else {
            hasAnim = openMenu(sectionIndex);
        }

        // dealay the next click as the menu open/close has animation
        if (hasAnim) {
            clickable = false;
            $("#menuBar").addClass("animating");
            checkAnimFinish()
            .then(function() {
                $("#menuBar").removeClass("animating");
                clickable = true;
            });
        }
    }

    function openMenu(sectionIndex: number, fromMainMenu?: boolean): boolean {
        // bottom menu was closed or it was open and we"re switching to
        // this section
        const $menuSections: JQuery = $bottomMenu.find(".menuSection");
        const $sliderBtns: JQuery = $("#bottomMenuBarTabs .sliderBtn");
        const $section: JQuery = $menuSections.eq(sectionIndex);
        let hasAnim: boolean = true;

        const wasOpen: boolean = $bottomMenu.hasClass("open");
        $sliderBtns.removeClass("active");
        let $activeBtn = $sliderBtns.eq(sectionIndex)
        $activeBtn.addClass("active");

        if (fromMainMenu) {
            $bottomMenu.addClass("fromMainMenu");
            $activeBtn.addClass("fromMainMenu");
        } else {
            $bottomMenu.removeClass("fromMainMenu");
            $activeBtn.removeClass("fromMainMenu");
        }

        $bottomMenu.find(".bottomMenuContainer").show();

        $menuSections.removeClass("active");
        // mark the section and open the menu
        $section.addClass("active");

        $bottomMenu.addClass("open");
        $("#container").addClass("bottomMenuOpen");
        _isMenuOpen = true;
        // recenter table titles only if: on workspace panel,
        // main menu was not open && bottom menu was not open
        if (!wasOpen) {
            checkAnimFinish()
            .then(function() {
                MainMenu.sizeRightPanel();
                if ($("#sqlWorkSpacePanel").hasClass("active")) {
                    TblFunc.moveFirstColumn();
                    DagCategoryBar.Instance.showOrHideArrows();
                }
                if (sectionId ==="udfSection") {
                    $("#udfButtonWrap").removeClass("xc-hidden");
                    UDFPanel.Instance.getEditor().focus();
                }
            });
        } else {
            TblFunc.moveFirstColumn();
            DagCategoryBar.Instance.showOrHideArrows();
            hasAnim = false;
        }

        const sectionId: string = $section.attr("id");
        if (sectionId ==="udfSection") {
            $("#udfButtonWrap").removeClass("xc-hidden");
            UDFPanel.Instance.switchMode(false);
        } else {
            $("#udfButtonWrap").addClass("xc-hidden");
        }



        refreshEditor();
        return hasAnim;
    }

    function checkAnimFinish() {
        const menuAnimDeferred: XDDeferred<void> = PromiseHelper.deferred();
        menuAnimCheckers.push(menuAnimDeferred);
        return menuAnimDeferred.promise();
    }

    export function checkMenuAnimFinish(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        if (!$("#menuBar").hasClass("animating")) {
            deferred.resolve();
        } else {
            checkAnimFinish()
            .always(deferred.resolve);
        }

        return deferred.promise();
    }

    function _undock(): void {
        const offset: {left: number, top: number} = $bottomMenu.offset();
        $bottomMenu.css({
            "left": offset.left - 5,
            "top": offset.top - 5
        });
        $("#container").addClass("bottomMenuOut");

        if ($("#sqlWorkSpacePanel").hasClass("active")) {
            checkAnimFinish()
            .then(function() {
                TblFunc.moveFirstColumn();
                DagCategoryBar.Instance.showOrHideArrows();
            });
        }
    }

    function _dock(): void {
        $("#container").removeClass("bottomMenuOut");

        checkAnimFinish()
        .then(function() {
            MainMenu.sizeRightPanel();
            refreshEditor();
            if ($("#sqlWorkSpacePanel").hasClass("active")) {
                TblFunc.moveFirstColumn();
                DagCategoryBar.Instance.showOrHideArrows();
            }
        });
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
