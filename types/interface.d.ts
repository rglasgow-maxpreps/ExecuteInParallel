export interface MethodStruct<T> {
  /**
   * The method arguments. When an array the expected order matches the method order
   * @type{ {} or any[] }
   */
  args: {} | any[];
  /**
   * The method object to be called could be an array of functions or a single function
   */
  method: Function | Function[];
  /**
   * The return name of the method
   */
  name: T extends string ? T : string;
  /**
   * options for the method execution
   */
  options: {
    /**
     * how to handle multiple method executions
     */
    isRace?: boolean = false;
  };
}
export interface OptionsInterface {
  /**
   * how to handle multiple method executions
   */
  isRace?: boolean = false;
  /**
   * custom logger for the method execution
   */
  customLogger?: (args?: any) => void;
}
type ToOutputType<
  T extends MethodStruct<string>[],
  M extends PromiseSettledResult<any>[]
> = {
  [K in T[number] as K['name']]: M;
};
type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;
