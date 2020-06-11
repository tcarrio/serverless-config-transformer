import { Transform, TransformOptions } from "stream";
import * as yaml from "js-yaml";
import * as fs from "fs";
import { StreamFile, BufferFile } from "vinyl";
import { Serverless } from "./Serverless";

export class ServerlessConfigTransformer extends Transform {
  private readonly converter: TransformFunction;
  private readonly persist: boolean;

  public constructor(options?: ServerlessConfigTransformOptions) {
    super(Object.assign({ objectMode: true, passthrough: true }, options));
    this.converter =
      options && options.converter
        ? (this.converter = options.converter)
        : identity;
    this.persist = options ? options.persist !== false : true;
  }

  public _transform(
    file: BufferFile | StreamFile,
    encoding: BufferEncoding,
    callback,
  ) {
    if (file.isStream()) {
      console.error(
        `StreamFile's are not yet supported (${(file as StreamFile).path})`,
      );
      callback(true);
    }

    const config = yaml.load(file.contents.toString(encoding));
    const converted = this.converter(config);
    const newConfig = yaml.dump(converted);
    file.contents = Buffer.from(newConfig, encoding);
    this.push(file, encoding);

    if (this.persist) {
      fs.writeFile(file.path, file.contents, err => {
        callback(err);
      });
    } else {
      callback();
    }
  }

  public _flush(callback: any) {
    callback();
  }
}

function identity(x: any) {
  return x;
}

export type TransformFunction = (
  config: Serverless.Config,
) => Serverless.Config;
export interface ServerlessConfigTransformOptions extends TransformOptions {
  converter: TransformFunction;
  persist?: boolean;
}

export default ServerlessConfigTransformer;

export { Serverless } from "./Serverless";
