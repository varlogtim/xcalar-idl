# PLEASE TAKE NOTE:
# UDFs can only support
# return values of type String
import math, random
import json, csv

# our sigmoid function, tanh is a little nicer than the standard 1/(1+e^-x)
def sigmoid(x):
    return str(math.tanh(x))

# derivative of our sigmoid function, in terms of the output (i.e. y)
def dsigmoid(y):
    return str(1.0 - y**2)

# calculate a random number where:  a <= rand < b
def rand(a, b):
    return (b-a)*random.random() + a

def parser(infileStr):
    reader = csv.reader(infileStr.split('\n'))
    array = list()
    rowNum = 0
    ni = 0
    nh = 0
    no = 0
    for line in reader:
        if rowNum == 0:
            ni = int(line[0])
            nh = int(line[1])
            no = int(line[2])
            rowNum += 1
            continue

        for i in xrange(ni):
            input = dict()
            input["type"] = "input"
            input["dataNum"] = rowNum
            input["inputRow"] = i
            input["inputCol"] = 0
            input["inputData"] = float(line[i])
            array.append(input)

        for o in xrange(no):
            output = dict()
            output["type"] = "output"
            output["dataNum"] = rowNum
            output["outputRow"] = o
            output["outputCol"] = 0
            output["outputData"] = float(line[ni+o])
            array.append(output)

        rowNum += 1

    for r in xrange(nh):
        for c in xrange(ni):
            hw = dict()
            hw["type"] = "hw"
            hw["hwRow"] = r
            hw["hwCol"] = c
            hw["hwData"] = rand(-0.2, 0.2)
            array.append(hw)

    for r in xrange(no):
        for c in xrange(nh):
            ow = dict()
            ow["type"] = "ow"
            ow["owRow"] = r
            ow["owCol"] = c
            ow["owData"] = rand(-0.2, 0.2)
            array.append(ow)

    return json.dumps(array)
