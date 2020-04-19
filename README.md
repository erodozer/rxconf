# rx-conf

rx-conf improves upon the standard pattern of providing configuration to node.js applications through reactivity.  By introducing the concept of observable configuration from numerous sources, services are capable of updating functionality of a live system without requiring service downtime and restarts.

# Install
```
npm install rx-conf
```

# Usage
An example app.js file which demonstrates establishing the configuration, and starting your service after config is ready.

```javascript
const { RxConf, ValueProvider } = require('@rxconf/rxconf');
const { configProxy } = require('@rxconf/rxconf/utils');
const { ConsulProvider } = require('@rxconf/consul');
const express = require('express');

// schema validation
const Ajv = require('ajv'); // schema validation
const validator = new Ajv().compile(require('./config.schema.json'));

// initialize and wait for config to be ready
var rxconfig = await new RxConf()
    .addProvider(new ValueProvider({
        port: 8080,
    }))
    .addProvider(new ConsulProvider('/config/my-service.json'))
    .registerValidator(validator)
    .build();

// using just the first config, initialize the service
rxconfig.take(1).subscribe(
    (config) => {
        const {
            port,
        } = config;
        const app = express();
        app.listen(port);
    }
)

```

An additional helper function is provided for config that matches standards at TMG.  You can use it to start your service in less lines of code

```javascript
const { tmgConfig } = require('rx-conf/tmg');
const pkg = require('./package.json');

tmgConfig(pkg.name)
    // returns the rxconf instance, as well as the first resolved config
    .then((rxconf, config) => {
        const {
            port,
        } = config;
        const app = express();
        app.listen(port);
    });
```