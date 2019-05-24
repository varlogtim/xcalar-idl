// XXX TODO: rename or clean up this file
class Authentication {
    private static uid: XcUID;

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
}