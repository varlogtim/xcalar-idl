// this class should be a lower level util class
// and should have no any dependency
class DagUtil {
    public static isInView($el: JQuery, $container: JQuery): boolean {
        return this._isInView($el, $container, false);
    }

    public static scrollIntoView($el: JQuery, $container: JQuery): boolean {
        return this._isInView($el, $container, true);
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