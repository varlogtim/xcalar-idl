window.ExtensionPanel = (function(ExtensionPanel, $) {
    var $panel;    // $("#extensionInstallPanel");
    var $extLists; // $("#extension-lists");
    var extSet;
    var isFirstTouch = true;
    var extInInstall = null;

    ExtensionPanel.setup = function() {
        $panel = $("#extensionInstallPanel");
        $extLists = $("#extension-lists");

        $("#refreshExt").click(function() {
            refreshAfterInstall();
        });

        $panel.on("click", ".item .more", function() {
            $(this).closest(".item").toggleClass("fullSize");
        });

        $panel.on("click", ".item .install", function() {
            var ext = getExtensionFromEle($(this).closest(".item"));
            installExtension(ext, $(this));
        });

        $panel.on("click", ".item .website", function() {
            var url = $(this).data("url");
            if (url == null) {
                return;
            } else {
                if (!url.startsWith("http:") && !url.startsWith("https:")) {
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
            $panel.addClass("admin");
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
            var $target = $(event.target);
            // scroll to extension in right card if found
            if (!$target.closest(".delete, .switch").length) {
                var name = getExtNameFromList($item);
                var $cardItem = $panel.find(".item .extensionName[data-name='" +
                                            name + "']").closest(".item");
                if ($cardItem.length) {
                    var $container = $("#monitorPanel").find(".mainContent");
                    var cardTop = $container.offset().top +
                                  $panel.find(".cardHeader").height();
                    var itemTop = $container.scrollTop() +
                                   $cardItem.position().top - cardTop;
                    $container.animate({scrollTop: itemTop}, 300);
                }
            }

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
            "type": "GET",
            "dataType": "JSON",
            "url": url + "/extension/listPackage",
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
        xcHelper.toggleBtnInProgress($submitBtn);

        extInInstall = ext.getName();
        $.ajax({
            "type": "POST",
            "dataType": "JSON",
            "url": url + "/extension/download",
            "data": {name: ext.getName(), version: ext.getVersion()},
        })
        .then(function() {
            // Now we need to enable after installing
            // console.log(data);
            return enableExtension(ext.getName());
        })
        .then(function() {
            // need to toggle back progress then can the text be changed
            xcHelper.toggleBtnInProgress($submitBtn);
            if (extInInstall === ext.getName()) {
                refreshAfterInstall();
                xcHelper.showSuccess(SuccessTStr.ExtDownload);
            } else {
                $submitBtn.addClass("installed").text(ExtTStr.Installed);
            }
        })
        .fail(function(error) {
            xcHelper.toggleBtnInProgress($submitBtn);
            Alert.error(ErrTStr.ExtDownloadFailure, JSON.stringify(error));
        });
    }

    function removeExtension($ext) {
        var url = xcHelper.getAppUrl();
        var extName = getExtNameFromList($ext);
        $ext.addClass("xc-disabled");

        $.ajax({
            "type": "DELETE",
            "dataType": "JSON",
            "url": url + "/extension/remove",
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
        var deferred = PromiseHelper.deferred();
        var url = xcHelper.getAppUrl();
        $.ajax({
            "type": "POST",
            "dataType": "JSON",
            "url": url + "/extension/enable",
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
        var deferred = PromiseHelper.deferred();
        var url = xcHelper.getAppUrl();
        $.ajax({
            "type": "POST",
            "dataType": "JSON",
            "url": url + "/extension/disable",
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
        // $panel.addClass("refreshing");
        $extLists.addClass("refreshing");

        var promises = [];
        promises.push(ExtensionManager.install.bind(this));
        promises.push(generateInstalledExtList.bind(this));
        var promise = PromiseHelper.chain(promises);
        xcHelper.showRefreshIcon($extLists, true, promise);

        promise
        .always(function() {
            $("#extension-search").val("");
            refreshExtension();
            // $panel.removeClass("refreshing");
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
        var deferred = PromiseHelper.deferred();
        var url = xcHelper.getAppUrl();
        $.ajax({
            "type": "GET",
            "dataType": "JSON",
            "url": url + "/extension/getAvailable",
            "success": function(data) {
                // {status: Status.Ok, extensionsAvailable: ["bizRules", "dev"]}
                var passed = false;
                var err;
                try {
                    getInstalledExtListHTML(data.extensionsAvailable);
                    passed = true;
                } catch (error) {
                    console.error(error);
                    handleExtListError();
                    err = error;
                }
                if (passed) {
                    deferred.resolve();
                } else {
                    deferred.reject(err);
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
            var icon = '<i class="icon xi-menu-extension fa-15"></i>';
            if (ExtensionManager.isExtensionEnabled(extName)) {
                enabled = "enabled";
                status = "on";

                if (!ExtensionManager.isInstalled(extName)) {
                    var error = ExtensionManager.getInstallError(extName);
                    icon = '<i class="icon xi-critical fa-15 hasError"' +
                            ' data-toggle="tooltip"' +
                            ' data-container="body"' +
                            ' data-placement="right"' +
                            ' data-title="' + error + '"></i>';
                }
            }

            html += '<li class="item no-selection ' + enabled + '">' +
                        icon +
                        '<span class="name textOverflowOneLine">' +
                            extName +
                        '</span>' +
                        '<i class="adminOnly delete icon xi-trash fa-15 ' +
                        'xc-action"></i>' +
                        '<div class="adminOnly xc-switch switch ' + status +
                        '">' +
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
            var website = ext.getWebsite();
            var websiteEle = "";

            if (ext.isInstalled()) {
                btnClass = "installed";
                btnText = ExtTStr.Installed;
            } else {
                btnClass = "";
                btnText = ExtTStr.Install;
            }

            if (website) {
                websiteEle = '<a class="website url" ' +
                            'data-url="' + website + '">' +
                                ExtTStr.WEBSITE +
                            '</a>';
            } else {
                websiteEle = "";
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
                                websiteEle +
                                '<a class="url" ' +
                                'onclick="window.open(\'mailto:customerportal@xcalar.com\')" ' +
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
