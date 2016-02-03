#!/bin/bash

. codereviewcommon.sh

usage()
{
    echo "Usage:" 1>&2
    echo "        mkreview.sh <reviewName>" 1>&2
    exit 1
}

submitNewReview()
{
    reviewName=$1

    # For a new review, next check to see if the user is current and rebased
    latestCommit=`git rev-parse $REMOTE/master-0.9.2`
    if [ "$?" != "0" ]
    then
        echo "Failed to get the latest commit.  Bailing out..." 1>&2
        exit 1
    fi
    git rev-list HEAD | grep -q $latestCommit
    if [ "$?" != "0" ]
    then
        echo "Your checkout does not appear to be up to date.  Please merge " 1>&2
        echo "$REMOTE/master when generating a new review.  When generating an " 1>&2
        echo "incremental review, it is strongly recommended that you do *NOT* " 1>&2
        echo "merge $REMOTE/master.." 1>&2
        exit 1
    fi

    # everything looks clean, push the review
    git tag $reviewName/1 HEAD
    git tag $reviewName/0 $latestCommit
    git push $REMOTE $reviewName/1
    git push $REMOTE $reviewName/0

    echo ""
    echo "Successfully posted new review ${reviewName} take1!"
    echo "Cut/Paste the following in a review email:"
    echo ""
    echo "========= cut here ========"
    printf "Hello,\n\nPlease review the following new change with:\n\n"
    echo " $ rdreview.sh $reviewName"
    echo ""
    git log -1
    echo "========= cut here ========"
}

submitIncReview()
{
    reviewName=$1
    take=0

    getLatestTake $reviewName

    newTake=$(( $take + 1 ))

    # ensure the new incremental has non-zero changes
    curSha1=`git rev-parse $reviewName/$take`
    newSha1=`git rev-parse HEAD`
    if [ "$curSha1" = "$newSha1" ]
    then
        echo "HEAD is already posted as ${reviewName}/$take.  Bailing..." 1>&2
        exit 1
    fi

    git tag $reviewName/$newTake HEAD
    git push $REMOTE $reviewName/$newTake

    echo ""
    echo "Successfully posted incremental review ${reviewName} take$newTake!"
    echo "Cut/Paste the following in a review email:"
    echo ""
    echo "========= cut here ========"
    printf "Hello,\n\nPlease review the following incremental change with:\n\n"
    echo " $ rdreview.sh $reviewName $take $newTake"
    echo ""
    echo "or for the complete change review with:"
    echo ""
    echo " $ rdreview.sh $reviewName"
    echo ""
    git log -1
    echo "========= cut here ========"
}

TMP1=`mktemp /tmp/mkreviewXXXXXX.1`
retval=1
rm -f $TMP1

if [ "$1" = "" ] || [ "$2" != "" ]
then
    usage
fi

# first check to see if the user's tree is clean
testTreeIsDirtyAndExit "Please ensure that your tree is clean before generating a review."

findRemoteAndFetch
echo "Here2"
# next check to see if there's an existing review by that name
reviewName="reviews/`whoami`/$1"
git tag | grep -q $reviewName
if [ "$?" = "0" ]
then
    submitIncReview $reviewName
else
    submitNewReview $reviewName
fi
