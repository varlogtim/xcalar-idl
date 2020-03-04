import io
import os
import time
import json
import hashlib
import requests
import traceback
import boto3

from botocore.exceptions import ClientError

# https://docs.aws.amazon.com/AmazonS3/latest/dev/mpuoverview.html
S3_MAX_NUM_PARTS = 10000

# https://docs.aws.amazon.com/AmazonS3/latest/dev/UploadingObjects.html
S3_MAX_PART_SIZE = 5 * 10**9    # 5 GB

# This determines how big a part is before we submit it as one of our parts for
# the multi-part upload.
MULTI_PART_BUF_SIZE = 100 * 2**20    # 100 MB
ROUGH_MAX_FILE_SIZE = S3_MAX_NUM_PARTS * MULTI_PART_BUF_SIZE

AWS_JSON_OUTPUT_RECORD_DELIMITER = '\n'

class SchemaSizeException(Exception):
    def __init__(self, message="Schema size too large"):
        self.message = message
    pass

class AwsConnector():
    @staticmethod
    def is_available():
        try:
            import boto3    # noqa: F401,E402
        except ImportError:
            return False
        return True

    def __init__(self, s3):
        """s3 is the boto3 resource for s3 configured from the appropriate session"""
        if not AwsConnector.is_available():
            raise ImportError("No module named boto3")

        self.temp_bucket = 'sharedinf-lambdabucket-559166403383-us-west-2'
        self._kinesis_printf = (
            'https://qwps8i2l2g.execute-api.us-west-2.amazonaws.com'
            '/Prod/discover/?bucket={}&key={}&format=schema')
        self._s3 = s3

    def _get_temp_path(self, bucket, key):
        """Given a path, return a corresponding temp path?"""
        temp_hash = hashlib.md5(f'{bucket}{key}'.encode('utf-8')).hexdigest()
        return (self.temp_bucket, temp_hash)

    def _write_s3_select_temp_file(self, data_gen, temp_bucket, temp_key,
                                   input_serialization_args, expression):
        """ event_stream should be result of s3 select """
        with self.open(temp_bucket, temp_key, 'wb') as temp_fh:
            # look into whether you can call read() on this?
            for data in data_gen.read(input_serialization_args, expression):
                temp_fh.write(data)
        #print(f"Successfully wrote temp file: {temp_bucket}/{temp_key}")

    def _kinesis_schema(self, bucket, key):
        url = self._kinesis_printf.format(bucket, key)
        #print(f"DERP: _kinesis_schema: url: {url}")
        ret = requests.get(url)
        if ret.status_code != 200:
            # XXX Note to self, probably should have custom exceptions
            print(f"aws.py: _kinesis_schema({bucket}/{key})"
                         f"HTTP return code: {ret.status_code}")
            raise RuntimeError("Failed to discover schema")
        #print(f"Successfully discovered schema? {bucket}/{key} - {ret.text}")
        return ret.text

    def _convert_schema(self, schema):
        #print(f"DERP: connector.aws.py: schema {schema}")
        # XXX should convert schema types to Xcalar types?
        schema_json = json.loads(schema)

        return schema_json['RecordColumns']

    def __delete_temp_key(self, bucket, key):
        try:
            self._s3.meta.client.delete_object(
                Bucket=bucket,
                Key=key)
        except Exception as e:
            print(f"Failed to delete temporary key: /{bucket}/{key}")
            pass
    def discover_schema(self, bucket, key, input_serialization_args, sampleLimit):
        """This always returns the schema or a failure"""
        success = 0
        status = "success"  # Get's populated if there is an error
        step = "start"
        temp_key = None
        temp_bucket = None
        error_message = None
        exception = None
        schema = []
        try:
            # Do select
            step = "s3select"
            expression = 'SELECT * FROM s3object s LIMIT {}'.format(sampleLimit)
            s3select = S3SelectDataStream(self._s3, bucket, key)

            # write the temp data:
            step = "write sample file"
            (temp_bucket, temp_key) = self._get_temp_path(bucket, key)
            self._write_s3_select_temp_file(s3select, temp_bucket, temp_key,
                                            input_serialization_args, expression)

            # now should run kinesis on the temp data.
            step = "kinesis discover"
            raw_schema = self._kinesis_schema(temp_bucket, temp_key)

            step = "converting raw schema"
            schema = self._convert_schema(raw_schema)

            # ENG-7037 - ParserArgs limit prevents large schemas from loading.
            # ... will block by not sending back schemas which are too large (>1278)
            fake_parser_args = {
                'schema': schema,
                'input_serialization_args': input_serialization_args
            }
            fake_json_parser_args = json.dumps(fake_parser_args)
            step = "checking schema length"
            # FIXME need to ask usrnode what its limit for this is
            if len(fake_json_parser_args) > 1270:
                print("parserArgs would be too large.")
                raise SchemaSizeException("Schema size is too large.")

            step = "finished"
            success = 1
        # The hope here is that "status" can always be shown to the user.
        except ClientError as e:
            # These are AWS Exceptions. They maybe actionable by the user.
            error_message = str(e.response['Error']['Message'])
            exception = e
        except SchemaSizeException as e:
            # Inform the user that the schema is too large.
            error_message = str(e.message)
            exception = e
        except Exception as e:
            # These are unkown errors which we shouldn't show to the user.
            error_message = "Unable to discover schema."
            exception = e
        finally:
            if exception is not None:
                status = error_message
                error_log_message = (
                    f"msg='Schema Discover Failure', bucket='{bucket}', "
                    f"key='{key}', step='{step}', exception='{exception}'")
                print(error_log_message)
            if temp_bucket is not None and temp_key is not None:
                self.__delete_temp_key(temp_bucket, temp_key)
            return (success, status, schema)

    def open(self, bucket_name, key, opts):
        s3_obj = self._s3.Object(bucket_name, key)

        if opts == 'rrb':
            # XXX should really spend time looking into this
            # Hrmm... so... since this has a 1 to 1 relationship
            # with the parser ... so, we really return an object
            # with a generator function called read()...
            return S3SelectDataStream(self._s3, bucket_name, key)
        elif opts == 'rb':
            raise NotImplementedError("File mode {} not implemented".format(opts))
        elif opts == 'wb':
            # XXX slim this down?
            return S3WritableStream(s3_obj)
        else:
            raise ValueError("Unknown file mode {}".format(opts))

class S3SelectDataStream():
    def __init__(self, s3, bucket, key):
        # Hackery...
        # I had issues with simply calling open() from load.py
        # because the input_serialization_args will vary depending
        # on the file... so ... the parser is what needs to call
        # read with the appropriate args...
        self._s3 = s3
        self._bucket = bucket
        self._key = key

    def read(self, input_serialization_args, expression):
        args = json.loads(input_serialization_args)
        select_kwargs = {
            'Bucket': self._bucket,
            'Key': self._key,
            'ExpressionType': 'SQL',
            'Expression': expression,
            'OutputSerialization': {
                'JSON': {'RecordDelimiter': AWS_JSON_OUTPUT_RECORD_DELIMITER}
            },
            'InputSerialization': args
        }
        ret = self._s3.meta.client.select_object_content(**select_kwargs)
        http_code = ret['ResponseMetadata']['HTTPStatusCode']
        if http_code != 200:
            msg = (
                f"s3 select failure: HTTP({http_code}) "
                f"path: {self._bucket}/{self._key}")
            print(msg)
            raise RuntimeError(msg)

        event_stream = ret['Payload']
        for event in event_stream:
            if 'Records' in event:
                yield event['Records']['Payload']
                # gives bytes back...

class S3WritableStream(io.BufferedIOBase):
    # XXX This could be removed and replaced with a call to put_object
    # We shouldn't ever try to write a temp file which exceeds the multi
    # part upload size of ~5GB
    def __init__(self, s3_obj):
        self._object = s3_obj
        self._buf = io.BytesIO()
        self._mp = None
        self._parts = []
        self._total_size = 0

    def close(self):
        if self._buf.tell():
            self._upload_part()

        if self._mp:
            self._complete_mp()
        else:
            assert not self._parts, "we must not have parts if the multipart is empty"
            self._object.put(b'')

    def readable(self):
        return False

    def seekable(self):
        return False

    def writeable(self):
        return True

    def tell(self):
        return self._pos

    def write(self, b):
        if not isinstance(b, bytes):
            raise TypeError("argument must be of type bytes, not {}".format(
                type(b)))
        self._buf.write(b)

        if self._buf.tell() > MULTI_PART_BUF_SIZE:
            self._upload_part()

    def _start_mp(self):
        """Starts a multi-part s3 upload"""
        assert self._mp is None
        self._mp = self._object.initiate_multipart_upload()

    def _abort_mp(self):
        if self._mp:
            self._mp.abort()
            self._mp = None

    def _complete_mp(self):
        assert self._mp
        self._mp.complete(MultipartUpload={"Parts": self._parts})
        self._mp = None

    def _upload_part(self):
        if not self._mp:
            self._start_mp()
        # part_num starts at 1
        part_num = len(self._parts) + 1
        buf_size = self._buf.tell()
        if part_num >= S3_MAX_NUM_PARTS:
            raise RuntimeError(
                "file {} too large ({}>~{}); adjust multipart buffer size".
                format(self._object.key, self._total_size + buf_size,
                       ROUGH_MAX_FILE_SIZE))
        if buf_size > S3_MAX_PART_SIZE:
            raise RuntimeError("file {} part {} too large ({} > {})".format(
                self._object.key, part_num, buf_size, S3_MAX_PART_SIZE))
        part = self._mp.Part(part_num)
        self._buf.seek(0)
        upload = part.upload(Body=self._buf)
        self._parts.append({"ETag": upload["ETag"], "PartNumber": part_num})

        # This is actually cheaper than clearing the old one
        # https://stackoverflow.com/a/433082https://stackoverflow.com/a/43308299
        self._buf = io.BytesIO()
        self._total_size += buf_size

    # Dunders for flushing appropriately
    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is not None:
            # We encountered some error
            self._abort_mp()
        else:
            try:
                self.close()
            except Exception:
                # if we have an issue closing, we still want to cancel
                self._abort_mp()
                raise

# This function should be in a sql
def discover_schema(path, inputSerialization, sampleLimit=10):
    bucket = path.split("/")[1]
    key = path.replace("/{}/".format(bucket), "")
    awsConn = AwsConnector(boto3.resource('s3')) 
    success, status, schema = awsConn.discover_schema(bucket, key, inputSerialization, sampleLimit)
    return json.dumps({"success" : success, "status" : status, "schema" : schema})

print(discover("/xcfield/instantdatamart/csv/free-zipcode-database-Primary.csv", json.dumps({"CSV": {"FileHeaderInfo": "USE", "FieldDelimiter": ","}})))
