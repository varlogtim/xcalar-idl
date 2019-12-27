class AboutModal {
    private static _instance: AboutModal;
    private _modalHelper: ModalHelper;

    public static get Instance(): AboutModal {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
        const $modal: JQuery = this._getModal();
        if (XVM.isCloud() || XVM.isDataMart()) {
            $modal.addClass("noLicense");
        } else {
            $modal.removeClass("noLicense");
        }
        this._modalHelper = new ModalHelper($modal, {
            noResize: true,
            noBackground: true,
            center: {verticalQuartile: true}
        });

        xcTooltip.add($modal.find(".iconWrapper"), {
            title: TooltipTStr.AboutCopy
        });

        $modal.on("click", ".close", () => {
            this._close();
        });
        $modal.on("click", ".iconWrapper", (event) => {
            const $el: JQuery = $(event.currentTarget);
            xcUIHelper.copyToClipboard($el.closest(".textRow")
                                            .find(".value").text());
            xcTooltip.changeText($el, TooltipTStr.AboutCopied);
            xcTooltip.refresh($el, 1000);
            setTimeout(() => {
                xcTooltip.changeText($el, TooltipTStr.AboutCopy);
            }, 1000);
        });

        $modal.on("copy", () => {
            var text = window.getSelection().toString();
            xcUIHelper.copyToClipboard(text); // changes font color from white to black
            return false;
        });
    }

    public show(): void {
        this._modalHelper.setup();
        const $modal: JQuery = this._getModal();
        // There are 4 variables here, 2 of which must match in order to talk
        // gGitVersion is populated in prodBuilds
        
        // Build
        const frontVersion = XVM.getVersion();
        const frontVers = frontVersion.substring(0,
                             frontVersion.lastIndexOf("-")) + "-" + gGitVersion;
        const buildNumber = XVM.getBuildNumber() + XVM.getPatchVersion();
        $modal.find(".product")
            .text("Xcalar Data Platform - Enterprise Edition");
        $modal.find(".frontVersion").text(frontVers);
        $modal.find(".buildNumber").text(buildNumber);
        
        if (XVM.isCloud() || XVM.isDataMart()) {
            $modal.addClass("noLicense");
            $modal.find(".licensee").text("");
            $modal.find(".expiration").text("");
            $modal.find(".numServers").text("");
            $modal.find(".numUsers").text("");
            $modal.find(".keyValue").text("");
        } else {
            $modal.removeClass("noLicense");
             // License
            const expiration = XVM.getLicenseExipreInfo();
            const licensee = XVM.getLicensee();
            const numServers = XVM.getNumServers();
            const numUsers = XVM.getNumUsers();
            const license = XVM.getLicense();
            
            $modal.find(".licensee").text(licensee);
            $modal.find(".expiration").text(expiration);
            $modal.find(".numServers").text(numServers);
            $modal.find(".numUsers").text(numUsers);
            $modal.find(".keyValue").text(license);
        }
    }

    private _getModal(): JQuery {
        return $("#aboutModal");
    }

    private _close() {
        this._modalHelper.clear();
    }
}
