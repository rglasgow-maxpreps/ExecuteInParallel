import execute from '../executor';

const testFn1Success = jest.fn(async () => 'test 1');
const testFn2Reject = jest.fn(async () => Promise.reject('test 2'));
const testFn3RejectWithError = jest.fn(async () => {
  throw new Error('test 3');
});
const testFn4SuccessWithArgs = jest.fn(
  async (args?): Promise<typeof args> => Promise.resolve(args)
);
const testFn5SuccessWithArgs = jest.fn(
  async (args?) =>
    new Promise((resolve) => {
      setTimeout(() => {
        resolve(args);
      }, 1000);
    })
);
const testFn6SuccessWithArgs = jest.fn(async (args, args2) => args + args2);
beforeEach(() => {
  jest.clearAllMocks();
});

describe('execute function', () => {
  describe('default behavior', () => {
    it('should return fulfilled', async () => {
      const values = await execute([
        {
          args: {},
          method: testFn1Success,
          name: 'test1',
          options: {}
        }
      ]);
      expect(testFn1Success).toHaveBeenCalled();
      expect(values).toMatchObject({
        test1: {
          status: 'fulfilled',
          value: 'test 1'
        }
      });
    });
    it('should return rejected', async () => {
      const values = await execute([
        {
          args: {},
          method: testFn2Reject,
          name: 'test2',
          options: {}
        }
      ]);
      expect(testFn2Reject).toHaveBeenCalled();
      expect(values).toMatchObject({
        test2: {
          status: 'rejected',
          reason: 'test 2'
        }
      });
    });
    it('should return rejected with error', async () => {
      const values = await execute([
        {
          args: {},
          method: testFn3RejectWithError,
          name: 'test3',
          options: {}
        }
      ]);
      expect(testFn3RejectWithError).toHaveBeenCalled();
      expect(values).toMatchObject({
        test3: {
          status: 'rejected',
          reason: Error('test 3')
        }
      });
    });
    it('should call multiple calls', async () => {
      const values = await execute([
        {
          args: {},
          method: testFn1Success,
          name: 'test1',
          options: {}
        },
        {
          args: {},
          method: testFn2Reject,
          name: 'test2',
          options: {}
        }
      ]);
      expect(testFn1Success).toHaveBeenCalled();
      expect(testFn2Reject).toHaveBeenCalled();
      expect(values).toMatchObject({
        test1: {
          status: 'fulfilled',
          value: 'test 1'
        },
        test2: {
          status: 'rejected',
          reason: 'test 2'
        }
      });
    });
    it('should succeed with args', async () => {
      const values = await execute([
        {
          args: {},
          method: testFn4SuccessWithArgs,
          name: 'test1',
          options: {}
        }
      ]);
      expect(testFn4SuccessWithArgs).toHaveBeenCalled();
      expect(values).toMatchObject({
        test1: {
          status: 'fulfilled',
          value: {}
        }
      });
    });
    it('should succeed with args as array and args2 as obj', async () => {
      const values = await execute([
        {
          args: [1, 2],
          method: testFn6SuccessWithArgs,
          name: 'test1',
          options: {}
        }
      ]);
    });
  });

  describe('logging', () => {
    it('should fail and log using a custom logger', async () => {
      const customLoggerFn = jest.fn((message) => {
        console.log(message);
      });
      const values = await execute(
        [
          {
            args: [{ args: 'test set 1' }, { args: 'test set 2' }],
            method: [testFn5SuccessWithArgs, testFn4SuccessWithArgs],
            name: 'test4',
            options: {
              isRace: false
            }
          }
        ],
        {
          customLogger: customLoggerFn
        }
      );
      expect(customLoggerFn).toHaveBeenCalledWith(
        'test4: is an array but not flagged as a race condition'
      );

      expect(values).toMatchObject({
        test4: {
          status: 'rejected',
          reason: Error(
            'test4: is an array but not flagged as a race condition'
          )
        }
      });
    });
    it('should fail without logger and operate as normal', async () => {
      const values = await execute([
        {
          args: {},
          method: [testFn5SuccessWithArgs, testFn4SuccessWithArgs],
          name: 'test4',
          options: {
            isRace: false
          }
        }
      ]);
      expect(values).toMatchObject({
        test4: {
          status: 'rejected',
          reason: Error(
            'test4: is an array but not flagged as a race condition'
          )
        }
      });
    });
  });

  describe('race condition behavior', () => {
    it('should succeed with race condition calls with args', async () => {
      const values = await execute([
        {
          args: [1, 2],
          method: testFn6SuccessWithArgs,
          name: 'test1',
          options: {}
        },
        {
          args: {},
          method: testFn4SuccessWithArgs,
          name: 'test2',
          options: {}
        }
      ]);
      expect(testFn4SuccessWithArgs).toHaveBeenCalledWith({});
      expect(testFn6SuccessWithArgs).toHaveBeenCalledWith(1, 2);
      expect(values).toMatchObject({
        test1: {
          status: 'fulfilled',
          value: 3
        },
        test2: {
          status: 'fulfilled',
          value: {}
        }
      });
    });
    it('should succeed when second fn fulfills first', async () => {
      const values = await execute([
        {
          args: [],
          method: [testFn5SuccessWithArgs, testFn4SuccessWithArgs],
          name: 'test4',
          options: {
            isRace: true
          }
        }
      ]);
      expect(testFn5SuccessWithArgs).toHaveBeenCalled();
      expect(testFn4SuccessWithArgs).toHaveBeenCalled();
      expect(values).toMatchObject({
        test4: {
          status: 'fulfilled',
          value: {}
        }
      });
    });

    it('should error when args are not in an array', async () => {
      const values = await execute([
        {
          args: {},
          method: [testFn5SuccessWithArgs, testFn4SuccessWithArgs],
          name: 'test4',
          options: {
            isRace: true
          }
        }
      ]);
      expect(values).toMatchObject({
        test4: {
          status: 'rejected',
          reason: Error('test4: args must be an array')
        }
      });
    });

    it('should error when methods is not an array', async () => {
      const values = await execute([
        {
          args: [],
          method: testFn5SuccessWithArgs,
          name: 'test4',
          options: {
            isRace: true
          }
        }
      ]);
      expect(values).toMatchObject({
        test4: {
          status: 'rejected',
          reason: Error(
            'test4: methods must be in an array when in race condition'
          )
        }
      });
    });

    it('should error when methods is not > 1', async () => {
      const values = await execute([
        {
          args: [],
          method: [testFn5SuccessWithArgs],
          name: 'test4',
          options: {
            isRace: true
          }
        }
      ]);
      expect(values).toMatchObject({
        test4: {
          status: 'rejected',
          reason: Error(
            'test4: there must be at least two methods to fulfill race condition'
          )
        }
      });
    });

    it('should error when not flagged as race', async () => {
      const values = await execute([
        {
          args: [],
          method: [testFn1Success, testFn1Success],
          name: 'test1',
          options: {}
        }
      ]);
      expect(values).toMatchObject({
        test1: {
          status: 'rejected',
          reason: Error(
            'test1: is an array but not flagged as a race condition'
          )
        }
      });
    });

    it('should succeed when args are arrays', async () => {
      const values = await execute([
        {
          args: [[1, 2], [1]],
          method: [testFn6SuccessWithArgs, testFn5SuccessWithArgs],
          name: 'test1',
          options: {
            isRace: true
          }
        }
      ]);
      expect(values).toMatchObject({
        test1: {
          status: 'fulfilled',
          value: 3
        }
      });
    });

    it('should succeed when 3 or more functions are passed', async () => {
      const values = await execute([
        {
          args: [],
          method: [testFn1Success, testFn2Reject, testFn1Success],
          name: 'test1',
          options: {
            isRace: true
          }
        }
      ]);
      expect(values).toMatchObject({
        test1: {
          status: 'fulfilled',
          value: 'test 1'
        }
      });
    });

    it('should succeed when undefined passed as arg', async () => {
      const values = await execute([
        {
          args: [{ test: 'value' }, undefined],
          method: [testFn4SuccessWithArgs, testFn2Reject],
          name: 'test1',
          options: {
            isRace: true
          }
        }
      ]);
      expect(values).toMatchObject({
        test1: {
          status: 'fulfilled',
          value: { test: 'value' }
        }
      });
    });
  });
});
