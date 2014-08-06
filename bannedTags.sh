#!/bin/sh
DEPTAGS=(acronym applet basefont big center dir font frame frameset isindex
         noframes s strike tt u)

for i in `seq 0 14`;
do
    EXPR=`grep -r --exclude="*.sh" "<${DEPTAGS[$i]}>" * | wc -l`
    if [ $EXPR -gt 0 ]
    then
        echo "You've used deprecated <${DEPTAGS[$i]}> tag" 1>&2
    fi
done
