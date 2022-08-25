import { MethodStruct } from '@/types/interface';

interface ExecutionReturn<T> {
  /**
   * The resulting method object name
   */
  [key: string]: {
    /**
     * The status of the method execution
     */
    status: 'fulfilled' | 'rejected';

    /**
     * the reason the method execution failed
     */
    reason?: any;

    /**
     * the value of the method execution
     */
    value?: {
      [key: string]: T;
    };
  };
}

interface ExecuteOptions {
  /**
   * how to handle the method execution
   */
  callAsync?: boolean;
}

export class Executor {
  // create a constructor initiate the class with the parameters
  constructor(
    readonly methods: MethodStruct[],
    readonly options?: ExecuteOptions
  ) {
    /**
     * a object that contains the methods to be executed
     */
    this.methods = methods;

    /**
     * a object that contains the options to be used
     */
    this.options = {
      callAsync: false,
      ...options
    };
  }

  /**
   * remap the method results to a object with the method name as key
   */
  private remapResults(
    results: { status: 'fulfilled' | 'rejected'; reason?: any; value?: any }[]
  ): ExecutionReturn<any> {
    return results.reduce((acc, result, index) => {
      acc[this.methods[index].name] = result;
      return acc;
    }, {});
  }

  private async handleRaceCondition(methodConfig: MethodStruct) {
    // must me race condition flagged before getting here
    // handles the logic for verifying race conditions
    const { args, method, name, options } = methodConfig;
    const isMethodArray = Array.isArray(method);
    const isArgArray = Array.isArray(args);

    if (!isMethodArray)
      throw new Error(
        `${name}: methods must be in an array when in race condition`
      );

    if (isMethodArray && method.length < 1)
      throw new Error(`${name}: cannot be an empty array`);

    if (isMethodArray && method.length < 2)
      throw new Error(
        `${name}: there must be two methods to fulfill race condition`
      );

    return Promise.race(method.map((fn, index) => fn(args?.[index])));
  }

  /**
   * handle method validation and execution
   */
  private async handleMethods() {
    return Promise.allSettled(
      this.methods.map(async (methodConfig) => {
        const { name, method, args, options } = methodConfig;
        const isArray = Array.isArray(method);
        const isRace = options?.isRace ?? false;

        if (isRace) return this.handleRaceCondition(methodConfig);
        if (isArray)
          throw new Error(
            `${name}: is an array but not flagged as a race condition`
          );

        return await method(args);
      })
    );
  }

  /**
   * Executes a command
   */
  public async execute() {
    const results = await this.handleMethods();

    const reMatched = this.remapResults(results);

    return reMatched;
  }
}
