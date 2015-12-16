#!/bin/bash

# set up xcalar file
echo "Set up Xcalar Insight..."
# Get rid of abs paths 
sed -i '/^<script src="bower/! s@/js/@js/@' *.html
sed -i '/^<script src="bower/! s@/test/@test/@' *.html
sed -i 's@/stylesheets/@stylesheets/@' *.html
sed -i '/^<script src="bower/! s@/js/@js/@' widget/*.html
sed -i 's@/stylesheets/@stylesheets/@' widget/*.html
lessc stylesheets/less/style.less > stylesheets/css/style.css
lessc stylesheets/less/login.less > stylesheets/css/login.css
lessc widget/widget.less > widget/widget.css
sed -i 's@/images/@\.\./\.\./images/@' stylesheets/css/*.css
sed -i 's@/images/@\.\./\.\./images/@' widget/*.css
sed -i 's@/images/@images/@' js/paths.js

echo "var gConstructorVersion = " > js/constructorVersion.js
md5 js/constructor.js | cut -d' ' -f4 >> js/constructorVersion.js
echo ";" >> js/constructorVersion.js

if [ -e "../xcalar/src/bin/tests/XcalarApiVersionSignature_types.js" ]
then
    diff -q "../xcalar/src/bin/tests/XcalarApiVersionSignature_types.js" ./js/thrift/XcalarApiVersionSignature_types.js > /dev/null 2>&1
    ret=$?
    if [ "$ret" != "0" ]
    then
        echo "*** WARNING: thrift interfaces may be incompatible"
        echo "XcalarApiVersionSignature_types.js differs"
        echo "If hosting UI from another place, ignore this message"
    fi
    diff -q "../xcalar/src/lib/libapis/XcalarApi.js" ./js/thrift/XcalarApi.js > /dev/null 2>&1
    ret=$?
    if [ "$ret" != "0" ]
    then
        echo "*** WARNING: thrift interfaces may be incompatible"
        echo "XcalarApi.js differs"
        echo "If hosting UI from another place, ignore this message"
    fi
fi
