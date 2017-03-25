window.ExtensionPanel = (function(ExtensionPanel, $) {
    var $panel;    // $("#extensionInstallPanel");
    var $extLists; // $("#extension-lists");
    var extSet;
    var isFirstTouch = true;

    ExtensionPanel.setup = function() {
        $panel = $("#extensionInstallPanel");
        $extLists = $("#extension-lists");

        $panel.on("click", ".item .more", function() {
            $(this).closest(".item").toggleClass("fullSize");
        });

        $panel.on("click", ".item .install", function() {
            var ext = getExtensionFromEle($(this).closest(".item"));
            installExtension(ext, $(this));
        });

        $panel.on("click", ".item .url", function() {
            var url = $(this).data("url");
            if (url == null) {
                return;
            } else {
                if (!url.startsWith("http:")) {
                    url = "http://" + url;
                }
                window.open(url);
            }
        });

        $("#extension-search").on("input", "input", function() {
            var searchKey = $(this).val().trim();
            refreshExtension(searchKey);
        });

        setupExtLists();
        UploadExtensionCard.setup();
    };

    ExtensionPanel.active = function() {
        if (isFirstTouch) {
            isFirstTouch = false;
            generateInstalledExtList()
            .always(function() {
                fetchData();
            });
        }
    };

    ExtensionPanel.imageError = function(ele) {
        var imgSrc = paths.XCExt;
        ele.src = imgSrc;
        var ext = getExtensionFromEle($(ele).closest(".item"));
        ext.setImage(imgSrc);
    };

    function setupExtLists() {
        if (Admin.isAdmin()) {
            $extLists.addClass("admin");
        }

        $extLists.on("click", ".listInfo", function() {
            $(this).closest(".listWrap").toggleClass("active");
        });

        $extLists.on("click", ".switch", function() {
            toggleExtension($(this));
        });

        $extLists.on("click", ".delete", function() {
            var $ext = $(this).closest(".item");
            removeExtension($ext);
        });

        $extLists.on("mousedown", ".item", function(event) {
            if (event.which !== 1) {
                return;
            }

            var $item = $(this);
            if ($item.hasClass("active")) {
                return;
            }

            $extLists.find(".item.active").removeClass("active");
            $item.addClass("active");
        });
    }

    function fetchData() {
        $panel.addClass("wait");
        var url = xcHelper.getAppUrl();
        $.ajax({
            "type": "POST",
            "dataType": "JSON",
            "url": url + "/listPackage",
            "success": function(data) {
                $panel.removeClass("wait");
                try {
                    var d = data;
                    initializeExtCategory(d);
                } catch (error) {
                    handleError(error);
                }
            },
            "error": function(error) {
                handleError(error);
            }
        });
    }

    function handleError(error) {
        console.error("get extension error", error);
        $panel.removeClass("wait").removeClass("hint").addClass("error");
    }

    function initializeExtCategory(extensions) {
        extSet = new ExtCategorySet();
        extensions = extensions || [];

        for (var i = 0, len = extensions.length; i < len; i++) {
            extSet.addExtension(extensions[i]);
        }

        refreshExtension();
    }

    function refreshExtension(searchKey) {
        var categoryList = extSet.getList();
        generateExtView(categoryList, searchKey);
    }

    function installExtension(ext, $submitBtn) {
        var url = xcHelper.getAppUrl();
        xcHelper.disableSubmit($submitBtn);
        $.ajax({
            "type": "POST",
            "dataType": "JSON",
            "url": url + "/downloadExtension",
            "data": {name: ext.getName(), version: ext.getVersion()},
        })
        .then(function(data) {
            // Now we need to enable after installing
            console.log(data);
            return enableExtension(ext.getName());
        })
        .then(function() {
            refreshAfterInstall(ext);
            xcHelper.enableSubmit($submitBtn);
            xcHelper.showSuccess(SuccessTStr.ExtDownload);
        })
        .fail(function(error) {
            Alert.error(ErrTStr.ExtDownloadFailure, JSON.stringify(error));
        })
        .always(function() {
            xcHelper.enableSubmit($submitBtn);
        });
    }

    function removeExtension($ext) {
        var url = xcHelper.getAppUrl();
        var extName = getExtNameFromList($ext);
        $ext.addClass("xc-disabled");

        $.ajax({
            "type": "POST",
            "dataType": "JSON",
            "url": url + "/removeExtension",
            "data": {"name": extName}
        })
        .then(function() {
            xcHelper.showSuccess(SuccessTStr.ExtRemove);
            $ext.remove();
            refreshAfterInstall();
        })
        .fail(function(error) {
            Alert.error(ErrTStr.ExtRemovalFailure, JSON.stringify(error));
            $ext.removeClass("xc-disabled");
        });
    }

    function toggleExtension($slider) {
        if ($slider.hasClass("unavailable")) {
            return;
        }

        var promise;
        var $ext = $slider.closest(".item");
        var extName = getExtNameFromList($ext);
        var enable;

        if ($slider.hasClass("on")) {
            enable = false;
            promise = disableExtension(extName);
        } else {
            enable = true;
            promise = enableExtension(extName);
        }

        $ext.addClass("xc-disabled");
        promise
        .then(function() {
            if (enable) {
                $slider.addClass("on");
                $ext.addClass("enabled");
            } else {
                $slider.removeClass("on");
                $ext.removeClass("enabled");
            }
            var msg = enable ? SuccessTStr.ExtEnable : SuccessTStr.ExtDisable;
            xcHelper.showSuccess(msg);
            refreshAfterInstall();
        })
        .fail(function(error) {
            var title = enable ? ErrTStr.ExtEnableFailure :
                                 ErrTStr.ExtDisableFailure;
            Alert.error(title, JSON.stringify(error));
        })
        .always(function() {
            $ext.removeClass("xc-disabled");
        });
    }

    function enableExtension(extName) {
        var deferred = jQuery.Deferred();
        var url = xcHelper.getAppUrl();
        $.ajax({
            "type": "POST",
            "dataType": "JSON",
            "url": url + "/enableExtension",
            "data": {name: extName},
            "success": function(data) {
                console.log(data);
                xcHelper.showSuccess(SuccessTStr.ExtEnable);
                deferred.resolve();
            },
            "error": function(error) {
                Alert.error(ErrTStr.ExtEnableFailure, JSON.stringify(error));
                deferred.reject();
            }
        });
        return deferred.promise();
    }

    function disableExtension(extName) {
        var deferred = jQuery.Deferred();
        var url = xcHelper.getAppUrl();
        $.ajax({
            "type": "POST",
            "dataType": "JSON",
            "url": url + "/disableExtension",
            "data": {name: extName},
            "success": function(data) {
                console.log(data);
                xcHelper.showSuccess(SuccessTStr.ExtDisable);
                deferred.resolve();
            },
            "error": function(error) {
                Alert.error(ErrTStr.ExtDisableFailure, JSON.stringify(error));
                deferred.reject();
            }
        });
        return deferred.promise();
    }

    function refreshAfterInstall() {
        $panel.addClass("refreshing");
        $extLists.addClass("refreshing");

        var promises = [];
        promises.push(ExtensionManager.install.bind(this));
        promises.push(generateInstalledExtList.bind(this));
        var promise = PromiseHelper.chain(promises);
        xcHelper.showRefreshIcon($panel, true, promise);

        promise
        .always(function() {
            $("#extension-search").val("");
            refreshExtension();
            $panel.removeClass("refreshing");
            $extLists.removeClass("refreshing");
        });
    }

    function getExtNameFromList($el) {
        return $el.find(".name").text();
    }

    function getExtensionFromEle($ext) {
        var extName = $ext.find(".extensionName").data("name");
        var category = $ext.closest(".category").find(".categoryName").text();
        var ext = extSet.getExtension(category, extName);
        return ext;
    }

    function generateInstalledExtList() {
        var deferred = jQuery.Deferred();
        var url = xcHelper.getAppUrl();
        $.ajax({
            "type": "POST",
            "dataType": "JSON",
            "url": url + "/getAvailableExtension",
            "success": function(data) {
                // {status: Status.Ok, extensionsAvailable: ["bizRules", "dev"]}
                try {
                    getInstalledExtListHTML(data.extensionsAvailable);
                    deferred.resolve();
                } catch (error) {
                    console.error(error);
                    handleExtListError();
                    deferred.reject(error);
                }
            },
            "error": function(error) {
                console.error(error);
                handleExtListError();
                deferred.reject(error);
            }
        });

        return deferred.promise();
    }

    function handleExtListError() {
        $extLists.html('<div class="error">' + ExtTStr.extListFail + '</div>');
    }

    function generateExtView(categoryList, searchKey) {
        var html = "";

        for (var i = 0, len = categoryList.length; i < len; i++) {
            html += getExtViewHTML(categoryList[i], searchKey);
        }

        if (html === "") {
            $panel.addClass("hint");
        } else {
            $panel.removeClass("hint").find(".category").remove()
                .end()
                .append(html);
        }
    }

    function getInstalledExtListHTML(extensions) {
        var extLen = extensions.length;
        // XXX this is a hack, which assume we only have 1 category
        var html = '<div class="listWrap xc-expand-list active">' +
                        '<div class="listInfo no-selection">' +
                            '<span class="expand">' +
                                '<i class="icon xi-arrow-down fa-7"></i>' +
                            '</span>' +
                            '<span class="text">' +
                              ExtTStr.XcCategory +
                              " (" + extLen + ")" +
                            '</span>' +
                        '</div>' +
                        '<ul class="itemList">';

        for (var i = 0, len = extLen; i < len; i++) {
            var enabled = "";
            var status = "";
            var extName = extensions[i];
            if (ExtensionManager.isExtensionEnabled(extName)) {
                enabled = "enabled";
                status = "on";
            }
            html += '<li class="item no-selection ' + enabled + '">' +
                        '<i class="icon xi-menu-extension fa-15"></i>' +
                        '<span class="name textOverflowOneLine">' +
                            extName +
                        '</span>' +
                        '<i class="delete icon xi-trash fa-15 xc-action"></i>' +
                        '<div class="xc-switch switch ' + status + '">' +
                            '<div class="slider"></div>' +
                        '</div>';
        }

        html += '</ul></div>';
        $extLists.html(html);
    }

    function getExtViewHTML(category, searchKey) {
        var extensions = category.getExtensionList(searchKey);
        var extLen = extensions.length;
        if (extLen === 0) {
            // no qualified category
            return "";
        }

        var html = '<div class="category cardContainer">' +
                    '<header class="cardHeader">' +
                        '<div class="title textOverflowOneLine categoryName">' +
                            category.getName() +
                        '</div>' +
                    '</header>' +
                    '<div class="cardMain items">';
        var imgEvent = 'onerror="ExtensionPanel.imageError(this)"';

        for (var i = 0; i < extLen; i++) {
            var ext = extensions[i];
            var btnText;

            if (ext.isInstalled()) {
                btnClass = "installed";
                btnText = ExtTStr.Installed;
            } else {
                btnClass = "";
                btnText = ExtTStr.Install;
            }

            var image = ext.getImage();
            html += '<div class="item">' +
                        '<section class="mainSection">' +
                        '<div class="leftPart">' +
                            '<div class="logoArea">' +
                                '<img src="data:image/png;base64,' +
                                image + '" ' + imgEvent + '>' +
                            '</div>' +
                            '<div class="instruction">' +
                                '<div class="extensionName textOverflowOneLine"' +
                                ' data-name="' + ext.getName() + '">' +
                                    ext.getMainName() +
                                '</div>' +
                                '<div class="author textOverflowOneLine">' +
                                    'By ' + ext.getAuthor() +
                                '</div>' +
                                '<div class="detail textOverflow">' +
                                    ext.getDescription() +
                                '</div>' +
                            '</div>' +
                        '</div>'+
                        '<div class="rightPart">' +
                            '<div class="buttonArea">' +
                                '<button class="btn install ' + btnClass + '">' +
                                    btnText +
                                '</button>' +
                                '<button class="btn btn-cancel more">' +
                                    '<span class="moreText">' +
                                        ExtTStr.More +
                                    '</span>' +
                                    '<span class="lessText">' +
                                        ExtTStr.Less +
                                    '</span>' +
                                '</button>' +
                            '</div>' +
                        '</div>' +
                        '</section>' +
                        '<section class="bottomSection clearfix">' +
                            '<div class="leftPart">' +
                                '<div class="detail">' +
                                    ext.getDescription() +
                                '</div>' +
                                '<div class="basicInfo">' +
                                    ExtTStr.Version + ': ' + ext.getVersion() +
                                    ' | ' + ExtTStr.extName + ': ' + ext.getName() +
                                    ' | ' + ExtTStr.Author + ': ' + ext.getAuthor() +
                                '</div>' +
                            '</div>' +
                            '<div class="rightPart">' +
                                '<a class="url" ' +
                                'href="mailto:customerportal@xcalar.com" ' +
                                'target="_top">' +
                                    ExtTStr.Report +
                                '</a>' +
                            '</div>' +
                        '</section>' +
                    '</div>';
        }

        html += '</div></div>';

        return html;
    }

    return (ExtensionPanel);
}({}, jQuery));
