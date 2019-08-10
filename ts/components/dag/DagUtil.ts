// this class should be a lower level util class
// and should have no any dependency
class DagUtil {
    public static isInView($el: JQuery, $container: JQuery): boolean {
        return this._isInView($el, $container, false);
    }

    public static scrollIntoView($el: JQuery, $container: JQuery): boolean {
        return this._isInView($el, $container, true);
    }
    
    /**
     * DagUtil.deleteTable
     * @param tableName
     * @param regEx
     */
    public static deleteTable(tableName: string, regEx: boolean): XDPromise {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        DagTblManager.Instance.deleteTable(tableName, true, regEx);
        // Delete the node's table now
        var sql = {
            "operation": SQLOps.DeleteTable,
            "tables": [tableName],
            "tableType": TableType.Unknown
        };
        var txId = Transaction.start({
            "operation": SQLOps.DeleteTable,
            "sql": sql,
            "steps": 1,
            "track": true
        });
        let deleteQuery: {}[] = [{
            operation: "XcalarApiDeleteObjects",
            args: {
                namePattern: tableName,
                srcType: "Table"
            }
        }];
        XIApi.deleteTables(txId, deleteQuery, null)
        .then(() => {
            Transaction.done(txId, {noLog: true});
            deferred.resolve();
        })
        .fail((error) => {
            Transaction.fail(txId, {
                "failMsg": "Deleting Tables Failed",
                "error": error,
                "noAlert": true,
                "title": "DagView"
            });
            deferred.reject(error);
        });

        return deferred.promise();
    }

    // XXX TODO: combine with the scrollMatchIntoView function in DagTabSearchBar
    private static _isInView(
        $match: JQuery,
        $container: JQuery,
        toScroll: boolean
    ): boolean {
        try {
            const offset = $match.offset();
            const matchOffsetLeft: number = offset.left;
            const bound: ClientRect = $container[0].getBoundingClientRect();
            const leftBoundaray: number = bound.left;
            const rightBoundary: number = bound.right;
            const matchWidth: number = $match.width();
            const matchDiff: number = matchOffsetLeft - (rightBoundary - matchWidth);

            let isInView: boolean = true;
            if (matchDiff > 0 || matchOffsetLeft < leftBoundaray) {
                if (toScroll) {
                    const scrollLeft: number = $container.scrollLeft();
                    const viewWidth: number = $container.width();
                    $container.scrollLeft(scrollLeft + matchDiff +
                                            ((viewWidth - matchWidth) / 2));
                }
                isInView = false;
            }

            const matchOffSetTop: number = offset.top;
            const topBoundary: number = bound.top;
            const bottomBoundary: number = bound.bottom;
            const matchHeight: number = $match.height();
            const matchHeightDiff: number = matchOffSetTop - (bottomBoundary - matchHeight);
            if (matchHeightDiff > 0 || matchOffSetTop < topBoundary) {
                if (toScroll) {
                    const scrollTop: number = $container.scrollTop();
                    const viewHeight: number = $container.height();
                    $container.scrollTop(scrollTop + matchHeightDiff +
                                            ((viewHeight - matchHeight) / 2));
                }
                isInView = false;
            }
            return isInView;
        } catch (e) {
            return false;
        }
    }

}