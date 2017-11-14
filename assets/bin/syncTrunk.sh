#!/bin/bash
set -e

# Check if envvar PRODUCTNAME is set. If it is, use that. Else use xcalar-gui
cd $XLRGUIDIR/xcalar-gui/assets/js/thrift/
mv *.js 015
cp $XLRDIR/bin/jsPackage/*.js .
cp 015/thrift.js .

cd $XLRGUIDIR
ln -s xcalar-gui prod
