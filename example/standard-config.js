/**
 * Creates a layered observable config that is easy to tie to starting up a service
 * 
 * const pkg = require('./package.json');
 * standardConfig(pkg.name)
 *   // returns the rxconf instance, as well as the first resolved config
 *   .then((rxconf, config) => {
 *     const {
 *       port,
 *     } = config;
 *     const app = express();
 *     app.listen(port);
 *   });
 * 
 * @param {String} serviceName 
 * @returns {Promise<RxConf>} returns the observable rxconf instance after determining it is ready.  This observable can be used by
 */
function standardConfig(serviceName) {
    import { RxConf, FileProvider } from '@rxconf/rxconf';
    import { ConsulProvider } from '@rxconf/consul';
    import { ParameterStoreProvider, SecretsManagerProvider } from '@rxconf/aws';
    import Ajv from 'ajv';
    import yaml from 'js-yaml';

    // schema validation
    const validator = new Ajv().compile(require('etc/config.schema.json'));

    const rxconfig = new RxConf()
        .addParser(yaml.safeLoad)
        .registerValidator(validator)
        // file layer
        .addProvider(new FileProvider(`etc/env/config.base.yml`))
        .addProvider(new FileProvider(`etc/env/config.${process.env.ENVIRONMENT}.yml`))
        // consul layer
        .addProvider(new ConsulProvider('/config/application.yml'))
        .addProvider(new ConsulProvider(`/config/application-${process.env.ENVIRONMENT}.yml`))
        .addProvider(new ConsulProvider(`/config/${serviceName}.yml`))
        .addProvider(new ConsulProvider(`/config/my-service-${process.env.ENVIRONMENT}.yml`))
        // aws parameter store
        .addProvider(new ParameterStoreProvider('/config/application.yml'))
        .addProvider(new ParameterStoreProvider(`/config/${serviceName}.yml`))
        // aws secrets
        .addProvider(new SecretsManagerProvider('/config/secrets/application.yml'))
        .addProvider(new SecretsManagerProvider(`/config/secrets/${serviceName}.yml`))
        .build();

    return new Promise((resolve) => {
        rxconfig.take(1).subscribe(
            (config) => {
                resolve([rxconfig, config]);
            }
        )
    });
}

module.exports = standardConfig;
