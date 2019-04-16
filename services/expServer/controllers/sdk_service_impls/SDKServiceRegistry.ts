// This is the service registry file which has information
// of all the middleware services implementations

const serviceRegistry = {
    "Dataflow": require(__dirname + "/dataflowService"),
    "Sql": require(__dirname + "/sqlService"),
    "Workbook": require(__dirname + "/workbookService")
};

export { serviceRegistry as ServiceRegistry }