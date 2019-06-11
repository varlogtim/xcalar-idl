class ExtensionLoader {
    private _container: string;
    private _event: XcEvent;
    private _enabledHTMLStr: string;

    public constructor(container) {
        this._container = container;
        this._event = new XcEvent();
        this._enabledHTMLStr = "";
    }

    public on(event, callback): ExtensionLoader {
        this._event.addEventListener(event, callback);
        return this;
    }

    public getEnabledList(): XDPromise<string> {
        return this._getEnabledExtList(false);
    }

    public isExtensionEnabled(extName: string): boolean {
        if (!this._enabledHTMLStr) {
            return false;
        }
        let name: string = extName + ".ext.js";
        return this._enabledHTMLStr.includes(name);
    }

    public install(): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();

        this._initInstall();

        this.getEnabledList()
        .then((enabledExtHTMl) => {
            return this._loadExtensions(enabledExtHTMl);
        })
        .then(() => {
            deferred.resolve();
        })
        .fail((error) => {
            console.error("install extension fails", error);
            deferred.resolve(); // still resolve it
        });

        return deferred.promise();
    }

    public request(json: object): XDPromise<any> {
        let deferred: XDDeferred<any> = PromiseHelper.deferred();
        HTTPService.Instance.ajax(json)
        .then((...args) => {
            try {
                let res = args[0];
                if (res.status === Status.Error) {
                    deferred.reject(res.error);
                } else {
                    deferred.resolve(...args);
                }
            } catch (e) {
                console.error(e);
                deferred.resolve(...args);
            }
        })
        .fail((error) => {
            deferred.reject(JSON.stringify(error));
        });

        return deferred.promise();
    }

    public refresh(): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        this._getEnabledExtList(true)
        .then(() => {
            return this.install();
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    private _getContainer(): JQuery {
        return $(`#${this._container}`);
    }

    private _getEnabledExtList(reset: boolean): XDPromise<string> {
        if (!reset && this._enabledHTMLStr) {
            return PromiseHelper.resolve(this._enabledHTMLStr);
        }

        let deferred: XDDeferred<string> = PromiseHelper.deferred();
        let url = xcHelper.getAppUrl();
        this.request({
            "type": "GET",
            "dataType": "JSON",
            "url": url + "/extension/getEnabled",
        })
        .then((data) => {
            if (data.status === Status.Ok) {
                this._enabledHTMLStr = data.data;
                deferred.resolve(this._enabledHTMLStr);
            } else {
                console.error("Failed to get enabled extension");
                this._enabledHTMLStr = "";
                deferred.reject();
            }
        })
        .fail((error) => {
            this._enabledHTMLStr = "";
            deferred.reject(error);
        });

        return deferred.promise();
    }

    private _initInstall(): void {
        // extensions.html should be autopopulated by the backend
        this._getContainer().empty(); // Clean up for idempotency
        // change to async call later
        // jquery 3 should not need it
        $.ajaxPrefilter("script", function(options) {
            // only apply when it's loading extension
            if (options.url.indexOf("assets/extensions/") >= 0) {
                options.async = true;
            }
        });
    }

    private _loadExtensions(htmlString: string): XDPromise<void> {
        if (!htmlString) {
            console.error("Failed to get extensions");
            return PromiseHelper.resolve();
        }

        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        let promises = [];
        let $tag = $('<div>' + htmlString + '</div>');
        $tag.find("script").each((_index, el) => {
            let $script = $(el);
            promises.push(this._loadScript($script));
        });

        PromiseHelper.when(...promises)
        .then(() => {
            return this._loadUDFs();
        })
        .then(() => {
            this._event.dispatchEvent("loadFinish");
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    private _loadScript($script: JQuery): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        let src = $script.attr("src");
        let extName = this._parseExtensionNameFromSrc(src);
        this._event.dispatchEvent("beforeLoadScript", extName);

        $.getScript(src)
        .then(() => {
            this._getContainer().append($script);
            this._event.dispatchEvent("afterLoadScript", extName);
            deferred.resolve();
        })
        .fail((err) => {
            let error;
            try {
                if (err.status === 404) {
                    error = ExtTStr.NoScript;
                } else if (err.status === 200) {
                    error = ExtTStr.ParseFail;
                } else {
                    error = ExtTStr.LoadScriptFail;
                }
            } catch (e) {
                console.error(e);
                error = ExtTStr.LoadScriptFail;
            }

            console.error(error, src + " could not be loaded.");
            this._event.dispatchEvent("failLoadScript", extName, error);
            deferred.resolve(); // still resolve it
        });

        return deferred.promise();
    }

    private _loadUDFs(): XDPromise<void> {
        // check that python modules have been uploaded
        let extNames: string[] = this._event.dispatchEvent("getLoadedExtension");
        let promises: XDPromise<void>[] = extNames.map((extName) => {
            return this._loadAndStorePython(extName);
        });

        let promise = PromiseHelper.when(...promises);
        // always resolve the promise, even if extPromises is empty.
        return PromiseHelper.alwaysResolve(promise);
    }

    private _parseExtensionNameFromSrc(src: string): string | null {
        // src format: assets/extensions/ext-enabled/dev.ext.js
        let res: string = null;
        try {
            let start = src.lastIndexOf("/") + 1;
            let end = src.lastIndexOf(".ext.js");
            res = src.substring(start, end);
        } catch (error) {
            console.error(error);
        }
        return res;
    }

    private _loadAndStorePython(extName: string): XDPromise<void> {
        // python name need to be lowercase
        let moduleName: string = extName.toLowerCase();
        let deferred: XDDeferred<void> = PromiseHelper.deferred();

        HTTPService.Instance.ajax({
            type: "GET",
            url: "assets/extensions/ext-enabled/" + extName + ".ext.py"
        })
        .then((data) => {
            // Success case
            return this._uploadPython(moduleName, data);
        })
        .then(() => {
            this._event.dispatchEvent("afterLoadUDF", extName);
            deferred.resolve();
        })
        .fail((error) => {
            console.error("Extension", extName, "failed to upload", error);
            this._event.dispatchEvent("failLoadUDF", extName);
            deferred.resolve(); // still resolve it
        });
        return deferred.promise();
    }

    private _uploadPython(moduleName: string, data: string): XDPromise<void> {
        // only upload non-empty python
        if (this._isEmptyPython(data)) {
            return PromiseHelper.resolve();
        }

        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        // upload to shared space
        let udfPath: string = UDFFileManager.Instance.getSharedUDFPath() + moduleName;
        let upload: boolean = false;
        XcalarListXdfs(udfPath + "*", "User*")
        .then((res) => {
            try {
                if (res.numXdfs === 0) {
                    // udf not already exist
                    upload = true;
                    return XcalarUploadPython(udfPath, data, true, true);
                }
            } catch (e) {
                return PromiseHelper.reject(e.message);
            }
        })
        .then(() => {
            if (upload) {
                UDFFileManager.Instance.storePython(moduleName, data);
            }
            deferred.resolve();
        })
        .fail((error) => {
            if (typeof error === "object" &&
                error.status === StatusT.StatusUdfModuleInUse)
            {
                // udf in use case, don't faill the promise
                deferred.resolve();
            } else {
                deferred.reject(error);
            }
        });

        return deferred.promise();
    }

    private _isEmptyPython(data: string): boolean {
        return (data == null || data === "");
    }
}