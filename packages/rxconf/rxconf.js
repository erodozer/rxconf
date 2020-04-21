import { Subject, of, onErrorResumeNext } from 'rxjs';
import {
  combineLatest, forkJoin, bindNodeCallback, tap, map, take,
} from 'rxjs/operators';
import { all } from 'deepmerge';
import { readFile } from 'fs';

function EnvProvider() {
  return of(process.env);
}

function ValueProvider(value) {
  return of(value);
}

function FileProvider(filename) {
  return bindNodeCallback(readFile)(filename);
}

class RxConf {
  constructor() {
    // create blank observable
    this.providers = [
      // by default, an environment provider is supplied
      new EnvProvider(),
    ];
    // by default, json parsing is supported
    this.parsers = [
      JSON.parse,
    ];
    this.validator = () => {};
  }

  /**
   * Adds a parsable format for config
   * @param {Function<object>} parser a parser function
   */
  addParser(parser) {
    this.parsers.push(parser);
    return this;
  }

  /**
   * Adds an observable configuration source to the layer
   * @param {Observable} provider an observable source that provides config
   */
  addProvider(provider) {
    this.providers.push(provider);
    return this;
  }

  /**
   * Provide a validator for the final merged config.
   * Recommended is to use Ajv with a json schema, or even joi,
   *   but the decision is left up to the developer.
   * @param {Function<object>} fn validation function, should throw on error validation
   */
  registerValidator(validator) {
    this.validator = validator;
    return this;
  }

  /**
   * Initialize the observable with providers.
   * RxConf waits for at least 1 value from each provider before
   * marking the observable as ready with its first combined config
   * @returns {Promise<Observable>}
   */
  build() {
    const parseProviders = this.providers.map(
      (provider) => this.parsers.map(
        (parser) => onErrorResumeNext(
          provider.pipe(
            map((config) => parser(config)),
            tap((config) => this.validator(config)),
          ),
        ),
      ),
    );
    const rxconfig = new Subject()
      .pipe(
        // explicitly first wait for every provider to supply a value
        forkJoin(parseProviders, all),
        // continue listening to config changes from each provider
        // configs will always be merged back with order of precedence
        // based on order of provider registration
        combineLatest(parseProviders, all),
      );
    return new Promise((resolve, reject) => {
      rxconfig.pipe(take(1)).subscribe({
        next() {
          resolve(rxconfig);
        },
        error(err) {
          reject(err);
        },
      });
    });
  }
}

module.exports = {
  RxConf,
  FileProvider,
  ValueProvider,
  EnvProvider,
};
