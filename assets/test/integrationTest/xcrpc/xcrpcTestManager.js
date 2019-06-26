/**
 * To run the test in dev machine w/o backend:
 * export NODE_TLS_REJECT_UNAUTHORIZED = 0
 * export NODE_APIEP = "https://skywalker:8443/app/service/xce"
 */
const Xcrpc = require('xcalarsdk');

//import the test suit for each services
const KVstoreServiceTest = require('./KVStoreServiceSpec');
const LicenseServiceTest = require('./LicenseServiceSpec');
const PublishedTableServiceTest = require('./PublishedTableServiceSpec');
const QueryServiceTest = require('./QueryServiceSpec');
const OperatorServiceTest = require('./OperatorServiceSpec');
const UDFServiceTest = require('./UDFServiceSpec');
const TableServiceTest = require('./TableServiceSpec');
const DataflowServiceTest = require('./DataflowServiceSpec');
const GetQueryServiceTest = require('./GetQueryServiceSpec');
const TargetServiceTest = require('./TargetServiceSpec');

//creat xcrpc client
const hostname = "localhost:12124"
const url = process.env.NODE_APIEP || "http://" + hostname + "/service/xce";
Xcrpc.createClient(Xcrpc.DEFAULT_CLIENT_NAME, url);

//get services
let client = Xcrpc.getClient(Xcrpc.DEFAULT_CLIENT_NAME);
let KVstoreService = client.getKVStoreService();
let LicenseService = client.getLicenseService();
let PublishedTableService = client.getPublishedTableService();
let QueryService = client.getQueryService();
let OperatorService = client.getOperatorService();
let UDFService = client.getUDFService();
let TableService = client.getTableService();
let GetQueryService = client.getGetQueryService();
const dataflowService = client.getDataflowService();
let TargetService = client.getTargetService();
let STATUS = Xcrpc.Error.status;


describe("xcrpc integration test: ", function () {
    // run the testSuit for each services
    KVstoreServiceTest.testSuite(KVstoreService, Xcrpc.KVStore.KVSCOPE, STATUS);
    LicenseServiceTest.testSuite(LicenseService);
    PublishedTableServiceTest.testSuite(PublishedTableService);
    QueryServiceTest.testSuite(QueryService);
    OperatorServiceTest.testSuite(OperatorService);
    UDFServiceTest.testSuite(UDFService);
    TableServiceTest.testSuite(TableService);
    DataflowServiceTest.testSuite(dataflowService);
    GetQueryServiceTest.testSuite(GetQueryService);
    TargetServiceTest.testSuite(TargetService);
});
