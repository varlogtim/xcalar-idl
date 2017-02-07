// Async extension for XcalarApiService.js
XcalarApiServiceClient.prototype.queueWorkAsync = function(workItem) {
  var self = this;
  return (this.send_queueWorkAsync(workItem)
  .then(function(result) {
    return self.recv_queueWorkAsync.call(self);
  }));
};

XcalarApiServiceClient.prototype.send_queueWorkAsync = function(workItem) {
  var onComplete = function() {
  };
  this.output.writeMessageBegin('queueWork', Thrift.MessageType.CALL, this.seqid);
  var args = new XcalarApiService_queueWork_args();
  args.workItem = workItem;
  args.write(this.output);
  this.output.writeMessageEnd();

  return (this.output.getTransport()
    .jqRequest(null, this.output.getTransport().flush(true), null, onComplete));
};

XcalarApiServiceClient.prototype.recv_queueWorkAsync = function() {
  var deferred = jQuery.Deferred();

  var ret = this.input.readMessageBegin();
  var fname = ret.fname;
  var mtype = ret.mtype;
  var rseqid = ret.rseqid;
  
  if (mtype == Thrift.MessageType.EXCEPTION) {
    var x = new Thrift.TApplicationException();
    x.read(this.input);
    this.input.readMessageEnd();
    deferred.reject(x);
  } else {
    var result = new XcalarApiService_queueWork_result();
    result.read(this.input);
    this.input.readMessageEnd();

    if (null !== result.err) {
      deferred.reject(result.err);
    } else if (null !== result.success) {
      deferred.resolve(result.success);
    } else {
      deferred.reject('queueWork failed: unknown result');
    }

  }
  return (deferred.promise());
};