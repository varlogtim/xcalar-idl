# PLEASE TAKE NOTE:

# UDFs can only support
# return values of
# type String.

# Function names that
# start with __ are
# considered private
# functions and will not
# be directly invokable.


# DATETIME FUNCTIONS:
# https://msdn.microsoft.com/en-us/library/ee634786.aspx

from datetime import timedelta, datetime
from dateutil.relativedelta import relativedelta
from calendar import isleap as __isleap
import math
from scipy.stats import beta, chi2, expon, poisson, norm


defaultDateFmt = "%d/%m/%Y"
defaultTimeFmt = "%H:%M:%S"

###
#
# Streaming UDF's for datetime
#
###

#get generator for all dates between start and end included
#start, end: must be of type Date
def __rangeOfDates(start, end):
    for n in xrange(int((end - start).days) + 1):
        yield start + timedelta(n)

#return format to Xcalar design
def __toDate(date, columnName, inputFormat, index):
    return {
        columnName : date.strftime(inputFormat),
        "Row" : index
    }

#use when startDate and endDate are explicit dates
#generates a two column table with the following structure:
#    <DateColumn>: all dates between startDate and endDate
#    Row: contains numbers next to the dates in ascending order,
#        used to sort the dates in Xcalar
def calenderExplicit(filePath, inStream, startDate = "01/01/1996",
                      endDate = "24/08/2005", inputFormat = defaultDateFmt,
                      columnName = "Date"):
    start_date = datetime.strptime(startDate, inputFormat)
    end_date = datetime.strptime(endDate, inputFormat)
    for i, date in enumerate(__rangeOfDates(start_date, end_date)):
        yield __toDate(date, columnName, inputFormat, i)

#given the column number of the date column, returns the earliest
#and latest dates in that column
def __get_dates(inStream, delimiter, dateColNo, inputFormat):
    minDate = None
    maxDate = None
    for line in inStream:
        date_str = line.split(delimiter)[dateColNo]
        try:
            curr_date = datetime.strptime(date_str, inputFormat)
            if curr_date.strftime(inputFormat) == "28/10/2014":
                logging.warning(line)
                logging.warning(date_str)
            if minDate == None or curr_date < minDate:
                minDate = curr_date
            if maxDate == None or curr_date > maxDate:
                maxDate = curr_date
        except:
            continue
    return (minDate, maxDate)

#use when startDate or endDate are to be inferred from data
#generates a two column table with the following structure:
#    <DateColumn>: all dates between earliest date in column and
#        last date in column, unless explicit start or end date
#        specified in which case that is used.
#    Row: contains numbers next to the dates in ascending order,
#        used to sort the dates in Xcalar
def calendarMinmax(filePath, inStream, delimiter = '\t',
                    dateColNo = 0, inputFormat = defaultDateFmt,
                    startDate = None, endDate = None,
                    outputFormat = None, columnName = "Date"):
    #keep same formating for output if none given
    outputFormat = outputFormat or inputFormat
    if startDate and endDate:
        start_date = datetime.strptime(startDate, inputFormat)
        end_date = datetime.strptime(endDate, inputFormat)
    else:
        dates = __get_dates(inStream, delimiter, dateColNo,
                            inputFormat)
        start_date = (datetime.strptime(startDate, inputFormat)
                      if startDate else dates[0])
        end_date = (datetime.strptime(endDate, inputFormat)
                    if endDate else dates[1])
    for i, date in enumerate(__rangeOfDates(start_date, end_date)):
        yield __toDate(date, columnName, outputFormat, i + 1)

###
#
# UDF's for datetime
#
###

#convert dates to a default string format, so operations can run
#without inputFormat being explicitly provided
def toDefaultDate(dateStr, inputFormat):
    return datetime.strptime(dateStr, inputFormat).strftime(defaultDateFmt)

#convert time to a default string format, so operations can run
#without inputFormat being explicitly provided
def toDefaultTime(timeStr, inputFormat):
    return datetime.strptime(timeStr, inputFormat).strftime(defaultTimeFmt)

#def diff(startDate, endDate, intervalType = "days",
#         inputFormat = defaultDateFmt):
#    start_date = datetime.strptime(startDate, inputFormat)
#    end_date = datetime.strptime(endDate, inputFormat)

#returns day from [1,31]
def day(dateStr, inputFormat = defaultDateFmt):
    return str(datetime.strptime(dateStr, inputFormat).day)

#returns the same date m months later or before (caps at largest date
#value in modified month)
def eDate(dateStr, m, inputFormat = defaultDateFmt):
    return (datetime.strptime(dateStr, inputFormat) +
            relativedelta(months = m)).strftime(inputFormat)

#returns the last date m months later or before
def eoMonth(dateStr, m, inputFormat = defaultDateFmt):
    #first we get the edate (see above) for m + 1
    #replace the date value by 1 and then subtract 1 day
    #this gives the last day of the month modified by m
    return ((datetime.strptime(dateStr, inputFormat) +
            relativedelta(months = m + 1)).replace(day = 1)
            - timedelta(days = 1)).strftime(inputFormat)

#returns hour from [0,23]
def hour(timeStr, inputFormat = defaultTimeFmt):
    return str(datetime.strptime(timeStr, inputFormat).hour)

#returns minute from [0, 59]
def minute(timeStr, inputFormat = defaultTimeFmt):
    return str(datetime.strptime(timeStr, inputFormat).minute)

#returns month from [1, 12]
def month(dateStr, inputFormat = defaultDateFmt):
    return str(datetime.strptime(dateStr, inputFormat).month)

#returns seconds from [0, 59]
def second(timeStr, inputFormat = defaultTimeFmt):
    return str(datetime.strptime(timeStr, inputFormat).second)

#returns weekday from [1, 7] with 1 being Monday
def weekday(dateStr, inputFormat = defaultDateFmt):
    return str(datetime.strptime(dateStr, inputFormat).weekday() + 1)

#returns week number form [1, 53] according to ISO 8601
def weekNum(dateStr, inputFormat = defaultDateFmt):
    return datetime.strptime(dateStr, inputFormat).strftime("%V")

#return the year
def year(dateStr, inputFormat = defaultDateFmt):
    return str(datetime.strptime(dateStr, inputFormat).year)

#types for which we know the exact difference
deterministicTypes = ["days", "hours", "minutes", "seconds"]
#returns the difference in date/time for two dates in the format specified
#acceptable: days, hours, minutes, seconds, years, months, quarters
def dateDiff(endDate, startDate, intervalType = "days",
              inputFormat = defaultDateFmt):
    start_date = datetime.strptime(startDate, inputFormat)
    end_date = datetime.strptime(endDate, inputFormat)

    #logging.debug(str(start_date))
    try:
        #currently returns integers, this can be modified by removing cast to
        #int for the deterministic types
        if intervalType in deterministicTypes:
            diff_tdelta = end_date - start_date
            if intervalType == "days": return str(diff_tdelta.days)
            total_seconds = diff_tdelta.total_seconds()
            if intervalType == "seconds": return str(int(total_seconds))
            elif intervalType == "minutes": return str(int(total_seconds/60))
            elif intervalType == "hours": return str(int(total_seconds/3600))
        else:
            year_diff = end_date.year - start_date.year
            if intervalType == "years": return str(year_diff)
            month_diff = 12*year_diff + end_date.month - start_date.month
            if intervalType == "months": return str(month_diff)
            #get quarter for both months and subtract the two. Cannot change
            #order of division and subtraction.
            quarter_diff = (4*year_diff + (end_date.month - 1)/3 -
                            (start_date.month - 1)/3)
            if intervalType == "quarters": return str(quarter_diff)
    except:
        pass

#return the fraction of the year represented by the difference of two dates,
#with the modified day
def __calc360dayDiff(edate, sdate, eday, sday):
    duration = ((edate.year - sdate.year)*360 +
                (edate.month - sdate.month)*30 +
                (eday - sday))
    return float(duration)/360

def __yf_usNasd(edate, sdate):
    #keep day the same if no condition for modification is true
    eday, sday = edate.day, sdate.day
    #if sdate is on last day of feb or is equal to 31
    if (((sdate + timedelta(1)).month == (sdate.month + 1))
        and sdate.day != 30):
        sday = 30
        #edate is only modified if sdate is modified and it
        #falls on the last day of the month
        if (edate + timedelta(1)).month == (edate.month + 1):
            #eday changes if sday and eday are on the last
            #day of feb or sday and eday are both 31
            if (edate.month == 2) == (sdate.month == 2):
                eday = 30
    return __calc360dayDiff(edate, sdate, eday, sday)

def __yf_actual(edate, sdate):
    return float((edate - sdate).days)/(365 + __isleap(sdate.year))

def __yf_actual360(edate, sdate):
    return float((edate - sdate).days)/360

def __yf_actual365(edate, sdate):
    return float((edate - sdate).days)/365

def __yf_eu360(edate, sdate):
    eday, sday = min(edate.day, 30), min(sdate.day, 30)
    return __calc360dayDiff(edate, sdate, eday, sday)

yf_fnMap = [__yf_usNasd, __yf_actual, __yf_actual360, __yf_actual365, __yf_eu360]
#Return the fraction of an year represented by the difference between start
#and end dates with the specified format given in the arg
def yearFrac(endDate, startDate, basis = 0, inputFormat = defaultDateFmt):
    start_date = datetime.strptime(startDate, inputFormat)
    end_date = datetime.strptime(endDate, inputFormat)
    #pass computation to specific function based on inputFormat
    #(Python's equivalent of a simple switch - case)
    return str(yf_fnMap[basis](end_date, start_date))


# INFORMATION FUNCTIONS
# https://msdn.microsoft.com/en-us/library/ee634552.aspx

def isBlank(val):
    return val == ""

def isError(val):
    return val == None

def isEven(n):
    n = int(n)
    return (n % 2) == 0

def isLogical(val):
    return type(val) == bool

def isNumber(n):
    try:
        n = float(n)
        return True
    except:
        return False

def isOdd(n):
    n = int(n)
    return (n % 2) == 1


# LOGICAL FUNCTIONS:
# https://msdn.microsoft.com/en-us/library/ee634365.aspx


#if there is an error in the conditional, returns outVal
def ifError(cond, ifTrue, ifFalse):
    #FNF, Xcalar's error message for cols is passed
    #as None to python.
    if (cond == None): return str(ifTrue)
    else: return ifFalse

#match is the column
#subsequent args must be of the form "case,result"
def switch(match, *case_res_pairs):
    for pair in args[1:]:
        (case, res) = tuple(pair.split(','))
        if (str(match) == case):
            return res


# MATH AND TRIG FUNCTIONS:
# https://msdn.microsoft.com/en-us/library/ee634241.aspx

#permutation - nPr
def permut(n, r):
    n = int(n)
    r = int(r)
    #eliminates the multiplication required for (n-r)! as the same term is
    #divided
    return str(reduce(long.__mul__, range(n - r + 1, n + 1), 1L))

#direct combination - nCr
def combin(n, r):
    n = int(n)
    r = int(r)
    r = min(r, n - r) # to get least number of multiplications in reduce
    #eliminates the need to calculate 3 factorials by removing common terms
    #in n! and (n - r)!
    return str(reduce(long.__mul__, range(n - r + 1, n + 1), 1L) / math.factorial(r))

#mathematical definition of combination to check result
# def comb_checker(n_, r_):
#    n = int(n_)
#    r = int(r_)
#    return str(math.factorial(n) / (math.factorial(r) * math.factorial(n - r)))

#combination with repetition - (n + r - 1)C(n - 1)
def combinA(n, r):
    n = int(n)
    r = int(r)
    new_n = n + r - 1
    new_r = n - 1
    #since mathematical formula of combA(n, r) is (n + r - 1)C(n - 1)
    return comb(new_n, new_r)

#mathematical definition of combination with repetition to check result
#def combA_checker(n_, r_):
#    n = int(n_)
#    r = int(r_)
#    return str(math.factorial(n + r - 1) / (math.factorial(r) * math.factorial(n - 1)))

#round to nearest even number
#to round up, replace round with math.ceil
def __even(x):
    return int(round(float(x)/2)*2)

def even(x):
    return str(__even(x))

#factorial
def fact(n):
    return str(math.factorial(int(n)))

#__gcd implementation is the same as that in fractions module
#could also do from fractions import gcd
def __gcd(a, b):
    a, b = int(a), int(b)
    while b:
        a, b = b, a % b
    return a

#GCD of list of numbers
def gcd(*numbers):
    return str(reduce(__gcd, numbers, 0))

#LCM of a and b
def __lcm(a, b):
    a, b = int(a), int(b)
    #gcd(a, b) * lcm(a, b) = a * b
    return (a * b) / __gcd(a, b)

#LCM of list of numbers
def lcm(*numbers):
    return str(reduce(__lcm, numbers, 1))

#round to nearest odd number
#to round up, replace round with math.ceil
def odd(x):
    return str(__even(x + 1) - 1)

#Returns -1, 0, or 1 if a < 0, a == 0 or a > 0 respectively
def sign(x):
    x = int(x)
    #using True = 1 and False = 0, the following expression returns the desired
    #result
    return str((x > 0) - (x < 0))


# STATISTICAL FUNCTIONS:
# https://msdn.microsoft.com/en-us/library/ee634822.aspx

# refer to scipy.stats (link below) to get many more built-in stats functions
# https://docs.scipy.org/doc/scipy-0.19.0/reference/stats.html

#probability functions follow scipy format rather than DAX so more wrappers
#with same format can be created with ease

# Below are Xcalar wrappers for particular functions of some distributions

# beta distribution wrappers
# https://docs.scipy.org/doc/scipy-0.19.0/reference/generated/scipy.stats.beta.html#scipy.stats.beta

def betaPdf(x, a, b, loc = 0, scale = 1):
    return str(beta.pdf(x, a, b, loc, scale))

def betaCdf(x, a, b, loc = 0, scale = 1):
    return str(beta.cdf(x, a, b, loc, scale))

def betaPpf(p, a, b, loc = 0, scale = 1):
    return str(beta.ppf(p, a, b, loc, scale))

# chi-squared distribution wrappers
# https://docs.scipy.org/doc/scipy-0.19.0/reference/generated/scipy.stats.chi2.html#scipy.stats.chi2

def chisqPdf(x, degOfFreedom, loc = 0, scale = 1):
    return str(chi2.pdf(x, degOfFreedom, loc, scale))

def chisqCdf(x, degOfFreedom, loc = 0, scale = 1):
    return str(chi2.cdf(x, degOfFreedom, loc, scale))

def chisqPpf(p, degOfFreedom, loc = 0, scale = 1):
    return str(chi2.ppf(p, degOfFreedom, loc, scale))

# exponential distribution wrappers
# modified to include the paramater lambda for rate
# https://docs.scipy.org/doc/scipy-0.19.0/reference/generated/scipy.stats.expon.html#scipy.stats.expon

def exponPdf(x, _lambda, loc = 0, scale = 1):
    return str(_lambda*expon.pdf(_lambda*x, loc, scale))

def exponCdf(x, _lambda, loc = 0, scale = 1):
    return str(expon.cdf(_lambda*x, loc, scale))

def exponPpf(p, _lambda, loc = 0, scale = 1):
    return str(expon.ppf(p, loc, scale)/_lambda)

# Poisson distribution wrappers
# https://docs.scipy.org/doc/scipy-0.19.0/reference/generated/scipy.stats.poisson.html#scipy.stats.poisson

def poissonPdf(k, mu, loc = 0):
    return str(poisson.pmf(k, mu, loc))

def poissonCdf(k, mu, loc = 0):
    return str(poisson.cdf(k, mu, loc))

def poissonPpf(p, mu, loc = 0):
    return str(poisson.ppf(p, mu, loc))


def confidenceNorm(confidence_level, mean, std, size):
    return str(mean - norm.interval(confidence_level, loc = mean,
                                    scale = std/(size**0.5))[0])

def confidenceT(confidence_level, mean, std, size):
    return str(norm.interval(confidence_level, loc = mean,
                             scale = std/(size**0.5)))


# TEXT FUNCTIONS:
# https://msdn.microsoft.com/en-us/library/ee634938.aspx

#ascii val of first character in the text
def code(text):
    return str(ord(text[0]))

def lower(text):
    return text.lower()

#replaces part of a text string, based on the number of character
#range you specify, with a different text string.
def replace(text, swapStr, startIndex, endIndex):
    return text[:startIndex] + swapStr + text[endIndex:]

#concatenates text to itself n times
def rept(text, n):
    return text * n

def upper(text):
    return text.upper()
