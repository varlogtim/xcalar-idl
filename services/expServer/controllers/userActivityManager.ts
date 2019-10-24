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
    private readonly _defaultInactivityTime = 25 * 60 * 1000;// amount of time to be considered inactive
    private readonly _maxInactivityTime = 120 * 60 * 1000; // 2 hours
    private readonly _minInactivityTime = 10 * 60 * 1000; // 10 minutes
    private _inactivityTime = this._defaultInactivityTime;
    private _logoutWarningTime = 60 * 1000; // user is warned that they have 1 minute before logged out
    private _activityTimer; // {setTimeout} // 25 minute countdown for cluster stop, gets reset when activity detected
    private _logoutTimer; // {setTimeout} 1 minute timer set when user has been
    // idle for 30 minutes. Will log out at the end of 1 minute.
    private _isCheckDisabled: boolean = false;
    private _lastSocketUpdate: number = 0; // time when last actiivity update message sent to socket

    public updateUserActivity(noBroadcast?: boolean) {
        this._restartActivityTimer();
        if (!noBroadcast && (Date.now() - this._lastSocketUpdate > (30 * 1000))) {
            socket.updateUserActivity();
            this._lastSocketUpdate = Date.now();
        }
    }

    public disableIdleCheck() {
        console.log("disableIdleCheck");
        this._isCheckDisabled = true;
        this._stopActivityTimer();
    }

    public enableIdleCheck() {
        console.log("enableIdleCheck");
        this._isCheckDisabled = false;
        this._restartActivityTimer();
    }

    public updateLogoutInterval(time: number) {
        console.log("updateLogoutInterval", time);
        if (!(time >= this._minInactivityTime && time <= this._maxInactivityTime)) {
            time = this._inactivityTime;
        }
        this._inactivityTime = time;
        this._restartActivityTimer();
    }

    private _stopActivityTimer() {
        clearTimeout(this._activityTimer);
        clearTimeout(this._logoutTimer);
    }

    // resets a countdown timer, if not reset again for another 25 minutes then
    // will warn XD and then stop the cluster
    private _restartActivityTimer() {
        if (this._isCheckDisabled) {
            return;
        }
        this._stopActivityTimer();
        this._activityTimer = setTimeout(() => {
            socket.sendClusterStopWarning();
            xcConsole.log("sending warning");
            this._logoutTimer = setTimeout(() => {
                socket.logoutMessage({inactive: true});
                cloudManager.stopCluster();
                cloudManager.logout();
            }, this._logoutWarningTime);

        }, this._inactivityTime - this._logoutWarningTime);
        // set timer for 1 minute less than required time so that we
        // can provide a 1 minute warning
    }
}

export default UserActivityManager.getInstance;