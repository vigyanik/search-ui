from PIL import Image
from PIL.ExifTags import TAGS
import sys
 
import glob
import subprocess
import json
import pprint
srcdir = sys.argv[1]
outfile = sys.argv[2]
outfd = open(outfile,"w")
idval = 0
for imgfile in glob.glob(srcdir + "/*.png"):
    output = None
    json_val = None
    try:
        p = subprocess.Popen(["exiftool","-j","-q",imgfile], stdout=subprocess.PIPE)
        output, err = p.communicate()
        json_val = json.loads(output)[0]
    except:
        pass
    ocr_text = None
    try:
        ocr_text = open(imgfile + ".ocr.txt","r").read()
    except:
        pass
    if json_val == None: continue
    if "Error" in json_val and json_val["Error"] == "Entire file is binary zeros": continue
    json_val["ocr_text"] = ocr_text
    json_val["file_path"] = imgfile
    json_val["id"] = idval
    idval += 1
    outfd.write('{ "index" : { "_index" : "screenshots", "_type" : "_doc" } }')
    outfd.write('\n')
    outfd.write(json.dumps(json_val))
    outfd.write('\n')
outfd.close()
