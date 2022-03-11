export interface Manifest {
  version: number
  configurations: ManifestRecord[]
}

export interface ManifestRecord {
  /**
   * The name of the configuration, verbatim the key to be used in the .env file.
   * Should be in UPPER_CAMEL_CASE.
   */
  key: string

  /**
   * The trailing token of the SSM parameter to be used to fulfill the value.
   * (e.g. /dev/manual/<this-is-the-value-from>)
   * Should be in kebab-case, required if defaultValue is empty.
   */
  valueFrom?: string

  /**
   * Optional description to be included as comments in the output.
   */
  description?: string

  /**
   * Optional value literal to be used to fulfill the configuration value,
   * if no valueFrom is provided, the valueFrom doesn't exist, or is empty in SSM.
   */
  defaultValue?: string

  /**
   * Controls whether the value will be built into the AWS task definition.
   */
  isSecret: boolean

  /**
   * Optional paramater to indicate if the process should error if no value is available.
   * Defaults to true.
   */
  isRequired?: boolean
}

export interface EnvironmentRecord {
  key: string
  value: string
  comments: string[]
}

export interface ConfigurationOverrides {
  [key: string]: string
}

export interface KeyValuePair {
  key: string
  value: string
}

export interface SecretKeyValuePair {
  key: string
  valueFrom: string
}

export interface ContainerVars {
  nonSecretContainerVars: KeyValuePair[]
  secretContainerVars: SecretKeyValuePair[]
}

export interface ValueResolution {
  resolvedValue: string
  source: string
}

export interface ConfigStore {
  // get resolved configuration values
  getConfigurationValues: (keys: string[]) => Promise<KeyValuePair[]>
}
