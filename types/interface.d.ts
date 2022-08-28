export interface MethodStruct {
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
  name: string;
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
