
class ExtItem {
    private appName: string;
    private version: string;
    private XDVersion: string;
    private description: string;
    private author: string;
    private main: string;
    // XXX quick hack, if we later want to have multiple category
    // then keep the structure, otherwise, can refactor to remove
    // category related code
    private category: string;
    private link: string;

    public constructor(options) {
        options = options || {};
        this.appName = options.appName;
        this.version = options.version;
        this.description = options.description;
        this.author = options.author;
        this.main = options.main;
        // XXX quick hack, if we later want to have multiple category
        // then keep the structure, otherwise, can refactor to remove
        // category related code
        this.category = options.category || ExtTStr.XcCategory;
        this.XDVersion = options.XDVersion;
        this.link = options.website;
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
        // XXX TODO: remove this hack
        let category = this.category;
        if (category === "Import") {
            category = "Imports";
        } else if (category === "Advanced Mode") {
            category = "Developer Mode";
        }
        return category;
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

    public getLink(): string {
        return this.link;
    }

    public getImage(): string {
        let category = this.getCategory();
        switch (category) {
            case "System":
                return "xi-system";
            case "Imports":
                return "xi-data-in";
            case "Export/Publish":
                return "xi-data-out";
            case "SQL Mode":
                return "xi-SQLworkspace";
            case "Developer Mode":
                return "xi-dfg2";
            default:
                return "xi-power";
        }
    }
}