scp ~/gui/services/expServer/expServer.js jyang@cantor:~/node
ssh jyang@cantor '
set +e
set -x
PID=`ps aux | grep -v bash | grep -v grep | grep expServer | tr -s " " | cut -d " " -f 2`
kill -9 ${PID}
cd ~/node
nodejs expServer.js'
