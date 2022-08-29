import { Executor } from '../modules/executor';

describe('Executor', () => {
  describe('default execution', () => {
    it('should be defined', () => {
      const executor = new Executor([]);

      expect(executor).toBeDefined();
    });
    it('should have a function called execute', () => {
      const executor = new Executor([]);

      expect(executor.execute).toBeDefined();
    });
    it('should call both functions', async () => {
      const mockFN1 = jest.fn(() => Promise.resolve('test 1'));
      const mockFN2 = jest.fn((args?: any) => Promise.resolve(args));

      const executor = new Executor([
        {
          args: {},
          method: mockFN1,
          name: 'test1',
          options: {}
        },
        {
          args: { arg1: 'test1' },
          method: mockFN2,
          name: 'test2',
          options: {}
        }
      ]);

      const results = await executor.execute();
      expect(results).toMatchObject({
        test1: {
          status: 'fulfilled',
          value: 'test 1'
        },
        test2: {
          status: 'fulfilled',
          value: {
            arg1: 'test1'
          }
        }
      });
    });
    it('should call all the functions provided', async () => {
      const mockFN1 = jest.fn((arg) => Promise.resolve(arg));
      const mockFN2 = jest.fn((args?: any) => Promise.resolve(args));

      const executor = new Executor([
        {
          args: ['test 1'],
          method: mockFN1,
          name: 'test1',
          options: {}
        },
        {
          args: { arg1: 'test1' },
          method: mockFN2,
          name: 'test2',
          options: {}
        }
      ]);

      const results = await executor.execute();
      expect(results).toMatchObject({
        test1: {
          status: 'fulfilled',
          value: 'test 1'
        },
        test2: {
          status: 'fulfilled',
          value: {
            arg1: 'test1'
          }
        }
      });
    });
  });

  describe('race conditions', () => {
    it('should call methods as a race condition', async () => {
      const mockFN1 = jest.fn(() => Promise.resolve('test 1'));
      const mockFN2 = jest.fn(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve('test 2'), 1000);
          })
      );

      const executor = new Executor([
        {
          args: [],
          method: [mockFN1, mockFN2],
          name: 'test1',
          options: {
            isRace: true
          }
        }
      ]);
      const results = await executor.execute();
      expect(results).toMatchObject({
        test1: {
          status: 'fulfilled',
          value: 'test 1'
        }
      });
    });
    it('should work when arg set is an obj', async () => {
      const mockFN1 = jest.fn((args) => Promise.resolve(args));

      const mockFN2 = jest.fn(() => Promise.resolve('test 2'));

      const executor = new Executor([
        {
          args: [
            {
              arg1: 'test1'
            }
          ],
          method: [mockFN1, mockFN2],
          name: 'test1',
          options: {
            isRace: true
          }
        }
      ]);

      const results = await executor.execute();

      expect(results).toMatchObject({
        test1: {
          status: 'fulfilled',
          value: {
            arg1: 'test1'
          }
        }
      });
    });
    it('should work when arg set is a array', async () => {
      const mockFN1 = jest.fn((args) => Promise.resolve(args));

      const mockFN2 = jest.fn((str) => Promise.resolve(str));

      const executor = new Executor([
        {
          args: [
            ['args test'],
            {
              arg1: 'test1'
            }
          ],
          method: [mockFN2, mockFN1],
          name: 'test1',
          options: {
            isRace: true
          }
        }
      ]);
      const results = await executor.execute();

      expect(results).toMatchObject({
        test1: {
          status: 'fulfilled',
          value: 'args test'
        }
      });
    });
    it('should error, no race flag', async () => {
      const mockFN1 = jest.fn(() => Promise.resolve('test 1'));
      const mockFN2 = jest.fn((args?: any) => Promise.resolve(args));

      const executor = new Executor([
        {
          args: {},
          method: [mockFN1, mockFN2],
          name: 'test1',
          options: {}
        }
      ]);

      expect(await executor.execute()).toMatchObject({
        test1: {
          status: 'rejected',
          reason: Error(
            'test1: is an array but not flagged as a race condition'
          )
        }
      });
    });
    it('should error, not array w/ flag', async () => {
      const mockFN1 = jest.fn(() => Promise.resolve('test1'));

      const executor = new Executor([
        {
          args: {},
          method: mockFN1,
          name: 'test1',
          options: {
            isRace: true
          }
        }
      ]);

      expect(await executor.execute()).toMatchObject({
        test1: {
          status: 'rejected',
          reason: Error(
            'test1: methods must be in an array when in race condition'
          )
        }
      });
    });
    it('should error, when array len 1 w/ flag', async () => {
      const mockFN1 = jest.fn(() => Promise.resolve('test1'));

      const executor = new Executor([
        {
          args: [],
          method: [mockFN1],
          name: 'test1',
          options: {
            isRace: true
          }
        }
      ]);
      const results = await executor.execute();

      expect(results).toMatchObject({
        test1: {
          status: 'rejected',
          reason: Error(
            'test1: there must be two methods to fulfill race condition'
          )
        }
      });
    });
    it('should error, when array and no flag', async () => {
      const mockFN1 = jest.fn(() => Promise.resolve('test1'));

      const executor = new Executor([
        {
          args: [],
          method: [mockFN1],
          name: 'test1',
          options: {}
        }
      ]);

      const results = await executor.execute();

      expect(results).toMatchObject({
        test1: {
          status: 'rejected',
          reason: Error(
            'test1: is an array but not flagged as a race condition'
          )
        }
      });
    });
  });
});
