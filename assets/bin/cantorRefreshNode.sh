scp ~/gui/services/expServer/expServer.js jyang@cantor:~/node
ssh jyang@cantor '
PID=`ps aux | grep expServer | tr -s " " | cut -d " " -f 2`
kill -9 ${PID}
nodejs ~/node/expServer.js &'
