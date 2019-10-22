#please be in xcalar-gui folder first and run ./assets/bin/updateDocs.sh 
rm -rf ~/xcalar-gui/assets/help/XD/*
scp -r jenkins@skywalker.int.xcalar.com:/netstore/doc/help/Internal/XDHelp/* assets/help/XD/

rm -rf ~/xcalar-gui/assets/help/Cloud/*
scp -r jenkins@skywalker.int.xcalar.com:/netstore/doc/help/Internal/XDHelp_cloud/* assets/help/Cloud/
