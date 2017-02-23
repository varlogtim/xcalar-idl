# PLEASE TAKE NOTE:
# UDFs can only support
# return values of type String
from random import randint

# returns random number from 0-k
def randCluster(k):
    return str(randint(0,k))

# a stringified vector is a string of numbers deliminated by commas
# ex: <1,2,3> => 1,2,3
# elems is an array of input elements from a vector

# returns stringified vector
def stringifyVector(*elems):
    return str(",".join(str(x) for x in elems))

# argString is a string of stringified mean vectors sperated by # with an extra #
# at the end
# ex: 1,2,3#4,5,6#7,8,9#
# col is a stringified vector

# returns id of the closest mean based on euclidean distance
def cluster(col, argString):
    distances = []
    point = col.split(",")
    means = argString.split("#")
    # last element is empty
    for x in xrange(len(means) - 1):
        mean = means[x].split(",")
        distance = 0
        for y in xrange(len(mean)):
            distance += (float(point[y]) - float(mean[y])) ** 2
        distances.append(distance)

    try:
        return str(distances.index(min(distances)))
    except:
        return str(-1)

def distance(col1, col2):
    distance = 0
    point1 = col1.split(",");
    point2 = col2.split(",");
    for x in xrange(len(point1)):
        distance += (float(point1[x]) - float(point2[x])) ** 2

    return str(distance ** .5)
