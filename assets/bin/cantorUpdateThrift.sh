cd ~/gui/assets/js/thrift/
mv thrift.js 015
#cp $XLRDIR/src/bin/thrift/js/*.js .
#cp $XLRDIR/src/bin/tests/*.js .
rm ~/gui/assets/js/thrift/*
scp jyang@cantor:~/xcalar/buildOut/src/bin/jsClient/jsPackage/*.js .
scp jyang@cantor:~/xcalar/src/bin/tests/MgmtTest.js .

cp 015/thrift.js .
