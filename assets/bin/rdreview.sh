#!/bin/bash

. codereviewcommon.sh

usage()
{
    echo "Usage:" 1>&2
    echo "        mkreview.sh <reviewName> [<baseTake> [<reviewTake>]]" 1>&2
    echo "" 1>&2
    echo "DESCRIPTION:" 1>&2
    echo "        baseTake: the baseline take number you wish the diffs to be generated" 1>&2
    echo "                  against.  If unspecified the default is 0." 1>&2
    echo "        reviewTake: the take number you wish to review.  If unspecified the" 1>&2
    echo "                  default is the most recent take." 1>&2
    exit 1
}

TMP1=`mktemp /tmp/mkreviewXXXXXX.1`
retval=1
rm -f $TMP1

if [ "$1" = "" ] || [ "$4" != "" ]
then
    usage
fi

reviewName="$1"
baseTake="$2"
reviewTake="$3"

initReviewDir

cd $REVIEWDIR/$REPO

# ensure we fetch the latest tags before querying for the take#
findRemoteAndFetch

baseTake=${baseTake:-0}
if [ "$reviewTake" = "" ]
then
    take=0
    getLatestTake $reviewName
    reviewTake=$take
fi
feedbackName="$reviewName/${reviewTake}$DELIMETER`whoami`"

# check the review dir; if it is dirty, the user perhaps forgot to submit a
# previous review.
REVIEWSHA1=`git rev-parse $reviewName/$reviewTake`
if [ "$?" != "0" ]
then
    echo "Cannot find review $reviewName/$reviewTake.  Bailing..." 1>&2
    exit 1
fi

CURSHA1=`git rev-parse HEAD`
if [ "$REVIEWSHA1" != "$CURSHA1" ]
then
    testTreeIsDirtyAndExit "  Please ensure that your review tree ($REVIEWDIR/$REPO)\n  is clean before generating a review.  Perhaps you forgot to submit an earlier\n  review?\n"
    git checkout -B ${feedbackName}Temp $reviewName/$reviewTake
    if [ "$?" != "0" ]
    then
        echo "Failed to checkout $reviewName/$reviewTake.  Bailing..." 1>&2
        exit 1
    fi
fi

git difftool -a -y -t $GUIDIFF $reviewName/$baseTake

testTreeIsDirty

if [ "$DIRTY" = "1" ]
then
    echo "Review feedback found in the following files:"
    git status -s 1>&2
    printf "Are you ready to submit review comments?   (y/n): "
    read shouldSubmit
    if [ "$shouldSubmit" = "y" ]
    then
        git commit -a -m "Code review feedback for $reviewName/$reviewTake"
        if [ "$?" != "0" ]
        then
            echo "Failed to commit review feedback for $reviewName/$reviewTake.  Bailing..." 1>&2
            exit 1
        fi
        git tag $feedbackName HEAD
        if [ "$?" != "0" ]
        then
            echo "Unable to tag $feedbackName.  Bailing..." 1>&2
            exit 1
        fi
        git push origin $feedbackName
        if [ "$?" != "0" ]
        then
            echo "Failed to push $feedbackName.  Bailing..." 1>&2
            exit 1
        fi
        git checkout master
        git branch -D ${feedbackName}Temp

        echo ""
        echo "Successfully posted review feedback $feedbackName!"
        echo "Cut/Paste the following in a review reply email:"
        echo ""
        echo "========= cut here ========"
        printf "Hello,\n\nMy review feedback for $reviewName/$reviewTake is available:\n"
        echo ""
        echo " $ rdfeedback.sh $feedbackName"
        echo ""
        echo "========= cut here ========"
    else
        echo "Ok.  Make additional comments and re-run rdreview.sh $*"
    fi
else
    echo "No review feedback found."
fi
