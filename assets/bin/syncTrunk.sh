#!/bin/bash
set -e

# Check if envvar PRODUCTNAME is set. If it is, use that. Else use xcalar-design
cd $XLRGUIDIR/xcalar-design/assets/js/thrift/
mv *.js 015
cp $XLRDIR/src/bin/thrift/js/*.js .
cp $XLRDIR/src/bin/tests/*.js .
cp 015/thrift.js .

cd $XLRGUIDIR
ln -s xcalar-design prod
