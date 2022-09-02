import {
  MethodStruct,
  OptionsInterface,
  ToOutputType,
  Expand
} from '@/types/interface';

const errorWithLogs = (
  errorMsg: string,
  customLogger?: (args?: any) => void
) => {
  if (customLogger) customLogger(errorMsg);
  throw new Error(errorMsg);
};

const handleRace = async <T>(
  methodConfig: MethodStruct<T>,
  customLogger: (args?: unknown) => void
) => {
  const { args, method, name, options } = methodConfig;
  const isMethodArray = Array.isArray(method);
  const isArgsArray = Array.isArray(args);

  if (!isMethodArray)
    return errorWithLogs(
      `${name}: methods must be in an array when in race condition`,
      customLogger
    );
  if (!isArgsArray) return errorWithLogs(`${name}: args must be an array`);

  if (isMethodArray && method.length < 2)
    return errorWithLogs(
      `${name}: there must be at least two methods to fulfill race condition`,
      customLogger
    );

  return Promise.race(
    method.map((fn, index) => {
      const argSet = args[index];
      return Array.isArray(argSet) ? fn(...argSet) : fn(argSet);
    })
  );
};

/**
 * Handles the logic for using Promise.allSettled to execute methods
 * @param methods array of the methods to be executed
 * @param customLogger optional custom logger for the method execution on error
 * @returns Promise<PromiseSettledResult<any>[]>
 */
const handleMethods = async <T>(
  methods: MethodStruct<T>[],
  customLogger?: (args?: any) => void
) => {
  return Promise.allSettled(
    methods.map(async (methodConfig) => {
      const { name, method, args, options } = methodConfig;
      const isMethodArray = Array.isArray(method);
      const isArgsArray = Array.isArray(args);

      if (options.isRace) return handleRace<T>(methodConfig, customLogger);
      if (isMethodArray)
        return errorWithLogs(
          `${name}: is an array but not flagged as a race condition`,
          customLogger
        );

      return isArgsArray ? await method(...args) : await method(args);
    })
  );
};

const execute = async <
  T extends MethodStruct<K>[],
  M extends PromiseSettledResult<any>[],
  K extends string
>(
  methods: [...T],
  options?: OptionsInterface
): Promise<Expand<ToOutputType<T, M>>> => {
  const results = await handleMethods<K>(methods, options?.customLogger);

  return methods.reduce((acc, method, index) => {
    const { name, options: methodOptions } = method;
    const customLogger = options?.customLogger;
    const result = results[index];

    acc[name] = result;
    return acc;
  }, {} as any) as Expand<ToOutputType<T, M>>;
};

export default execute;
