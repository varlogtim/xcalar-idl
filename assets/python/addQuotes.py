import sys

def addQuotes(fname, startLine, endLine):
	f = open(fname).read()
	lines = f.split("\n")
	for i in xrange(startLine, endLine+1):
		line = lines[i]
		firstNonSpace = len(line) - len(line.lstrip())
		newLine = line[0:firstNonSpace]+"'"
		newLine += line[firstNonSpace:].replace("'", "\'")
		if i < endLine:
			newLine += "' +"
		else:
			newLine += "';"
		lines[i] = newLine;
	f.close()
	fout = open(fname, "w")
	fout.write("\n".join(lines))
	fout.close()

if __name__ == "__main__":
	if len(sys.argv) < 4:
		print "Usage: addQuotes.py filename startLineNo(inc) endLineNo(inc)"
	else:
		addQuotes(sys.argv[1], int(sys.argv[2]), int(sys.argv[3]))

