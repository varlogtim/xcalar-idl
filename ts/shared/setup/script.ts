/*
    This file is where all the document.ready functions go.
    Any misc functions that kind of applies to the
    entire page and doesn't really have any specific purpose should come here as
    well.
*/
// ========================== Document Ready ==================================
function loadDynamicPath(): XDPromise<void> {
    const dynamicSrc: string = 'https://www.xcalar.com/xdscripts/dynamic.js';
    const randId: string = '' + Math.ceil(Math.random() * 100000);
    const src: string = dynamicSrc + '?r=' + randId;
    return $.getScript(src);
}

function checkHotPathEnable(): XDPromise<boolean> {
    const deferred: XDDeferred<boolean> = PromiseHelper.deferred();

    adminTools.getHotPatch()
        .then((res) => {
            if (res.hotPatchEnabled) {
                deferred.resolve();
            } else {
                console.info("Hot Patch is disabled");
                deferred.reject(null, true);
            }

        })
        .fail(() => {
            deferred.resolve(); // still  resolve it
        });

    return deferred.promise();
}

function hotPatch(): XDPromise<void> {
    const deferred: XDDeferred<void> = PromiseHelper.deferred();

    checkHotPathEnable()
        .then(() => {
            return loadDynamicPath();
        })
        .then(() => {
            try {
                if (typeof XCPatch.patch !== 'undefined') {
                    const promise: XDPromise<void> | null = XCPatch.patch();
                    if (promise != null) {
                        return promise;
                    }
                }
            } catch (e) {
                console.error(e);
            }
        })
        .then(deferred.resolve)
        .fail((error, isHotPatchDisabled) => {
            if (!isHotPatchDisabled) {
                console.error("failed to get script", error);
            }
            deferred.resolve(); // still resolve it
        });

    return deferred.promise();
}

function documentReadyIndexFunction(): void {
    $(document).ready(() => {
        hotPatch()
            .then(xcManager.setup);
    });
}