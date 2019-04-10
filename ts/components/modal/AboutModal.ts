class AboutModal {
    private static _instance: AboutModal;
    private _modalHelper: ModalHelper;

    public static get Instance(): AboutModal {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
        const $modal: JQuery = this._getModal();
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
        })
    }

    public show(): void {
        this._modalHelper.setup();

        // There are 4 variables here, 2 of which must match in order to talk
        // gGitVersion is populated in prodBuilds
        const frontVersion = XVM.getVersion();
        const frontVers = frontVersion.substring(0,
                             frontVersion.lastIndexOf("-")) + "-" + gGitVersion;
        const buildNumber = XVM.getBuildNumber() + XVM.getPatchVersion();
        const expiration = XVM.getLicenseExipreInfo();
        const licensee = XVM.getLicensee();
        const numServers = XVM.getNumServers();
        const numUsers = XVM.getNumUsers();
        const license = XVM.getLicense();

        // Build
        const $modal: JQuery = this._getModal();
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

    private _getModal(): JQuery {
        return $("#aboutModal");
    }

    private _close() {
        this._modalHelper.clear();
    }
}
