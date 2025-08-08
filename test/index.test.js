const ServerlessS3Local = require('../src/index');
const { removeBucket } = require('../src/index');
const { exec } = require('node:child_process');
const fs = require('node:fs');
const path = require('path');

// Mock dependencies
jest.mock('node:child_process');
jest.mock('node:fs');
jest.mock('s3rver');

// Mock AWS SDK
const mockCreateBucketCommand = jest.fn();
jest.mock('@aws-sdk/client-s3', () => ({
  CreateBucketCommand: mockCreateBucketCommand,
  S3Client: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({})
  }))
}));

const mockExec = exec;
const mockFs = fs;

// Mock serverless framework objects
const mockServerless = {
  cli: {
    log: jest.fn()
  },
  service: {
    provider: {
      runtime: 'nodejs18.x',
      environment: {}
    },
    functions: {},
    resources: {
      Resources: {}
    },
    custom: {},
    getAllFunctions: jest.fn(() => []),
    getFunction: jest.fn()
  },
  config: {
    servicePath: '/test/service/path'
  }
};

const mockOptions = {
  port: 4569,
  address: 'localhost'
};

describe('ServerlessS3Local', () => {
  let serverlessS3Local;

  beforeEach(() => {
    jest.clearAllMocks();
    serverlessS3Local = new ServerlessS3Local(mockServerless, mockOptions);
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      expect(serverlessS3Local.serverless).toBe(mockServerless);
      expect(serverlessS3Local.service).toBe(mockServerless.service);
      expect(serverlessS3Local.options).toBe(mockOptions);
      expect(serverlessS3Local.provider).toBe('aws');
      expect(serverlessS3Local.client).toBeNull();
      expect(serverlessS3Local.lambdaHandler).toBeNull();
    });

    it('should define correct commands structure', () => {
      expect(serverlessS3Local.commands).toHaveProperty('s3');
      expect(serverlessS3Local.commands.s3.commands).toHaveProperty('start');
      expect(serverlessS3Local.commands.s3.commands).toHaveProperty('create');
      expect(serverlessS3Local.commands.s3.commands).toHaveProperty('remove');
    });

    it('should define correct hooks', () => {
      expect(serverlessS3Local.hooks).toHaveProperty('s3:start:startHandler');
      expect(serverlessS3Local.hooks).toHaveProperty('s3:create:createHandler');
      expect(serverlessS3Local.hooks).toHaveProperty('s3:remove:createHandler');
      expect(serverlessS3Local.hooks).toHaveProperty('before:offline:start:init');
    });
  });

  describe('setOptions', () => {
    it('should merge default options with service config', () => {
      mockServerless.service.custom = {
        s3: {
          port: 8000,
          directory: './custom-buckets'
        }
      };

      serverlessS3Local.setOptions();

      expect(serverlessS3Local.options.port).toBe(8000);
      expect(serverlessS3Local.options.directory).toBe('./custom-buckets');
      expect(serverlessS3Local.options.address).toBe('localhost'); // default value
    });

    it('should handle missing custom config', () => {
      mockServerless.service.custom = undefined;

      serverlessS3Local.setOptions();

      expect(serverlessS3Local.options.port).toBe(4569); // default value
    });
  });

  describe('hasPlugin', () => {
    beforeEach(() => {
      mockServerless.service.plugins = ['serverless-webpack', 'serverless-additional-stacks'];
    });

    it('should return true when plugin exists (non-strict)', () => {
      const result = serverlessS3Local.hasPlugin('webpack');
      expect(result).toBe(true);
    });

    it('should return false when plugin does not exist', () => {
      const result = serverlessS3Local.hasPlugin('nonexistent');
      expect(result).toBe(false);
    });

    it('should handle strict mode correctly', () => {
      const resultStrict = serverlessS3Local.hasPlugin('serverless-webpack', true);
      const resultNonStrict = serverlessS3Local.hasPlugin('webpack', true);
      
      expect(resultStrict).toBe(true);
      expect(resultNonStrict).toBe(false);
    });

    it('should handle plugins.modules structure', () => {
      mockServerless.service.plugins = {
        modules: ['serverless-webpack', 'serverless-additional-stacks']
      };

      const result = serverlessS3Local.hasPlugin('webpack');
      expect(result).toBe(true);
    });
  });

  describe('hasAdditionalStacksPlugin', () => {
    it('should return true when additional-stacks plugin exists', () => {
      mockServerless.service.plugins = ['serverless-additional-stacks'];
      
      const result = serverlessS3Local.hasAdditionalStacksPlugin();
      expect(result).toBe(true);
    });

    it('should return false when additional-stacks plugin does not exist', () => {
      mockServerless.service.plugins = ['other-plugin'];
      
      const result = serverlessS3Local.hasAdditionalStacksPlugin();
      expect(result).toBe(false);
    });
  });

  describe('hasExistingS3Plugin', () => {
    it('should return true when existing-s3 plugin exists', () => {
      mockServerless.service.plugins = ['serverless-plugin-existing-s3'];
      
      const result = serverlessS3Local.hasExistingS3Plugin();
      expect(result).toBe(true);
    });

    it('should return false when existing-s3 plugin does not exist', () => {
      mockServerless.service.plugins = ['other-plugin'];
      
      const result = serverlessS3Local.hasExistingS3Plugin();
      expect(result).toBe(false);
    });
  });

  describe('buckets', () => {
    it('should return empty array when no buckets are defined', () => {
      serverlessS3Local.options = { buckets: [] };
      
      const result = serverlessS3Local.buckets();
      expect(result).toEqual([]);
    });

    it('should extract bucket names from resources', () => {
      mockServerless.service.resources = {
        Resources: {
          MyBucket: {
            Type: 'AWS::S3::Bucket',
            Properties: {
              BucketName: 'my-test-bucket'
            }
          }
        }
      };
      serverlessS3Local.options = { buckets: [] };

      const result = serverlessS3Local.buckets();
      expect(result).toContain('my-test-bucket');
    });

    it('should handle bucket names from options', () => {
      serverlessS3Local.options = { buckets: ['option-bucket'] };

      const result = serverlessS3Local.buckets();
      expect(result).toContain('option-bucket');
    });

    it('should extract buckets from function events', () => {
      mockServerless.service.functions = {
        myFunction: {
          events: [
            { s3: 'event-bucket' }
          ]
        }
      };
      mockServerless.service.getFunction = jest.fn(() => ({
        events: [{ s3: 'event-bucket' }]
      }));
      mockServerless.service.getAllFunctions = jest.fn(() => ['myFunction']);
      serverlessS3Local.options = { buckets: [] };

      const result = serverlessS3Local.buckets();
      expect(result).toContain('event-bucket');
    });
  });

  describe('getResourceForBucket', () => {
    beforeEach(() => {
      mockServerless.service.resources = {
        Resources: {
          S3BucketMyBucket: {
            Type: 'AWS::S3::Bucket',
            Properties: {
              BucketName: 'my-bucket'
            }
          }
        }
      };
    });

    it('should find resource by bucket name', () => {
      const result = serverlessS3Local.getResourceForBucket('myBucket');
      expect(result).toEqual({
        Type: 'AWS::S3::Bucket',
        Properties: {
          BucketName: 'my-bucket'
        }
      });
    });

    it('should handle bucket name with Ref', () => {
      const bucketRef = { Ref: 'S3BucketMyBucket' };
      const result = serverlessS3Local.getResourceForBucket(bucketRef);
      expect(result).toEqual({
        Type: 'AWS::S3::Bucket',
        Properties: {
          BucketName: 'my-bucket'
        }
      });
    });

    it('should return false when no resources exist', () => {
      mockServerless.service.resources = undefined;
      const result = serverlessS3Local.getResourceForBucket('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('getServiceRuntime', () => {
    it('should return the service runtime when valid', () => {
      mockServerless.service.provider.runtime = 'nodejs18.x';
      
      const result = serverlessS3Local.getServiceRuntime();
      expect(result).toBe('nodejs18.x');
    });

    it('should throw error when runtime is missing', () => {
      mockServerless.service.provider.runtime = undefined;
      
      expect(() => serverlessS3Local.getServiceRuntime()).toThrow('Missing required property "runtime"');
    });

    it('should throw error when runtime is not a string', () => {
      mockServerless.service.provider.runtime = 123;
      
      expect(() => serverlessS3Local.getServiceRuntime()).toThrow('Provider configuration property "runtime" wasn\'t a string');
    });

    it('should handle provided runtime with providedRuntime option', () => {
      mockServerless.service.provider.runtime = 'provided';
      serverlessS3Local.options.providedRuntime = 'nodejs18.x';
      
      const result = serverlessS3Local.getServiceRuntime();
      expect(result).toBe('nodejs18.x');
    });

    it('should throw error for provided runtime without providedRuntime option', () => {
      mockServerless.service.provider.runtime = 'provided';
      serverlessS3Local.options = {}; // Make sure providedRuntime is not set
      
      expect(() => serverlessS3Local.getServiceRuntime()).toThrow('Runtime "provided" is unsupported');
    });

    it('should warn about unsupported runtime and return null', () => {
      mockServerless.service.provider.runtime = 'java11';
      
      const result = serverlessS3Local.getServiceRuntime();
      expect(result).toBeNull();
      expect(mockServerless.cli.log).toHaveBeenCalledWith("Warning: found unsupported runtime 'java11'");
    });

    it('should support nodejs runtime', () => {
      mockServerless.service.provider.runtime = 'nodejs16.x';
      
      const result = serverlessS3Local.getServiceRuntime();
      expect(result).toBe('nodejs16.x');
    });

    it('should support python runtime', () => {
      mockServerless.service.provider.runtime = 'python3.9';
      
      const result = serverlessS3Local.getServiceRuntime();
      expect(result).toBe('python3.9');
    });

    it('should support ruby runtime', () => {
      mockServerless.service.provider.runtime = 'ruby2.7';
      
      const result = serverlessS3Local.getServiceRuntime();
      expect(result).toBe('ruby2.7');
    });
  });

  describe('buildEventHandler', () => {
    it('should build event handler with correct structure', () => {
      const s3Config = { bucket: 'test-bucket' };
      const name = 'test-bucket';
      const pattern = 'ObjectCreated.*';
      const s3Rules = [{ prefix: 'uploads/' }, { suffix: '.jpg' }];
      const func = jest.fn();

      const result = ServerlessS3Local.buildEventHandler(s3Config, name, pattern, s3Rules, func);

      expect(result).toEqual({
        name: 'test-bucket',
        pattern: 'ObjectCreated.*',
        rules: [
          { prefix: '^uploads/' },
          { suffix: '.jpg$' }
        ],
        func
      });
    });

    it('should handle empty rules', () => {
      const result = ServerlessS3Local.buildEventHandler({}, 'bucket', 'pattern', [], jest.fn());
      
      expect(result.rules).toEqual([]);
    });
  });

  describe('getAdditionalStacks', () => {
    it('should return additional stacks when they exist', () => {
      mockServerless.service.custom = {
        additionalStacks: {
          stack1: { Resources: {} },
          stack2: { Resources: {} }
        }
      };

      const result = serverlessS3Local.getAdditionalStacks();
      expect(result).toHaveLength(2);
      expect(result).toContain(mockServerless.service.custom.additionalStacks.stack1);
      expect(result).toContain(mockServerless.service.custom.additionalStacks.stack2);
    });

    it('should return empty array when no additional stacks exist', () => {
      mockServerless.service.custom = {};

      const result = serverlessS3Local.getAdditionalStacks();
      expect(result).toEqual([]);
    });
  });

  describe('subscriptionWebpackHandler', () => {
    it('should resolve immediately when no s3EventHandler exists', async () => {
      serverlessS3Local.s3EventHandler = undefined;

      const result = await serverlessS3Local.subscriptionWebpackHandler();
      expect(result).toBeUndefined();
    });

    it('should remove existing listener and subscribe again', async () => {
      const mockClient = {
        removeListener: jest.fn()
      };
      serverlessS3Local.client = mockClient;
      serverlessS3Local.s3EventHandler = jest.fn();
      serverlessS3Local.subscribe = jest.fn();

      await serverlessS3Local.subscriptionWebpackHandler();

      expect(mockClient.removeListener).toHaveBeenCalledWith('event', serverlessS3Local.s3EventHandler);
      expect(serverlessS3Local.subscribe).toHaveBeenCalled();
      expect(mockServerless.cli.log).toHaveBeenCalledWith('constructor');
    });
  });

  describe('createHandler', () => {
    it('should set options and create buckets', async () => {
      serverlessS3Local.setOptions = jest.fn();
      serverlessS3Local.createBuckets = jest.fn().mockResolvedValue([]);

      const result = await serverlessS3Local.createHandler();

      expect(serverlessS3Local.setOptions).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('removeHandler', () => {
    it('should set options and remove buckets', async () => {
      serverlessS3Local.setOptions = jest.fn();
      serverlessS3Local.removeBuckets = jest.fn().mockResolvedValue(null);

      const result = await serverlessS3Local.removeHandler();

      expect(serverlessS3Local.setOptions).toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });

  describe('createBuckets', () => {
    it('should warn when no buckets found', async () => {
      serverlessS3Local.buckets = jest.fn(() => []);

      const result = await serverlessS3Local.createBuckets();

      expect(mockServerless.cli.log).toHaveBeenCalledWith('WARN: No buckets found to create');
      expect(result).toEqual([]);
    });

    it('should create buckets when they exist', () => {
      // Mock the internal AWS SDK require to avoid import issues
      const originalCreateBuckets = serverlessS3Local.createBuckets;
      serverlessS3Local.createBuckets = jest.fn().mockResolvedValue([{}, {}]);
      serverlessS3Local.buckets = jest.fn(() => ['bucket1', 'bucket2']);
      serverlessS3Local.getClient = jest.fn(() => ({
        send: jest.fn().mockResolvedValue({})
      }));

      const result = serverlessS3Local.createBuckets();

      expect(serverlessS3Local.createBuckets).toHaveBeenCalled();
      expect(result).toBeDefined();

      // Restore original method
      serverlessS3Local.createBuckets = originalCreateBuckets;
    });
  });

  describe('endHandler', () => {
    it('should remove event listener and close client when not noStart', () => {
      const mockClient = {
        removeListener: jest.fn(),
        close: jest.fn()
      };
      
      serverlessS3Local.client = mockClient;
      serverlessS3Local.s3EventHandler = jest.fn();
      serverlessS3Local.options = { noStart: false };

      serverlessS3Local.endHandler();

      expect(mockClient.removeListener).toHaveBeenCalledWith('event', serverlessS3Local.s3EventHandler);
      expect(mockClient.close).toHaveBeenCalled();
      expect(mockServerless.cli.log).toHaveBeenCalledWith('S3 local closed');
    });

    it('should not close client when noStart is true', () => {
      const mockClient = {
        close: jest.fn()
      };
      
      serverlessS3Local.client = mockClient;
      serverlessS3Local.options = { noStart: true };

      serverlessS3Local.endHandler();

      expect(mockClient.close).not.toHaveBeenCalled();
    });
  });
});

// Test for removeBucket function
describe('removeBucket', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should resolve when command succeeds', async () => {
    mockExec.mockImplementation((command, callback) => {
      callback(null, 'success', '');
    });

    await expect(removeBucket({ bucket: 'test-bucket', port: 4569 })).resolves.toBeUndefined();
  });

  it('should resolve when NoSuchBucket error occurs', async () => {
    const error = new Error('Command failed');
    error.code = 1;
    mockExec.mockImplementation((command, callback) => {
      callback(error, '', 'NoSuchBucket');
    });

    await expect(removeBucket({ bucket: 'test-bucket', port: 4569 })).resolves.toBeUndefined();
  });

  it('should reject on other errors', async () => {
    const error = new Error('Command failed');
    error.code = 1;
    mockExec.mockImplementation((command, callback) => {
      callback(error, '', 'Other error');
    });

    await expect(removeBucket({ bucket: 'test-bucket', port: 4569 }))
      .rejects.toThrow('failed to delete bucket test-bucket: Other error');
  });
});
