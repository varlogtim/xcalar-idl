# PLEASE TAKE NOTE: 
# UDFs can only support
# return values of type String
import datetime, time

def doesNotContain(*arg):
    found = False
    colVal = str(arg[0])
    for a in xrange(len(arg)-1):
        if colVal.find(str(arg[a+1])) != -1:
            found = True
            break
    return str(int(found))

def ifElse(field1, field2):
    if not field1 or len(str(field1)) == 0:
        return str(field2)
    return str(field1)

def convertDateValueToUTS(dateValue):
    if (len(dateValue) == 0):
        return ""
    arr = dateValue.split(".")
    day = arr[0]
    second = 0
    if (len(arr) > 1):
        second = arr[1]
        second = int(float("0."+second) * 24 * 60 * 60)
    date_1 = datetime.datetime.strptime("1/1/1900", "%m/%d/%Y")
    end_date = date_1 + datetime.timedelta(days=(int(day)-1),
                                           seconds=second)
    return str(int(time.mktime(end_date.timetuple())))

def timeSinceNow(val):
    if (len(val) == 0):
        val = 0
    return str(int(time.time() - int(val)));

def genStatusCol(salesStageName, optyLineAvail, more60):
    if (len (salesStageName) < 3):
        return ""
    if (int(salesStageName[0:3]) == 1):
        if (not(bool(optyLineAvail))):
            if not(more60):
                return "Touched"
            return "Not Touched"
    return "Touched"

def genSalesStageNewChangesCol(salesStageName):
    if (len(salesStageName) > 2 and (1 < int(salesStageName[0:3]) < 8)):
        return "Active but not pursued"
    return ""

def genFinalPT(col1, col2):
    if col1 == "P":
        return col2
    else:
        return col1

def noOfDays(darg):
    d = darg.split(" ")
    if not d or len(d) < 1:
        return "0"
    date1 = datetime.datetime.strptime(d[0], "%m/%d/%Y").date()
    today = datetime.date.today()
    delta = today - date1
    return str(delta.days)

