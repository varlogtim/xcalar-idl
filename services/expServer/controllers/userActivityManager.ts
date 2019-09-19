import socket from "../controllers/socket";
import cloudManager from "../controllers/cloudManager";
import * as xcConsole from "../utils/expServerXcConsole";

// tracks user activity, receives updates from transactionManager and from XD's
// post request
class UserActivityManager {
    private static _instance = null;
    public static get getInstance(): UserActivityManager {
        return this._instance || (this._instance = new this());
    }

    private _inactivityTime = 25 * 60 * 1000; // amount of time to be considered inactive
    private _logoutWarningTime = 60 * 1000; // user is warned that they have 1 minute before logged out
    private _activityTimer; // {setTimeout}
    private _logoutTimer; // {setTimeout} 1 minute timer set when user has been
    // idle for 30 minutes. Will log out at the end of 1 minute.

    public updateUserActivity() {
        this._restartActivityTimer();
    }

    public stopActivityTimer() {
        clearTimeout(this._activityTimer);
        clearTimeout(this._logoutTimer);
    }

    // resets a countdown timer, if not reset again for another 25 minutes then
    // will warn XD and then stop the cluster
    private _restartActivityTimer() {
        this.stopActivityTimer();
        this._activityTimer = setTimeout(() => {
            socket.sendClusterStopWarning();
            xcConsole.log("sending warning");
            this._logoutTimer = setTimeout(() => {
                socket.logoutMessage({inactive: true});
                cloudManager.stopCluster();
            }, this._logoutWarningTime);

        }, this._inactivityTime);
    }
}

export default UserActivityManager.getInstance;