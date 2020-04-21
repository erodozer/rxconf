import consul from 'consul';
import { fromEvent, map } from 'rxjs/operators';

function ConsulProvider(key) {
    const watch = consul.watch({
        method: consul.kv.get,
        options: { key },
        backoffFactor: 1000,
    });

    return fromEvent(watch, 'change')
        .pipe(
            // make sure to extra the config value from the consul data
            map(data => data.Value)
        );
}

module.exports = ConsulProvider;