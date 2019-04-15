
interface ExtItemOptions {
    appName: string;
    version: string;
    description: string;
    author: string;
    image: string;
    main: string;
    website: string;
}

/* Extension Panel */
class ExtItem {
    private appName: string;
    private version: string;
    private XDVersion: string;
    private description: string;
    private author: string;
    private image: string;
    private main: string;
    private website: string;
    // XXX quick hack, if we later want to have multiple category
    // then keep the structure, otherwise, can refactor to remove
    // category related code
    private category: string;

    public constructor(options) {
        options = options || {};
        this.appName = options.appName;
        this.version = options.version;
        this.description = options.description;
        this.author = options.author;
        this.image = options.image;
        this.main = options.main;
        this.website = options.website;
        // XXX quick hack, if we later want to have multiple category
        // then keep the structure, otherwise, can refactor to remove
        // category related code
        this.category = options.category || ExtTStr.XcCategory;
        this.XDVersion = options.XDVersion;
    }

    public getName(): string {
        return this.appName;
    }

    public getMainName(): string {
        const name: string = this.getName();
        if (this.main) {
            return this.main + " (" + name + ")";
        } else {
            return name;
        }
    }

    public getCategory(): string {
        return this.category;
    }

    public getAuthor(): string {
        return this.author || "N/A";
    }

    public getDescription(): string {
        return this.description || "";
    }

    public getVersion(): string {
        return this.version || "N/A";
    }

    public getXDVersion(): string {
        return this.XDVersion || "N/A";
    }

    public getImage(): string {
        if (this.image == null) {
            return "";
        }

        return this.image;
    }

    public setImage(newImage): void {
        this.image = newImage;
    }

    public getWebsite(): string {
        return this.website;
    }

    public isInstalled(): boolean {
        const $extLists: JQuery = $("#extension-lists");
        if ($extLists.find(".error").length) {
            return this.__findInstallFindScript();
        } else {
            const name: string = this.getName();
            const $li: JQuery = $extLists.find(".item").filter(function() {
                return $(this).find(".name").text() === name;
            });
            return ($li.length > 0);
        }
    }

    private __findInstallFindScript(): boolean {
        let exist: boolean = false;
        const name: string = this.getName() + ".ext.js";

        $("#extension-ops-script script").each(function() {
            const src: string = $(this).attr("src");
            if (src && src.includes(name)) {
                exist = true;
                // end loop
                return false;
            }
        });
        return exist;
    }
}

class ExtCategory {
    private name: string;
    private extensions: {[extName: string]: ExtItem};

    public constructor(categoryName) {
        this.name = categoryName;
        this.extensions = {};
    }

    public getName(): string {
        return this.name;
    }

    public getExtension(extName): ExtItem {
        return this.extensions[extName];
    }

    public hasExtension(extName: string): boolean {
        return this.extensions.hasOwnProperty(extName);
    }

    public addExtension(extension: ExtItem): boolean {
        const extName: string = extension.getName();
        if (extName == null || this.hasExtension(extName)) {
            console.error("Duplicated extension");
            return false;
        }

        this.extensions[extName] = extension;
        return true;
    }

    public getExtensionList(searchKey?: string): ExtItem[] {
        searchKey = searchKey || "";
        searchKey = xcStringHelper.escapeRegExp(searchKey);
        const extensions = this.extensions;
        type Tuple = [ExtItem, string]
        let listToSort: Tuple[] = [];
        const regExp: RegExp = new RegExp(searchKey, "i");
        for (const extName in extensions) {
            if (!regExp.test(extName)) {
                continue;
            }
            listToSort.push([extensions[extName], extName]);
        }

        // sort by extension name
        listToSort.sort(function(a, b) {
            return (a[1].localeCompare(b[1]));
        });

        let resList: ExtItem[] = [];
        listToSort.forEach(function(res) {
            resList.push(res[0]);
        });

        return resList;
    }

    public getAvailableExtensionList(): ExtItem[] {
        const list: ExtItem[] = this.getExtensionList();
        let resList: ExtItem[] = [];
        for (let i = 0, len = list.length; i < len; i++) {
            const extension: ExtItem = list[i];
            if (extension.isInstalled()) {
                resList.push(extension);
            }
        }
        return resList;
    }
}

class ExtCategorySet {
    private set: {[categoryName: string]: ExtCategory};

    public constructor() {
        this.set = {};
    }

    public get(categoryName: string): ExtCategory {
        categoryName = categoryName.toLowerCase();
        return this.set[categoryName];
    }

    public has(categoryName: string): boolean {
        categoryName = categoryName.toLowerCase();
        return this.set.hasOwnProperty(categoryName);
    }

    public addExtension(data: object): void {
        const extension: ExtItem = new ExtItem(data);
        let categoryName: string = extension.getCategory() || ExtTStr.XcCategory;
        categoryName = categoryName.toLowerCase();
        let extCategory: ExtCategory;

        if (this.has(categoryName)) {
            extCategory = this.get(categoryName);
        } else {
            extCategory = new ExtCategory(categoryName);
            this.set[categoryName] = extCategory;
        }
        extCategory.addExtension(extension);
    }

    public getExtension(categoryName: string, extensionName: string): ExtItem {
        categoryName = categoryName.toLowerCase();
        if (!this.has(categoryName)) {
            return null;
        }

        const category: ExtCategory = this.get(categoryName);
        return category.getExtension(extensionName);
    }

    public getList(): ExtCategory[] {
        const set: {[categoryName: string]: ExtCategory} = this.set;
        type Tuple = [ExtCategory, string]
        let listToSort: Tuple[] = [];
        for (const categoryName in set) {
            listToSort.push([set[categoryName], categoryName]);
        }

        // sort by category
        listToSort.sort(function(a, b) {
            return (a[1].localeCompare(b[1]));
        });

        let resList: ExtCategory[] = [];
        listToSort.forEach(function(res) {
            resList.push(res[0]);
        });

        return resList;
    }
}

/* End of Extension Panel */