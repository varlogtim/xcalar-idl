#!/bin/bash

# XXX FIXME TODOs
# 1. support branches other than master
# 2. support repos other than xcalar

REMOTE=""
REPO=xcalar-gui
REPOURL="git@faraday:/gitrepos/$REPO.git"
DELIMETER="_"
REVIEWDIR="/var/tmp/reviews/`whoami`"
DIRTY=""

findRemoteAndFetch()
{
    for remote in `git remote`
    do
        url=`git remote show -n $remote | grep 'URL' | head -1 | cut -f2- -d: |
        cut -f2 -d " "`
        # trim the preceding " " from output of above
        echo "$REPOURL"
        echo "$url"
        if [ "$url" = "$REPOURL" ]
        then
            echo "Found it!"
            REMOTE=$remote
            break
        fi
    done
    git remote
    if [ "$REMOTE" = "" ]
    then
        echo "Cannot find remote $REPOURL.  Bailing..." 1>&2
        exit 1
    fi
    git fetch -t $REMOTE
    if [ "$?" != "0" ]
    then
        echo "Failed to fetch $REMOTE.  Bailing out..." 1>&2
        exit 1
    fi
}

GUIDIFF=${GUIDIFF:-tkdiff}

testTreeIsDirty()
{
    statusLines=`git status --porcelain | wc -l`
    if [ $statusLines -eq 0 ]
    then
        DIRTY=0
    else
        DIRTY=1
    fi
}

testTreeIsDirtyAndExit()
{
    MSG=$1

    testTreeIsDirty
    if [ "$DIRTY" = "1" ]
    then
        echo "*****************" 1>&2
        printf "$MSG" 1>&2
        echo "  Dirty file state:" 1>&2
        git status -s 1>&2
        echo "*****************"
        exit 1
    fi
}

getLatestTake()
{
    local tmpTake=0
    local revName=$1
    for revTake in `git tag | grep $revName`
    do
        local curTake=`echo "$revTake" | cut -f4 -d'/'`
        echo "$curTake" | grep -q $DELIMETER
        if [ "$?" = "0" ]
        then
            continue;
        fi
        if [ "$curTake" -gt "$tmpTake" ]
        then
            tmpTake=$curTake
        fi
    done
    take=$tmpTake
}

initReviewDir()
{
    mkdir -p $REVIEWDIR
    if [ "$?" != "0" ]
    then
        echo "Failed to create review directory $REVIEWDIR.  Bailing..." 1>&2
        exit 1
    fi

    cd $REVIEWDIR
    if [ ! -e "$REVIEWDIR/$REPO" ]
    then
        git clone $REPOURL
        if [ "$?" != "0" ]
        then
            echo "Failed to clone $REPOURL.  Bailing..." 1>&2
            exit 1
        fi
    fi
}
