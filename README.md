#Rednomic

Rednomic is a framework for developing microservices based systems, the main feature of it is the asynchronous interaction of components through Redis. Data is transferred as a JSON strings, file streaming from entry point to microservices is implemented throw Redis also.

Clone and test example app:

https://github.com/Paul-Lazunko/rednomic_docker_example

##Units

Each microservice in your system is a separate executable unit (it can be a docker container or a process running on the same with entry point or another server) that interacts with the entry point or other microservices through Redis. In Your code unit is the instance of RednomicUnit class and requires next options to be provided:

- **redisServer**: an object this host and port properties;
- **requestTimeout**: positive integer which indicates the maximum possible duration of the request to another microservices;
- **logsExpire**: positive integer which indicates the lifetime of the logs;
- **unitId**: unique identifier of this unit;
- **service**: asynchronous function which should be called when unit is requested;

The following methods and properties are available for calling inside the **service**:

- **call**: asynchronous function for interaction with another units, which takes two arguments (unitId and data);
- **log**: function which write logs, takes two arguments (type - 'info' or error' and data);
- **files**: holder of binary data passed from API Gateaway;
- **returnStream**: function which pipe some readable stream to entry point, takes two arguments - meta (object with any properties which You need) and stream, this data will be available in req.rednomic.files when next() will be called in the rednomic middleware at the entry point side

(see below usage examples);

##UnitGroups
A unit group is also a separate executable unit that serves as a load balancer and proxy relative to a group of identical units. In Your code it is an instance of RednomicUnitGroup class and requires next options to be provided:

- **redisServer**: an object this host and port properties;
- **pingTimeout**: positive integer which indicates ping frequency for health checking proxied units;
- **units**: an array of objects each of which has a unique unitId corresponding to the unitId of the some unit from group;
- **unitId**: unique identifier of this unit group;

##Server
It is special control layer that allows you to interact with microservices on the side of the entry point. In Your code it is an instance of RednomicServer class and requires next options to be provided:

- **redisServer**: an object this host and port properties;
- **pingTimeout**: positive integer which indicates ping frequency for health checking proxied units;
- **requestTimeout**: positive integer which indicates the maximum possible duration of the request to microservices;
- **units**: an array of objects each of which has a unique unitId corresponding to the unitId of the some unit from group;

You can use next methods of this instance at the entry point side:

- **use**: asynchronous function to interaction with microservice/unit, takes 4 arguments (unitId, data, req and next - next will be called after the request to microservice will be executed, the results will be available in the next handler in the req.rednomic property);
- **isAlive**: function which takes unitId and return boolean which indicates is requested microservice available;
- **getHealthStatuses**: function which return units with its current states;
- **getLogs**: asynchronous function which returns needed logs, takes 8 arguments (type - 'error' or 'info', unitId, year, month, day, hour, minute, second) non of them are required, time args can be numbers (f.e. - 2019,7,1);

Also You can provide **manage** property for the each of units in the units list, **manage** object should implements **start**, **restart** and **stop** methods. In this case when unit health checking fails provided restart will be called. Also provided methods can be manually called with RednomicServer instance:

```
instance.manage(unitid).restart();
```

##Examples

There is a simple example of http-server (which is entry point to Your microservices system) part of code (make sure that Redis server is running, use esm module for supporting es import) in the server.js (or another file):

```
import express from 'express';
import { RednomicServer } from 'rednomic';

const app = express();

const RS = new RednomicServer({
  redisServer: {
    host: '127.0.0.1',
    port: 6379
  },
  requestTimeout: 10000,
  pingTimeout: 10000,
  units: [
      { unitId: 'A' },
      { unitId: 'B' }
    ]
  });

app.get('/config/',
  (req, res, next) => {
  // pass needed unitId as the first and needed data as second arguments
    RS.use('config', {}, req, next);
  },
  (req, res) => {
  // req.rednomic = { successResult, errorResult };
    res.status(200).send(JSON.stringify(req.rednomic));
});

app.listen(3000, () => {
  console.log( `API server was started at 3000 port` );
});
```

Write Your first microservice using rednomic (service_1.js):

```
import { RednomicUnit } from 'rednomic';

let a = new RednomicUnit({
  redisServer: {
    host: '127.0.0.1',
    port: 6379
  },
  unitId: 'config',
  requestTimeout: 10000,
  logsExpire: 86400,
  service: async function (data) {
    console.log({data})
    return await this.call('config2', data);
  }
});
```

and second microservice which will be requested by previous one (service_2.js):

```
import { RednomicUnit } from 'rednomic';

let b = new RednomicUnit({
  redisServer: {
    host: '127.0.0.1',
    port: 6379
  },
  unitId: 'config2',
  requestTimeout: 10000,
  logsExpire: 86400,
  service: async function (data) {
    console.log({data})
    return { success: true };
  }
});
```

run Your microservices and http-server as separated processes:

**server.js:**

```
node -r esm server.js
```

**service_1.js:**

```
node -r esm service_1.js
```

**service_2.js:**

```
node -r esm service_2.js
```

And after that make request to http://localhost:3000/config

##Using Group of Units

Create a list of the sames microservices, for example service A and service B with different unitIds:

**service_A.js:**

```
import { RednomicUnit } from "rednomic";

let a = new RednomicUnit({
  redisServer: {
    host: '127.0.0.1',
    port: 6379
  },
  unitId: 'A',
  requestTimeout: 10000,
  logsExpire: 86400,
  service: async function (data) {
    console.log('microservice A was called ', +new Date());
    return { status: true, usedService: 'A' };
  }
});
```

**service_B.js:**

```
import { RednomicUnit } from "rednomic";

let b = new RednomicUnit({
  redisServer: {
    host: '127.0.0.1',
    port: 6379
  },
  unitId: 'B',
  requestTimeout: 10000,
  logsExpire: 86400,
  service: async function (data) {
    console.log('microservice B was called ', +new Date());
    return { status: true, usedService: 'B' };
  }
});
```

After that write your group of unit (group.js):

```
import { RednomicUnitGroup } from "rednomic";

let g = new RednomicUnitGroup({
  redisServer: {
    host: '127.0.0.1',
    port: 6379
  },
  unitId: 'Group',
  units: [
    { unitId: 'A' },
    { unitId: 'B' }
  ],
  pingTimeout: 5000
});
```

and server.js:

```
import express from 'express';
import { RednomicServer } from 'rednomic';

const app = express();

const RS = new RednomicServer({
  redisServer: {
    host: '127.0.0.1',
    port: 6379
  },
  requestTimeout: 10000,
  pingTimeout: 5000,
  units: [
    { unitId: 'Group' }
  ]
});

app.get('/group/',
  (req, res, next) => {
  // pass group unitId as the first argument
    RS.use('Group', {}, req, next);
  },
  (req, res) => {
  // req.rednomic = { successResult, errorResult };
    res.status(200).send(JSON.stringify(req.rednomic.successResult));
});

app.listen(3000, () => {
  console.log( `API server was started at 3000 port` );
});
```

##File uploading

Use rednomic-upload package as previous middleware

**server.js:**

```
import express from 'express';
import { RednomicServer } from 'rednomic';
import { RednomicUpload } from 'rednomic-upload';

const RS = new RednomicServer({
  redisServer: {
    host: '127.0.0.1',
    port: 6379
  },
  requestTimeout: 10000,
  pingTimeout: 5000,
  units: [
    { unitId: 'F' }
  ]
});

app.post('/file/',
  RednomicUpload,
  (req, res, next) => {
    RS.use('F', {}, req, next);
  },
  (req, res, next) => {
    res.status(200).send(JSON.stringify(req.rednomic));
});

app.listen(3000, () => {
  console.log( `API server was started at 3000 port` );
});
```

**service_F.js:**

```
import { RednomicUnit } from "rednomic";
import  fs from 'fs'

let f = new RednomicUnit({
  redisServer: {
    host: '127.0.0.1',
    port: 6379
  },
  unitId: 'F',
  requestTimeout: 10000,
  logsExpire: 86400,
  service: async function (data) {
    console.log('microservice F was called ', +new Date());
    let files = [], error;
    this.files.map(file => {
      let path = `${__dirname}/uploads/${file.filename}`;
      files.push(path);
      file.stream.pipe(fs.createWriteStream(path));
    })
    return { status: !error, files, error };
  }
});
```
