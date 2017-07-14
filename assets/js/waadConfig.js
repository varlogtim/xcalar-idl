// WAAD Configuration. Ideally should read from Web.config
// Copy this to config.js when you would like to use it
var waadConfig = {
    instance: 'https://login.microsoftonline.com/',
    tenant: 'xcalar.com',
    clientId: '188c45f6-ab31-4455-a256-e2102674e1f7',
    postLogoutRedirectUri: window.location.origin,
    cacheLocation: 'sessionStorage',
};

