namespace xcTimeHelper {
    let timeOffset: number = 0; // diff between server time and browser's time

    // xcTimeHelper.setup
    export function setup(): XDPromise<any> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        moment.relativeTimeThreshold('s', 8);
        moment.relativeTimeThreshold('m', 55); // test
        xcTimeHelper.resetMoment();
        const startTime = Date.now();
        getServerTime()
        .then((time) => {
            if (time && !isNaN(time)) {
                time = parseInt(time);
                timeOffset = Math.round(((Date.now() + startTime) / 2) - time);
            }
            deferred.resolve();
        })
        .fail(deferred.resolve);
        return deferred.promise();
    }

    // xcTimeHelper.resetMoment
    export function resetMoment(): void {
        moment.updateLocale('en', {
            calendar: {
                lastDay: '[Yesterday] LT',
                sameDay: '[Today] LT',
                nextDay: '[Tomorrow] LT',
                // lastWeek: '[last] dddd LT',
                lastWeek: 'dddd LT',
                nextWeek: 'dddd LT',
                sameElse: 'll'
            }
        });
    };

    interface TipOption {
        container: string;
    }

    /*
     * xcTimeHelper.getDateTip
     * returns tooltip string for dates
     * date can be date timestamp or moment object
     */
    export function getDateTip(date: Date | any, options: TipOption = <TipOption>{}): string {
        if (typeof date !== "object" || !date._isAMomentObject) {
            date = moment(date);
        }
        const container: string = "body" || options.container;
        const title: string = date.format("h:mm:ss A M-D-Y");
        return ' data-toggle="tooltip" data-placement="top" ' +
                'data-container="' + container +
                '" data-original-title="' + title + '" ';
    };

    export function getServerTime(): JQueryPromise<any> {
        const action: string = "GET";
        const url: string = "/service/getTime";
        return xcHelper.sendRequest(action, url);
    }

    export function now(): number {
        return Date.now() - timeOffset;
    }
}