def genLineNumber(inp, ins):
    lineNo = 1
    for line in ins:
        yield {"lineNumber": lineNo, "lineContents": line}
        lineNo += 1

def genLineNumberWithHeader(inp, ins):
    first = True
    lineNo = 1
    for line in ins:
        if first:
            title = line.strip()
            first = False
            continue
        yield {"lineNumber": lineNo, title: line}
        lineNo += 1