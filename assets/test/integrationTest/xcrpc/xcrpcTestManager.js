const Xcrpc = require('xcalarsdk');
//import the test suit for each services
const KVstoreServiceTest = require('./KVStoreServiceSpec');
const LicenseServiceTest = require('./LicenseServiceSpec');
const PublishedTableServiceTest = require('./PublishedTableServiceSpec');
const QueryServiceTest = require('./QueryServiceSpec');
const UDFServiceTest = require('./UDFServiceSpec');
const TableServiceTest = require('./TableServiceSpec');

//creat xcrpc client
const hostname = "localhost:12124"
const url = "http://" + hostname + "/service/xce";
Xcrpc.createClient(Xcrpc.DEFAULT_CLIENT_NAME, url);

//get services
let client = Xcrpc.getClient("DEFAULT");
let KVstoreService = client.getKVStoreService();
let LicenseService = client.getLicenseService();
let PublishedTableService = client.getPublishedTableService();
let QueryService = client.getQueryService();
let UDFService = client.getUDFService();
let TableService = client.getTableService();

describe("xcrpc integration test: ", function () {
    // run the testSuit for each services
    KVstoreServiceTest.testSuit(KVstoreService, Xcrpc.KVStore.KVSCOPE);
    LicenseServiceTest.testSuit(LicenseService);
    PublishedTableServiceTest.testSuit(PublishedTableService);
    QueryServiceTest.testSuit(QueryService);
    UDFServiceTest.testSuit(UDFService);
    TableServiceTest.testSuit(TableService);
});
