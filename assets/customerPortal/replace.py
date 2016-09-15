def strRep():
    f = open("table_render.html")
    css = open("cp.css").read()
    fout = open("_table_render.html", "w")
    a = f.read()
    a = a.replace("CSS", css)
    fout.write(a)
    fout.close()
    f.close()

strRep()
