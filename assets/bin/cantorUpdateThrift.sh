cd ~/gui/assets/js/thrift/
mv thrift.js 015
#cp $XLRDIR/src/bin/thrift/js/*.js .
#cp $XLRDIR/src/bin/tests/*.js .
scp jyang@cantor:~/xcalar/src/bin/thrift/js/*.js .
scp jyang@cantor:~/xcalar/src/bin/tests/*.js .
cp 015/thrift.js .
