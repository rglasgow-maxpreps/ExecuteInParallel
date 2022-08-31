import { MethodStruct, OptionsInterface } from '@/types/interface';

type ToOutputType<
  T extends MethodStruct<string>[],
  M extends PromiseSettledResult<any>[]
> = {
  [K in T[number] as K['name']]: M;
};
type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;

const errorWithLogs = (
  errorMsg: string,
  customLogger?: (args?: any) => void
) => {
  if (customLogger) customLogger(errorMsg);
  throw new Error(errorMsg);
};

const handleRaceCondition = async <T>(
  methodConfig: MethodStruct<T>,
  customLogger: (args?: unknown) => void
) => {
  // must me race condition flagged before getting here
  // handles the logic for verifying race conditions
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
      const argSet = args?.[index];
      if (Array.isArray(argSet)) return fn(...argSet);
      return fn(argSet);
    })
  );
};

const handleMethods = async <T>(
  methods: MethodStruct<T>[],
  customLogger?: (args?: any) => void
) => {
  return Promise.allSettled(
    methods.map(async (methodConfig) => {
      const { name, method, args, options } = methodConfig;
      const isMethodArray = Array.isArray(method);
      const isArgsArray = Array.isArray(args);

      if (options.isRace)
        return handleRaceCondition<T>(methodConfig, customLogger);
      if (isMethodArray)
        return errorWithLogs(
          `${name}: is an array but not flagged as a race condition`,
          customLogger
        );

      if (isArgsArray) return await method(...args);
      // assume to be an obj
      return await method(args);
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
  return methods.reduce((acc, { name }, index) => {
    acc[name] = results[index];
    return acc;
  }, {} as any) as Expand<ToOutputType<T, M>>;
};

export default execute;
