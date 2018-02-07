window.DSInfoModal = (function(DSInfoModal, $) {
    var $modal;  // $("#dsInfoModal");
    var modalHelper;

    DSInfoModal.setup = function() {
        $modal = $("#dsInfoModal");

        modalHelper = new ModalHelper($modal, {
            "noBackground": true,
            "noCenter": true,
            "sizeToDefault": true
        });

        $modal.on("click", ".close", closeModal);

        $modal.on("mouseenter", ".tooltipOverflow", function() {
            xcTooltip.auto(this);
        });
    };

    DSInfoModal.show = function(dsId) {
        modalHelper.setup();
        positionModal(dsId);
        showDSInfo(dsId);
        $(document).on("mouseup.dsInfoModal", function(event) {
            if ($(event.target).closest("#dsInfoModal").length === 0) {
                closeModal();
                $(document).off("mouseup.dsInfoModal");
            }
        });
    };

    function positionModal(dsId) {
        var $grid = DS.getGrid(dsId);
        var rect = $grid.get(0).getBoundingClientRect();
        var top = Math.max(20, rect.top);
        var left = rect.right + 5;
        $modal.css({
            "top": top,
            "left": left
        });
    }

    function showDSInfo(dsId) {
        var $section = $modal.find(".infoSection");
        var dsObj = DS.getDSObj(dsId);

        var d1 = addBasicInfo($section.find(".name .content"), dsObj.getName());
        var d2 = addBasicInfo($section.find(".owner .content"), dsObj.getUser());
        addUsedByInfo(dsObj.getFullName());
        adjustModalWidth(Math.max(d1, d2));
    }

    function adjustModalWidth(delta) {
        delta = Math.min(Math.max(delta, 0), 350);
        $modal.width($modal.width() + delta);
    }

    function addUsedByInfo(dsName) {
        var deferred = jQuery.Deferred();
        var $userList = $modal.find(".infoSection .user .content");

        $modal.addClass("fetching");
        addWaitingSection($userList);
        XcalarGetDatasetUsers(dsName)
        .then(function(users) {
            addUserList($userList, users);
            deferred.resolve();
        })
        .fail(function(error) {
            addUserList($userList);
            deferred.reject(error);
        })
        .always(function() {
            $modal.removeClass("fetching");
        });

        return deferred.promise();
    }

    function addBasicInfo($section, val) {
        $section.text(val);
        xcTooltip.changeText($section, val);

        var textWidth = xcHelper.getTextWidth($section, val) + 5;
        var sectionWidth = $section.width();
        return Math.max(textWidth - sectionWidth, 0); // the delta width
    }

    function addUserList($userList, users) {
        var html;
        if (users == null) {
            // error case
            html = "N/A";
        } else if (users.length === 0) {
            html = "--";
        } else {
            html = '<ul>' +
                        users.map(function(user) {
                            var name = user.userId.userIdName;
                            var li =
                                '<li class="tooltipOverflow" ' +
                                'data-toggle="tooltip ' +
                                'data-container="body" ' +
                                'data-placement="top" ' +
                                'data-title="' + name + '">' +
                                    name +
                                '</li>';
                            return li;
                        }).join("") +
                    '</ul>';
        }
        $userList.html(html);
    }

    function addWaitingSection($section) {
        var html = '<div class="animatedEllipsisWrapper">' +
                        '<div class="animatedEllipsis">' +
                            '<div>.</div>' +
                            '<div>.</div>' +
                            '<div>.</div>' +
                        '</div>' +
                    '</div>';
        $section.html(html);
    }

    function closeModal() {
        modalHelper.clear();
    }

    return DSInfoModal;
}({}, jQuery));