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
            const matchOffsetLeft: number = $match.offset().left;
            const bound: ClientRect = $container[0].getBoundingClientRect();
            const leftBoundaray: number = bound.left;
            const rightBoundary: number = bound.right;
            const matchWidth: number = $match.width();
            const matchDiff: number = matchOffsetLeft - (rightBoundary - matchWidth);

            if (matchDiff > 0 || matchOffsetLeft < leftBoundaray) {
                if (toScroll) {
                    const scrollLeft: number = $container.scrollLeft();
                    const viewWidth: number = $container.width();
                    $container.scrollLeft(scrollLeft + matchDiff +
                                            ((viewWidth - matchWidth) / 2));
                }
                return false;
            } else {
                return true;
            }
        } catch (e) {
            return false;
        }
    }

}