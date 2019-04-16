// XXX TODO: clean it up to only use UserPrefDurable
class UserInfo extends Durable {
    private gDSObj: DSDurable; // datasets meta
    private userpreference: UserPref; // user preference meta

    constructor(options: UserInfoDurable) {
        options = options || <UserInfoDurable>{};
        super(options.version);

        this.gDSObj = options.gDSObj;
        let userpreference = options.userpreference || <UserPrefDurable>{};
        this.userpreference = new UserPref(userpreference);
    }

    public update(): void {
        this.gDSObj = DS.getHomeDir(true);
        this.userpreference = UserSettings.getAllPrefs();
    }

    public getPrefInfo() {
        return this.userpreference;
    }

    public getDSInfo() {
        return this.gDSObj;
    }

    // not used
    public serialize(): string {
        return null;
    }

    // not used
    protected _getDurable() {
        return null;
    }
}