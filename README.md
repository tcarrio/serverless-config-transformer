[![builds.sr.ht status](https://builds.sr.ht/~tcarrio/serverless-config-transformer/.build.yml.svg)](https://builds.sr.ht/~tcarrio/serverless-config-transformer/.build.yml?) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

# serverless-config-transformer

A simple package for transforming the Serverless config at build time. This was
used for a gulpfile initially, but should be applicable otherwise. The original
idea was to allow local development plugins to be different from those used for
the production deployment.

## How to use

This file is a reduced example based on a production gulpfile.

```ts
import { dest, series, src, task } from "gulp";
import ts from "gulp-typescript";
import merge from "merge2";
import {
  Serverless,
  ServerlessConfigTransformer,
} from "@0xc/serverless-config-transformer";
/* eslint-disable @typescript-eslint/no-var-requires */
const del = require("del");
const serverlessGulp = require("serverless-gulp");

const currentFolder = ".";
const backupFolder = ".backup";
const slsFile = "serverless.yml";

const slsFilePath = `${currentFolder}/${slsFile}`;
const backupSlsFilePath = `${backupFolder}/${slsFile}`;
const overwrite = { overwrite: true };

const serverlessConfigTransformer = new ServerlessConfigTransformer({
  converter: config => {
    config.plugins = ["serverless-webpack"];
    config.provider.package.include = ["dist/**"];
    config.custom = { webpack: config.custom!.webpack };
    config.functions = Object.keys(config.functions).reduce(
      (functions, key) => ({
        ...functions,
        [key]: {
          ...config.functions[key],
          handler: config.functions[key].handler.replace(/^src\//, "dist/"),
        },
      }),
      {} as Serverless.Functions,
    );

    return config;
  },
});

function backupConfig() {
  return src(slsFilePath).pipe(dest(backupFolder));
}

function updateConfig() {
  return src(slsFilePath, { read: true }).pipe(serverlessConfigTransformer);
}

function restoreConfig() {
  return src(backupSlsFilePath).pipe(dest(currentFolder, overwrite));
}

const tsProject = ts.createProject("tsconfig.build.json");
const outDir = "dist";

function compile(includeSourceMaps = false) {
  return () => {
    const srcs = tsProject.src().pipe(tsProject());

    if (includeSourceMaps) {
      return merge(srcs.js.pipe(dest(outDir)), srcs.dts.pipe(dest(outDir)));
    }

    return srcs.js.pipe(dest(outDir));
  };
}

function clean() {
  return del([outDir]);
}

task("clean", clean);
task("build", series("clean", compile(false)));

task("config:backup", backupConfig);
task("config:update", updateConfig);
task("config:restore", restoreConfig);

task("predeploy", series("config:backup", "config:update", "build"));
task("postdeploy", series("config:restore"));
```

This package only handles transformation of the Serverless config, which is a
literal file transformation. You should backup and restore the original config
yourself. Or at the very least, **don't commit the changes made**.
