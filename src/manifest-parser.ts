import { readFileSync } from "fs"
import { parse as parseYAML } from "yaml"
import { flatten } from "ramda"
import {
  ConfigStore,
  ConfigurationOverrides,
  ContainerVars,
  EnvironmentRecord,
  Manifest,
  ManifestRecord,
  ValueResolution,
} from "./types"

class ManifestParser {
  storageClient: ConfigStore
  envsToFetch: string[]
  manifestData: Manifest

  constructor(storageClient: ConfigStore, envName: string, manifestFileName: string) {
    this.storageClient = storageClient
    switch (envName) {
      case "prod":
        this.envsToFetch = ["prod"]
        break
      case "dev":
        this.envsToFetch = ["dev"]
        break
      default:
        // order defines priority
        this.envsToFetch = [envName, "sandbox"]
    }
    try {
      const file = readFileSync(manifestFileName, "utf8")
      this.manifestData = parseYAML(file) as Manifest
      console.log("Parsed manifest file: ", manifestFileName)
    } catch (err) {
      console.error("FATAL: could not read or parse manifest file at", manifestFileName, err)
      throw err
    }
  }

  getApplicableConfigurations(config: ManifestRecord) {
    return flatten(
      this.envsToFetch
        // order defines priority
        .map((env) => [`/${env}/${config.valueFrom}`, `/${env}/generated/${config.valueFrom}`]),
    )
  }

  async resolveConfigurationValue(
    config: ManifestRecord,
    overrides: ConfigurationOverrides,
  ): Promise<ValueResolution> {
    if (typeof overrides[config.key] !== "undefined") {
      return {
        source: "overrides",
        resolvedValue: overrides[config.key],
      }
    }

    const returnDefaultValue = () => {
      if (
        !config.valueFrom &&
        !config.defaultValue &&
        (config.isRequired || typeof config.isRequired === "undefined")
      ) {
        throw new Error("Required configuration has no default value and no configuration path")
      } else if (
        !config.defaultValue &&
        (config.isRequired || typeof config.isRequired === "undefined")
      ) {
        throw new Error(
          "Required configuration has no default value, and no valid configurations were found",
        )
      }

      return {
        source: "default",
        resolvedValue: config.defaultValue || "",
      }
    }

    if (!config.valueFrom) {
      return returnDefaultValue()
    }

    const storedValues = await this.storageClient.getConfigurationValues(
      this.getApplicableConfigurations(config),
    )

    // choose first non-falsey value
    const validConfig = storedValues.find((kvp) => kvp.value)
    if (validConfig) {
      return {
        source: validConfig.key,
        resolvedValue: validConfig.value,
      }
    }

    return returnDefaultValue()
  }

  async getLocalEnvironment(overrides: ConfigurationOverrides): Promise<EnvironmentRecord[]> {
    const promises = this.manifestData.configurations.map(async (cfg, index) => {
      try {
        const resolvedValue = await this.resolveConfigurationValue(cfg, overrides)
        const record: EnvironmentRecord = {
          key: cfg.key,
          value: resolvedValue.resolvedValue,
          comments: [`from ${resolvedValue.source}`],
        }
        if (cfg.description) {
          record.comments.push(cfg.description)
        }
        return record
      } catch (err) {
        console.error("FATAL: could not get value for config", cfg.key, err)
        throw err
      }
    })
    return Promise.all(promises)
  }

  async getContainerVars(): Promise<ContainerVars> {
    const output: ContainerVars = {
      nonSecretContainerVars: [],
      secretContainerVars: [],
    }
    const promises = this.manifestData.configurations.map(async (cfg, index) => {
      if (cfg.isSecret) {
        const storedValues = await this.storageClient.getConfigurationValues(
          this.getApplicableConfigurations(cfg),
        )
        const validConfig = storedValues.find((kvp) => kvp.value)
        if (validConfig) {
          output.secretContainerVars.push({
            key: cfg.key,
            valueFrom: validConfig.key,
          })
        } else {
          throw new Error(`FATAL: no values available for secret configuration key ${cfg.key}`)
        }
      } else {
        output.nonSecretContainerVars.push({
          key: cfg.key,
          value: (await this.resolveConfigurationValue(cfg, {})).resolvedValue,
        })
      }
    })
    await Promise.all(promises)
    return output
  }
}

export default ManifestParser
