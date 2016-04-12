# PLEASE TAKE NOTE:
# UDFs can only support
# return values of type String

# argString is a string of means sperated by commas
# returns id of the closest mean
def cluster(col, argString):
    temp = []
    cen = argString.split(",")
    for x in xrange(len(cen)):
        temp.append(abs(float(col) - float(cen[x])))

    try:
        return str(temp.index(min(temp)))
    except:
        return str(-1)
