# Dotenv (.env) File Manifest Parser

This library defines a YAML format for sourcing .env file values from a data store of your choice

## YAML format Example

Input YAML file:
```
---
version: 1
configurations:
  -
    key: MY_FOO_KEY
    valueFrom: foo-key
    description: "This is a really important value"
    defaultValue: bar

```

Intended output .env file:
```
# This is a really important value
MY_FOO_KEY=bar

```


## More Info

See the typings for [ManifestRecord](src/types.ts#L6)
and [ConfigStore](src/types.ts#L73)
