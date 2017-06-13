
# pad a float n with zeros till it the integer part occupies d decimal places
def padZeros(n, d):
    parts = str(n).split(".")
    if len(parts) > 1:
        return "{}.{}".format(parts[0].zfill(d), parts[1])
    else:
        return parts[0].zfill(d)