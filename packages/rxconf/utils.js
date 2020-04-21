import { map } from 'rxjs/operators';
import _ from 'lodash';

module.exports = {
  /**
   * Create a dynamic object whose methods and properties are proxied to an instance
   * that is always functioning using the latest available config
   *
   * @param {Observable} configObservable an rx-conf observable
   * @param {Function<object>} supplier function that creates an instance based on the config
   * @param {string} configKey section of the config pass through to the supplier (uses lodash get)
   * @param {Function<object>} teardown function to allow for tearing down the previous instance
   */
  configProxy(
    configObservable,
    supplier,
    configKey,
    teardown = null,
  ) {
    const handler = {
      $instance: {},
      get(target, key) {
        return this.$instance[key];
      },
    };

    configObservable.pipe(
      map((config) => _.get(config, configKey)),
    ).subscribe(
      async (config) => {
        if (teardown && handler.$instance) {
          teardown(handler.$instance);
        }
        const instance = await supplier(config);
        handler.$instance = instance;
      },
    );

    return new Proxy({}, handler);
  },
};
