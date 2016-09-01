scp ~/gui/services/expServer/expServer.js jyang@cantor:~/xcalar-gui/services/expServer
scp ~/gui/services/expServer/expServer.js jyang@cantor:~/node

#ssh jyang@cantor '
#set +e
#set -x
#PID=`ps aux | grep -v bash | grep -v grep | grep expServer | tr -s " " | cut -d " " -f 2`
#kill -9 ${PID}
#cd ~/node
#nodejs expServer.js'

ssh jyang@cantor '
source .bashrc
cd ~/xcalar-gui
ls
git status
git add -u
git commit -m "boo"
cd ~/xcalar/pkg/gui-installer
make
'