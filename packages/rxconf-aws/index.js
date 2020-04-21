import { timer, from, onErrorResumeNext } from 'rxjs';
import {
  map, filter, pairwise, startWith, concatMap,
} from 'rxjs/operators';
import { SSM, SecretsManager } from 'aws-sdk';

/**
 * Creates observable that calls a function on an interval,
 * returning values only if they have changed
 *
 * @param {Number} interval
 * @param {Function} fn
 */
function poll(interval, fn) {
  return onErrorResumeNext(
    timer(0, 60000).pipe(
      startWith({}),
      concatMap(
        () => from(fn()),
      ),
      // filter out unchanging values
      pairwise(),
      filter((prev, next) => JSON.stringify(prev) !== JSON.stringify(next)),
      map((prev, next) => next),
    ),
  );
}

function ParameterStoreProvider(Name) {
  const ssm = new SSM();

  function fetchParameter() {
    const params = {
      Name,
      WithDecryption: true,
    };
    return new Promise((resolve) => {
      ssm.getParameter(params, (err, data) => {
        if (err) {
          console.log(err, err.stack);
        } else {
          resolve(data);
        }
      });
    });
  }

  // ping aws parameter store once a minute for changes
  return poll(60000, () => fetchParameter());
}

function SecretsManagerProvider(SecretId) {
  const secrets = new SecretsManager();

  function fetchSecret() {
    const params = {
      SecretId,
    };
    return new Promise((resolve) => {
      secrets.getSecretValue(params, (err, data) => {
        if (err) {
          console.log(err, err.stack);
        } else {
          resolve(data);
        }
      });
    });
  }

  // ping aws secrets manager once a minute for changes
  return poll(60000, () => fetchSecret());
}

module.exports = {
  ParameterStoreProvider,
  SecretsManagerProvider,
};
