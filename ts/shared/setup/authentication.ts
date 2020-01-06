// XXX TODO: rename or clean up this file
class Authentication {
    private static uid: XcUID;
    private static keyMap = {};

    /**
     * Authentication.getCount
     */
    public static getCount(): number {
        return this._getUId().count;
    }

    /**
     * Authentication.getHashId
     */
    public static getHashId(excludeHash?: boolean): string {
        const idCount: string = this._getUId().gen();
        if (excludeHash) {
            return (idCount + '');
        } else {
            return ("#" + idCount);
        }
    }

    /**
     * Authentication.getTableId
     */
    public static getTableId(key = null): string {
        const idCount: string = this._getTableUid(key).gen();
        return ("#" + idCount);
    }

    private static _getUId(): XcUID {
        if (this.uid == null) {
            // Note that . and - is not good for HTML rendering reason
            // so here the choice is _
            this.uid = new XcUID("t");
            this.uid.setGenerator((prefix: string, count: number): string => {
                return prefix + "_" + new Date().getTime() + "_" + count;
            });
        }
        return this.uid;
    }

    private static _getTableUid(key): XcUID {
        let uid: XcUID = this.keyMap[key];
        if (uid == null) {
            uid = new XcUID("v");
            uid.setGenerator((prefix: string, count: number): string => {
                const date = new Date();
                return prefix + "_" + count + "_" +
                        date.getUTCFullYear() + "-" +
                        (date.getUTCMonth() + 1) + "-" +
                        date.getUTCDate() + "T" +
                        date.getUTCHours() +
                        date.getUTCMinutes() +
                        date.getUTCSeconds() + "Z";
            });
        }
        this.keyMap[key] = uid;
        return uid;
    }
}