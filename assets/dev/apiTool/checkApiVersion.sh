#!/bin/bash

set -e

die() {
    [ $# -gt 0 ] && echo "[ERROR] $*" >&2
    exit 1
}

debug() {
    echo "[DEBUG] $*" >&2
}

XLRDIR=${1:-"$XLRDIR"}
XLRGUIDIR=${2:-"$XLRGUIDIR"}
[ -z $XLRDIR ] || [ -z $XLRGUIDIR ] && die "Usage: $0 <xce_repo> <xd_repo>"

scriptPath=$(cd $(dirname ${BASH_SOURCE[0]}) && pwd)
. $scriptPath/versionFunc.sh

xcrpcDefDir="$XLRDIR/src/include/pb/xcalar/compute/localtypes"
xcrpcVersionFile="$XLRGUIDIR/assets/js/xcrpc/enumMap/XcRpcApiVersion/XcRpcApiVersionToStr.json"
thriftDefFile="$XLRDIR/src/include/libapis/LibApisCommon.thrift"
thriftVersionFile="$XLRGUIDIR/ts/thrift/XcalarApiVersionSignature_types.js"

versionSigThrift=$(generateThriftVersionSig $thriftDefFile)
versionSigXcrpc=$(generateXcrpcVersionSig $xcrpcDefDir)

versionMatch=0
if checkApiVersionSig "$versionSigThrift" "$thriftVersionFile"; then
    debug "Thrift: Match"
else
    versionMatch=1
    debug "Thrift(backendSig=$versionSigThrift): Mismatch"
fi
if checkApiVersionSig "$versionSigXcrpc" "$xcrpcVersionFile"; then
    debug "Xcrpc: Match"
else
    versionMatch=1
    debug "Xcrpc(backendSig=$versionSigXcrpc): Mismatch"
fi

exit $versionMatch