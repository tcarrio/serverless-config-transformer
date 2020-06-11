import ServerlessConfigTransformer, {
  Serverless,
  TransformFunction,
} from "../src";

jest.mock("fs");
jest.unmock("js-yaml");
jest.unmock("stream");

import * as yaml from "js-yaml";
// const yamlActual = jest.requireActual("js-yaml");
import * as fs from "fs";
import { Readable, Writable } from "stream";

describe("Serverless Config Transformer", () => {
  it("should update the object according to the transformer method", async () => {
    const input: Serverless.Config = {
      plugins: ["plugin1", "plugin2", "pluginA", "pluginB"],
      provider: {
        name: "something",
        package: {
          include: [],
          exclude: [],
        },
      },
      functions: {},
      package: {
        include: [],
        exclude: [],
      },
      custom: {
        plugin1: {},
        plugin2: {},
        pluginA: {},
        pluginB: {},
      },
    };

    console.log("Creating converter");
    const converter: TransformFunction = (config: Serverless.Config) => {
      const plugins = config.plugins.filter(p => /^plugin\d$/.test(p));
      config.plugins = plugins;
      config.custom = plugins.reduce(
        (m, k) => ({ ...m, [k]: config.custom[k] }),
        {},
      );
      return config;
    };

    const testStream = new Readable({ objectMode: true });
    const transformer = new ServerlessConfigTransformer({ converter });

    // I hate this promise creation methodology but the streams had issues when
    // they were inside the scope of the promise function. So here it is.
    let resolve = null;
    const testCompletion = new Promise(res => {
      resolve = res;
    });

    const counter = jest.fn();
    const expectStream = new Writable({ objectMode: true });
    expectStream._write = (obj, _enc, done) => {
      counter();
      const contents = yaml.load(obj.contents);
      expect(contents.plugins).toHaveLength(2);
      expect(Object.keys(contents.custom)).toHaveLength(2);
      resolve();
      done();
    };

    testStream.pipe(transformer);
    transformer.pipe(expectStream);

    testStream.push({
      contents: Buffer.from(yaml.dump(input)),
      isStream: () => false,
    });
    testStream.push(null);

    await testCompletion;

    expect(counter).toHaveBeenCalledTimes(1);
    expect(fs.writeFile).toHaveBeenCalledTimes(1);
  });
});
