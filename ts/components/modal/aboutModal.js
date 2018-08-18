window.AboutModal = (function($, AboutModal) {
    var $modal;  // $("#aboutModal");
    var modalHelper;

    AboutModal.setup = function() {
        $modal = $("#aboutModal");
        modalHelper = new ModalHelper($modal, {
            "noResize": true,
            "noBackground": true,
            "center": {"verticalQuartile": true}
        });

        xcTooltip.add($modal.find(".iconWrapper"), {"title": TooltipTStr.AboutCopy});

        $modal.on("click", ".close", closeModal);
        $modal.on("click", ".iconWrapper", function() {
            xcHelper.copyToClipboard($(this).closest(".textRow")
                                            .find(".value").text());
            xcTooltip.changeText($(this), TooltipTStr.AboutCopied);
            xcTooltip.refresh($(this), 1000);
            var self = this;
            setTimeout(function() {
                xcTooltip.changeText($(self), TooltipTStr.AboutCopy);
            }, 1000);
        })
    };

    AboutModal.show = function() {
        modalHelper.setup();

        // There are 4 variables here, 2 of which must match in order to talk
        // gGitVersion is populated in prodBuilds
        var frontVersion = XVM.getVersion();
        var frontVers = frontVersion.substring(0,
                             frontVersion.lastIndexOf("-")) + "-" + gGitVersion;
        var buildNumber = XVM.getBuildNumber() + XVM.getPatchVersion();
        var expiration = XVM.getLicenseExipreInfo();
        var licensee = XVM.getLicensee();
        var capitalize = xcHelper.capitalize(XVM.getLicenseMode());
        var numServers = XVM.getNumServers();
        var numUsers = XVM.getNumUsers();
        var license = XVM.getLicense();

        // Build
        $modal.find(".product")
            .text("Xcalar Data Platform - Enterprise Edition");
        $modal.find(".frontVersion").text(frontVers);
        $modal.find(".buildNumber").text(buildNumber);
        // License
        $modal.find(".licensee").text(licensee);
        $modal.find(".expiration").text(expiration);
        $modal.find(".numServers").text(numServers);
        $modal.find(".numUsers").text(numUsers);
        $modal.find(".keyValue").text(license);
        
    };

    function closeModal() {
        modalHelper.clear();
    }

    return (AboutModal);
}(jQuery, {}));
