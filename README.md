#Rednomic

Install **rednomic** package using yarn or npm:

``` yarn add rednomic ```

There is a simple example of http-server (which is entry point to Your microservices system) part of code (make sure that Redis server is running) in the server.js or another file:

```
import express from 'express';
import { RednomicServer } from 'rednomic';

const app = express();

const RS = new RednomicServer({
  server: {
    host: '127.0.0.1',
    port: 6379
  },
  timeout: 10000,
  resolve: (res, data) => {
    res.status(200).send(data)
  },
  reject: (res, data) => {
    res.status(400).send(data)
  }
});

app.get('/config/', (req, res, next) => {
  RS.add('config', {}, res);
});

app.listen(3000, () => {
  console.log( `API server was started at #${3000} port` );
});

```

Write Your first microservice using rednomic (service1.js):

```
import { RednomicUnit } from 'rednomic';

return new RednomicUnit({
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

and second microservice which will be requested by previous one (service2.js):

```
return new RednomicUnit({
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
run Your microservices and http-server as separate processes:

**server.js:**

```
node -r esm server.js
```

**service1.js:**

```
node -r esm service1.js
```

**service2.js:**

```
node -r esm service2.js
```

And after that make request to http://localhost:3000/config

(full documentation coming soon)