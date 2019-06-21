import Observer from 'nodejs-redis-observer';

export class RednomicUnitAdapter {
  constructor(options) {
    this.options = options;
    this.observer = new Observer({ server: options.server });
  }

  call(inputKey, data) {
    let outputKey = inputKey.replace('-input-','-output-');
    return new Promise((resolve, reject) => {
      let timeout = setTimeout(()=> {
        reject(`Timeout rejection ${inputKey}`)
      }, this.options.timeout);
      try {
        this.observer.subscribe(outputKey, (data) => {
          resolve(data);
          clearTimeout(timeout);
        });
        this.observer.publish(inputKey, JSON.stringify(data));
      } catch(e){
        reject(e);
        clearTimeout(timeout);
      }
    });
  }

  resolve(data){
    data = JSON.parse(data);
    return data;
  }
}
