// SPDX-License-Identifier: MIT
// Copyright (c) 2025 LMRouter Contributors

import fs from "fs/promises";

import type { LMRouterConfig } from "@lmrouter/cli/types";
import yaml from "yaml";

type LMRouterConfigTemplate = LMRouterConfig & {
  provider_api_keys: Record<string, string>;
};

const combineYamlFiles = async <T>(
  path: string,
): Promise<Record<string, T>> => {
  const stat = await fs.stat(path);
  if (stat.isFile() && path.endsWith(".yaml")) {
    const fileContents = await fs.readFile(path, "utf8");
    return yaml.parse(fileContents) as Record<string, T>;
  }

  if (!stat.isDirectory()) {
    return {};
  }

  const result: Record<string, T> = {};
  const files = await fs.readdir(path);
  for (const file of files) {
    const fileResult = await combineYamlFiles<T>(path + "/" + file);
    Object.assign(result, fileResult);
  }
  return result;
};

const main = async () => {
  const templateFromEnv = process.env.LMROUTER_CONFIG_TEMPLATE;
  if (!templateFromEnv) {
    console.error("LMROUTER_CONFIG_TEMPLATE is not set");
    process.exit(1);
  }

  const template = yaml.parse(
    Buffer.from(templateFromEnv, "base64").toString("utf8"),
  ) as LMRouterConfigTemplate;

  template.providers = await combineYamlFiles("library/providers");
  template.models = await combineYamlFiles("library/models");

  for (const [key, value] of Object.entries(template.providers)) {
    value.api_key = template.provider_api_keys[key];
  }

  const config = {
    ...template,
    provider_api_keys: undefined,
  } as LMRouterConfig;

  console.log(JSON.stringify(config));
};

main();
