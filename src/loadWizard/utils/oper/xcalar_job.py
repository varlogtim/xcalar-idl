import json
import optparse
import uuid
import boto3
import os

# eg  json
"""
{
   "app" : {
       "path" : "/home/manoj/xce/xcalar/bucketsmart.xlrapp.tar.gz",
       "params" : [
           {"myfile" : "/xcfield/instantdatamart/mdmdemo/000fccb/c86cc8b/969cffb/fec195e/3c7bbdf/4d93b0a/a9f7e3e/24fb51.csv"},
           {"myfilter" : "7a"},
           {"exppath" : "/xcfield/output/"}
       ]
   },
   "schedule" : "cron(0 8 * * *)"
}
"""

class XcalarJob:
    def __init__(self):
        self.workbucket = os.getenv("WORKBUCKET", default="sharedinf-workbucket-559166403383-us-west-2")
        self.eventprefix = os.getenv("EVENTPREFIX", default=".events")
        self.s3 = boto3.resource('s3')
        self.s3client = boto3.client('s3')

    def create(self, conf):
        with open(conf, "r") as cj:
            config = json.loads(cj.read())
        path = config["app"]["path"]
        dfpath = "{}/{}".format("dataflows", os.path.basename(path))
        self.s3client.upload_file(path, self.workbucket, dfpath)
        query = str(uuid.uuid4())
        parray = []
        if "params" in config["app"]:
            for param in config["app"]["params"]:
                mykey = list(param.keys())[0]
                myvalue = param[mykey]
                parray.append("{}={}".format(mykey, myvalue))
        paramarray = "{} {}".format("--params", ','.join(parray) if len(parray) > 0 else '')

        opti = config["app"]["optimized"] if "optimized" in config["app"] else ''
        workbook = "s3://{}/{}".format(self.workbucket, dfpath)
        dataflow = config["app"]["dataflow"]
        base_workbook = os.path.basename(workbook)
        workbook_name = base_workbook.split('.')[0]
        xcstr = f"xc2 workbook delete {workbook_name} && aws s3 cp {workbook} /var/tmp/ && xc2 workbook run --workbook-file /var/tmp/{base_workbook} --query-name {query} --dataflow-name {dataflow} {opti} {paramarray} --sync"
        jobjson = {}
        jobjson["command"] = xcstr
        jobjson["schedule"] = config["schedule"]

        s3object = self.s3.Object(self.workbucket, f"{self.eventprefix}/{query}.json")
        jc = (json.dumps(jobjson, indent=4)+"\n").encode('UTF-8')
        s3object.put(
            Body=(bytes(jc))
        )
        return "{}.json".format(query)

    def list(self):
        kwargs = {'Bucket': self.workbucket, 'Prefix' : self.eventprefix}
        client = boto3.client('s3')
        while True:
            resp = client.list_objects(**kwargs)
            if 'Contents' in resp:
                for content in resp['Contents']:
                    yield {"Job" : os.path.basename(content['Key']), "ModTime" : content["LastModified"].strftime("%Y-%m-%d %H-%M-%S")}
            try:
                kwargs['ContinuationToken'] = resp['NextContinuationToken']
            except KeyError:
                break

    def delete(self, job):
        self.s3.Object(self.workbucket, "{}/{}".format(self.eventprefix, job)).delete()

    def view(self, job):
        obj = self.s3.Object(self.workbucket, "{}/{}".format(self.eventprefix, job))
        return obj.get()['Body'].read().decode('utf-8')


if __name__ == "__main__":
    parser = optparse.OptionParser()
    parser.add_option('-c', '--jobConfig', action="store", dest="jobConfig", help="job config json")
    parser.add_option('-l', '--listJobs', action="store_true", dest="listJobs", help="list jobs")
    parser.add_option('-d', '--deleteJob', action="store", dest="deleteJob", help="delete job")
    parser.add_option('-v', '--viewJob', action="store", dest="viewJob", help="view job")
    options, args = parser.parse_args()

    if not options.jobConfig and not options.listJobs and not options.deleteJob and not options.viewJob:
        print(parser.print_help())
        exit(1)

    xcalarJob = XcalarJob()
    if options.jobConfig:
        print(xcalarJob.create(options.jobConfig))
    elif options.listJobs:
        for job in xcalarJob.list():
            print(job)
    elif options.deleteJob:
        xcalarJob.delete(options.deleteJob)
    elif options.viewJob:
        print(xcalarJob.view(options.viewJob))
