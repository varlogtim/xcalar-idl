//This is the service registry file which has information of all the middleware services implementations

var _services = {
    "Dataflow": require(__dirname + "/service_impls/dataflowService"),
    "Sql": require(__dirname + "/service_impls/sqlService")
};

exports.ServiceRegistry = _services;
