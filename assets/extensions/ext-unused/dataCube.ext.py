def quarter(month):
    return str((int(month) - 1) / 3 + 1)

def weekend(day):
    if int(day) < 6:
        return "weekday"
    else:
        return "weekend"

def state(dest):
    d = {
        "ABQ": "NM",
        "ACV": "CA",
        "ANC": "AK",
        "ASE": "CO",
        "ATL": "GA",
        "AUS": "TX",
        "BFL": "CA",
        "BIL": "MT",
        "BOI": "ID",
        "BOS": "MA",
        "BUR": "CA",
        "BWI": "MD",
        "BZN": "MT",
        "CEC": "CA",
        "CIC": "CA",
        "CLE": "OH",
        "CLT": "NC",
        "COS": "CO",
        "CVG": "KY",
        "DEN": "CO",
        "DFW": "TX",
        "DTW": "MI",
        "ELP": "TX",
        "EUG": "OR",
        "EWR": "NJ",
        "FAT": "CA",
        "HNL": "HI",
        "IAD": "VA",
        "IAH": "TX",
        "IND": "IN",
        "JFK": "NY",
        "KOA": "HI",
        "LAS": "NV",
        "LAX": "CA",
        "LIH": "HI",
        "MCO": "FL",
        "MDW": "IL",
        "MEM": "TN",
        "MFR": "OR",
        "MIA": "FL",
        "MOD": "CA",
        "MRY": "CA",
        "MSP": "MN",
        "MSY": "LA",
        "OAK": "CA",
        "OGG": "HI",
        "ONT": "CA",
        "ORD": "IL",
        "PDX": "OR",
        "PHL": "PA",
        "PHX": "AZ",
        "PIH": "ID",
        "PIT": "PA",
        "PMD": "CA",
        "PSP": "CA",
        "RDD": "CA",
        "RDM": "OR",
        "RNO": "NV",
        "SAN": "CA",
        "SAT": "TX",
        "SBA": "CA",
        "SBP": "CA",
        "SEA": "WA",
        "SLC": "UT",
        "SMF": "CA",
        "SMX": "CA",
        "SNA": "CA",
        "STL": "MO",
        "TUS": "AZ",
        "TWF": "ID"
    }
    return d[dest]


def pivotConcat(*args):
    res = "("
    for col in args:
        res = res + str(col) + ","
    res = res + ")";
    return res


def pivotParse(col, val):
    startStr = '(' + val + ','
    start = col.find(startStr)

    if start < 0:
        return None
    end = col.find(',)', start)
    return col[start + len(startStr) : end]