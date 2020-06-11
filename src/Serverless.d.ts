declare namespace Serverless {
  interface Config {
    plugins: string[];
    provider: {
      name: string;
      package: Serverless.Package;
    };
    functions: Serverless.Functions;
    package: Serverless.Package;
    custom?: {
      [pluginName: string]: Partial<PluginConfig>;
    };
  }

  interface Functions {
    [key: string]: Serverless.Function;
  }

  interface Function {
    handler: string;
    package: Serverless.Package;
  }

  interface Package {
    include: string[];
    exclude: string[];
    artifact?: string;
    individually?: boolean;
  }

  interface PluginConfig {
    originalServicePath: string;
    tsconfigPath: string;
  }
}

export { Serverless };
