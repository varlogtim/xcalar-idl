**xdev-proxy**
is a NodeJS proxy server which adds CORS headers to the proxied request.

Though being a general-purpose CORS proxy which is able to proxy any cross domain requests
(such as the AJAX calls in Javascript) to any endpoints, xdev-proxy is initially aiming
to help building an XD dev environment where Xcalar frontend(XD) is running locally
and Xcalar backends(SqlDF, XCE, expServer ...) are running somewhere else(such as in a VM).

## How to use it?
1. Configure the proxy(optional)

    The host and port are configurable as env variables
    ```bash
    export XDEV_PROXY_HOST="0.0.0.0"
    export XDEV_PROXY_PORT="9999"
    ```
    Note: If env variables are not set, xdev-proxy will use these default values:
    * XDEV_PROXY_HOST="localhost"
    * XDEV_PROXY_PORT="8889"

2. Run the proxy
    ```bash
    npm install
    npm start
    ```

3. Setup proxied urls in assets/js/config.js
    ```javascript
    var planServer="https://localhost:8889/https://skywalker.int.xcalar.com:8443/sql";
    ```

## Why we need it?
Before xdev-proxy we have to launch the Chrome browser in a non-web-security mode to send cross domain requests by bypassing CORS limitations. Even with this workaround, it's still annoying to bring up a **special Chrome instance** and do **port forwarding**(ssh -L ...).

## What's behind it?
[cors-anywhere](https://github.com/Rob--W/cors-anywhere) is backing it up.