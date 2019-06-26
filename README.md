#Rednomic

##Simple example

Install **rednomic** package using yarn or npm:

`yarn add rednomic`

There is a simple example of http-server (which is entry point to Your microservices system) part of code (make sure that Redis server is running, use esm module for supporting es import) in the server.js (or another file):

```
import express from 'express';
import { RednomicServer } from 'rednomic';

const app = express();

const RS = new RednomicServer({
  server: {
    host: '127.0.0.1',
    port: 6379
  },
  timeout: 10000
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
  server: {
    host: '127.0.0.1',
    port: 6379
  },
  unitId: 'config',
  timeout: 10000,
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
  server: {
    host: '127.0.0.1',
    port: 6379
  },
  unitId: 'config2',
  timeout: 10000,
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
  server: {
    host: '127.0.0.1',
    port: 6379
  },
  unitId: 'A',
  timeout: 10000,
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
  server: {
    host: '127.0.0.1',
    port: 6379
  },
  unitId: 'B',
  timeout: 10000,
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
  server: {
    host: '127.0.0.1',
    port: 6379
  },
  unitId: 'Group',
  units: ['A', 'B'],
  timeout: 10000
});
```

and server.js:

```
import express from 'express';
import { RednomicServer } from 'rednomic';

const app = express();

const RS = new RednomicServer({
  server: {
    host: '127.0.0.1',
    port: 6379
  },
  timeout: 10000
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
  server: {
    host: '127.0.0.1',
    port: 6379
  },
  timeout: 10000
});

app.post('/file/', RednomicUpload, (req, res, next) => {
  RS.use('F', {}, req, next);
}, (req, res, next) => {
  res.status(200).send(JSON.stringify(req.rednomic))
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
  server: {
    host: '127.0.0.1',
    port: 6379
  },
  unitId: 'F',
  timeout: 10000,
  service: async function (data) {
    console.log('microservice A was called ', +new Date());
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
