def transpose(inp, ins):
    first = True
    second = True
    record = {}
    record["symbol"] = inp[inp.rfind("/") + 1:inp.rfind(".")]
    closes = []
    rowNum = 1
    for row in ins:
        if first:
            first = False
            continue
        vals = row.split(",")
        colName = vals[0]
        if second:
            second = False
            record["lastDate"] = colName
        close = vals[4]
        closes.append(close)
        rowNum += 1
    record["values"] = ",".join(closes)
    yield record

def getEma(values, numDays):
	valArray = [float(x) for x in values.split(",")]
	if (len(valArray) < numDays + 1):
		return "Too few days on the market"
	getStart = 0
	startCount = 0
	for i in xrange(min(len(valArray) - numDays, numDays)):
		getStart += valArray[-1 - i]
		startCount += 1
	prevEma = getStart / startCount
	multiplier = (float(2) / (numDays + 1))
	emaArray = []
	for i in xrange(len(valArray) - startCount):
		curEma = (valArray[len(valArray) - startCount - 1 - i] - prevEma) *\
				  multiplier + prevEma
		emaArray.insert(0, str(curEma))
		prevEma = curEma
	return ",".join(emaArray)

def getSma(values, numDays):
	allV = values.split(",")
	curSum = 0
	curCount = 0
	for i in xrange(min(len(values), numDays)):
		curSum += float(allV[i])
		curCount += 1
	if curCount == 0:
		return "N/A"
	else:
		return str(curSum / curCount)

def get200daySma(values):
	return getNumDayMovingAverage(values, 200)

def get50daySma(values):
	return getNumDayMovingAverage(values, 50)

def getGoldenCrossDate(values, lookbackDays=None):
	maxDatapoints = len(values) - 200 + 1
	if not lookbackDays or lookbackDays > maxDatapoints:
		lookbackDays = maxDatapoints
	if (lookbackDays <= 0):
		return "Too few days on the market"

	valArray = [float(x) for x in values.split(",")]
	fiftySum = sum(valArray[0:50])
	twoHundredSum = sum(valArray[0:200])
	fiftyAverage = float(fiftySum) / 50
	twoHundredAverage = float(twoHundredSum) / 200
	if (fiftyAverage < twoHundredAverage):
		return "Not crossed yet"

	# Already crossed. When did it cross?
	for i in xrange(maxDatapoints - 1):
		fiftySum = fiftySum - valArray[i] + valArray[50 + i]
		twoHundredSum = twoHundredSum - valArray[i] + valArray[50 + i]
		fiftyAverage = float(fiftySum) / 50
		twoHundredAverage = float(twoHundredSum) / 200
		if (fiftyAverage < twoHundredAverage):
			return "Crossed " + str(i + 1) + " days ago"

	return "Crossed over " + str(maxDatapoints) + " days ago"

def getEmaActions(emaShort, emaLong, numDays):
	ema5 = emaShort.split(",")
	ema13 = emaLong.split(",")
	numDays = int(numDays)
	numValues = min(len(ema5), len(ema13), numDays)
	ema5 = ema5[:numValues]
	ema13 = ema13[:numValues]
	ema5 = list(reversed([float(x) for x in ema5]))
	ema13 = list(reversed([float(x) for x in ema13]))
	prev = "Sell"
	actions = []
	for i in xrange(numValues):
		if ema5[i] > ema13[i]:
			#buy event
			if (prev == "Sell"):
				actions.insert(0, "Buy")
				prev = "Buy"
			else:
				actions.insert(0, "NoAction")
		else:
			if (prev == "Buy"):
				actions.insert(0, "Sell")
				prev = "Sell"
			else:
				actions.insert(0, "NoAction")
	return ",".join(actions)

def removeNoActions(actions, numDays):
	actions = actions.split(",")
	numDays = int(numDays)
	if len(actions) < numDays:
		numDays = len(actions)
	hasBuy = False
	for i in xrange(numDays):
		if (actions[i] == "Buy"):
			hasBuy = True
			break
	return str(hasBuy)

def lower(col):
	return str(col).lower()

def getCurVal(actions, price, numDays, amountOfMoney):
	numDays = int(numDays)
	actions = actions.split(",")
	price = [float(x) for x in price.split(",")]
	amountOfMoney = float(amountOfMoney)
	numDays = min(len(actions), len(price), numDays)
	start = False
	numShares = -1
	for i in xrange(numDays):
		if actions[numDays - 1 - i] == "Buy":
			if (start == True):
				return "Bug in algo"
			start = True
			numShares = round(amountOfMoney / price[numDays - 1 - i])
		elif actions[numDays - 1 - i] == "Sell":
			if not start:
				continue #noop since we have not bought anything
			start = False
			#update amountOfMoney because that's the new amount we get to buy
			amountOfMoney = price[numDays - 1 - i] * numShares
			numShares = -1
	if (start):
		return str(numShares * price[0])
	else:
		return str(amountOfMoney)
