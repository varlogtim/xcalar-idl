#!/bin/bash

# Get rid of abs paths 
sed -i 's@/js/@js/@' index.html
sed -i 's@/stylesheets/@stylesheets/@' index.html
sed -i 's@/images/@\.\./\.\./images/@' stylesheets/css/style.css

if [ -e "../xcalar/src/bin/tests/XcalarApiVersionSignature_types.js" ]
then
    diff -q "../xcalar/src/bin/tests/XcalarApiVersionSignature_types.js" ./js/thrift/XcalarApiVersionSignature_types.js > /dev/null 2>&1
    ret=$?
    if [ "$ret" != "0" ]
    then
        echo "*** WARNING: thrift interfaces may be incompatible"
    fi
fi

# to test the pages, simply open up test/index.html
