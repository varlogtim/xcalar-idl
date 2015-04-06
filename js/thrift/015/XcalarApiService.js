//
// Autogenerated by Thrift Compiler (0.9.1)
//
// DO NOT EDIT UNLESS YOU ARE SURE THAT YOU KNOW WHAT YOU ARE DOING
//


//HELPER FUNCTIONS AND STRUCTURES

XcalarApiService_queueWork_args = function(args) {
  this.workItem = null;
  if (args) {
    if (args.workItem !== undefined) {
      this.workItem = args.workItem;
    }
  }
};
XcalarApiService_queueWork_args.prototype = {};
XcalarApiService_queueWork_args.prototype.read = function(input) {
  input.readStructBegin();
  while (true)
  {
    var ret = input.readFieldBegin();
    var fname = ret.fname;
    var ftype = ret.ftype;
    var fid = ret.fid;
    if (ftype == Thrift.Type.STOP) {
      break;
    }
    switch (fid)
    {
      case 1:
      if (ftype == Thrift.Type.STRUCT) {
        this.workItem = new XcalarApiWorkItemT();
        this.workItem.read(input);
      } else {
        input.skip(ftype);
      }
      break;
      case 0:
        input.skip(ftype);
        break;
      default:
        input.skip(ftype);
    }
    input.readFieldEnd();
  }
  input.readStructEnd();
  return;
};

XcalarApiService_queueWork_args.prototype.write = function(output) {
  output.writeStructBegin('XcalarApiService_queueWork_args');
  if (this.workItem !== null && this.workItem !== undefined) {
    output.writeFieldBegin('workItem', Thrift.Type.STRUCT, 1);
    this.workItem.write(output);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

XcalarApiService_queueWork_result = function(args) {
  this.success = null;
  this.err = null;
  if (args instanceof XcalarApiException) {
    this.err = args;
    return;
  }
  if (args) {
    if (args.success !== undefined) {
      this.success = args.success;
    }
    if (args.err !== undefined) {
      this.err = args.err;
    }
  }
};
XcalarApiService_queueWork_result.prototype = {};
XcalarApiService_queueWork_result.prototype.read = function(input) {
  input.readStructBegin();
  while (true)
  {
    var ret = input.readFieldBegin();
    var fname = ret.fname;
    var ftype = ret.ftype;
    var fid = ret.fid;
    if (ftype == Thrift.Type.STOP) {
      break;
    }
    switch (fid)
    {
      case 0:
      if (ftype == Thrift.Type.STRUCT) {
        this.success = new XcalarApiWorkItemResult();
        this.success.read(input);
      } else {
        input.skip(ftype);
      }
      break;
      case 1:
      if (ftype == Thrift.Type.STRUCT) {
        this.err = new XcalarApiException();
        this.err.read(input);
      } else {
        input.skip(ftype);
      }
      break;
      default:
        input.skip(ftype);
    }
    input.readFieldEnd();
  }
  input.readStructEnd();
  return;
};

XcalarApiService_queueWork_result.prototype.write = function(output) {
  output.writeStructBegin('XcalarApiService_queueWork_result');
  if (this.success !== null && this.success !== undefined) {
    output.writeFieldBegin('success', Thrift.Type.STRUCT, 0);
    this.success.write(output);
    output.writeFieldEnd();
  }
  if (this.err !== null && this.err !== undefined) {
    output.writeFieldBegin('err', Thrift.Type.STRUCT, 1);
    this.err.write(output);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

XcalarApiServiceClient = function(input, output) {
    this.input = input;
    this.output = (!output) ? input : output;
    this.seqid = 0;
};
XcalarApiServiceClient.prototype = {};
XcalarApiServiceClient.prototype.queueWork = function(workItem) {
  this.send_queueWork(workItem);
  return this.recv_queueWork();
};

XcalarApiServiceClient.prototype.send_queueWork = function(workItem) {
  this.output.writeMessageBegin('queueWork', Thrift.MessageType.CALL, this.seqid);
  var args = new XcalarApiService_queueWork_args();
  args.workItem = workItem;
  args.write(this.output);
  this.output.writeMessageEnd();
  return this.output.getTransport().flush();
};

XcalarApiServiceClient.prototype.recv_queueWork = function() {
  var ret = this.input.readMessageBegin();
  var fname = ret.fname;
  var mtype = ret.mtype;
  var rseqid = ret.rseqid;
  if (mtype == Thrift.MessageType.EXCEPTION) {
    var x = new Thrift.TApplicationException();
    x.read(this.input);
    this.input.readMessageEnd();
    throw x;
  }
  var result = new XcalarApiService_queueWork_result();
  result.read(this.input);
  this.input.readMessageEnd();

  if (null !== result.err) {
    throw result.err;
  }
  if (null !== result.success) {
    return result.success;
  }
  throw 'queueWork failed: unknown result';
};
