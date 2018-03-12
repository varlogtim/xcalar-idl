window.XcSDK = window.XcSDK || {};
window.XcSDK.Enums = (function() {
    var res = {};

    res.JoinType = JoinOperatorT;
    res.SortType = {
        "Asc": XcalarOrderingT.XcalarOrderingAscending,
        "Desc": XcalarOrderingT.XcalarOrderingDescending,
        "Unordered": XcalarOrderingT.XcalarOrderingUnordered,
        "Invalid": XcalarOrderingT.XcalarOrderingInvalid
    };
    res.AggType = AggrOp;

    return res;
}());
