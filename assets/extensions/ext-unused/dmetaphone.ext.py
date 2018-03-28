from metaphone import doublemetaphone
import re

meta_dict = {}
def genMetaphone(col):
    col = __preProcess(col)
    if col in meta_dict:
        return meta_dict[col]
    meta_dict[col] = doublemetaphone(col)
    return meta_dict[col]
	
def __preProcess(col):
	col = re.sub('[^0-9a-zA-Z\s]+','',col);
	col = col.strip()
	col = col.lower()
	return col