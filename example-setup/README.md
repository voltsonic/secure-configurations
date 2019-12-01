# Example Setup

Pretend this directory is the root of your projects directory and all `secure-configurations` commands are run from within this directory.

### Prepare package.json

This system is configured via your `package.json` file using the `secure-configurations` key.

`files` can be in [glob](https://www.npmjs.com/package/glob) syntax or straight references (relative from the root of your project directory directory, `./` is not necessary and is automatically added).

File: `package.json`
```json
{
  "secure-configurations": {
    "maps": {
      "prod": {
        "files": [
          "config.json",
          "prod/odd-configuration.json"
        ],
        "directory": "C:\\tmp\\test_backup_project\\prod"
      },
      "dev": {
        "files": [
          "config-dev.json",
          "config-dev-*.json",
          "dev/odd-configuration-dev.json"
        ],
        "directory": "C:\\tmp\\test_backup_project\\dev"
      }
    }
  }
}
```

### All Commands

- Ran in project directory with `secure-configurations` setup on global namespace `npm install -g secure-configurations`.

### Integrity Command

`secure-configurations`

This will spit out any out-dated configurations and the recommended backup/restore actions (keep in mind if your backup directory is on a different file systems there could be issues with file stamps so caution should be taken).

### Backup

- `secure-configurations --backup`
    - `prod` key in the above `package.json`
- `secure-configurations --backup --map-key dev`
    - `dev` key in the above `package.json`

##### (with config file)

**Note**: Multiple `--config` can be appended (and are loaded then overwritten into main configuration in order - aka last one has highest priority)

File: `gitignored-config.json`
```json
{
  "maps": {
    "prod": {
      "directory": "C:\\tmp\\test_backup_project\\prod_alt"
    },
    "dev": {
      "files": [
        "random_path/dev/super-odd-configuration-dev.json"
      ]
    }
  }
}
```

- `secure-configurations --backup --config gitignored-config.json`
    - `prod` key in the above `package.json`
    - plus **overwritten** `maps.prod.directory` from `gitignored-config.json`
- `secure-configurations --backup --map-key dev --config gitignored-config.json`
    - `dev` key in the above `package.json`
    - plus **appended** `maps.dev.files` from `gitignored-config.json`

### Restore

- `secure-configurations --restore`
    - this restores the `prod` key in the above `package.json`
- `secure-configurations --restore --map-key dev`
    - this restores the `dev` key in the above `package.json`

##### (with config file)

**Note**: Multiple `--config` can be appended (and are loaded then overwritten into main configuration in order - aka last one has highest priority)

- `secure-configurations --restore --config gitignored-config.json`
    - `prod` key in the above `package.json`
    - plus **overwritten** `maps.prod.directory` from `gitignored-config.json`
- `secure-configurations --restore --map-key dev --config gitignored-config.json`
    - `dev` key in the above `package.json`
    - plus **appended** `maps.dev.files` from `gitignored-config.json`

### Recommended package.json commands for above setup

```json
{
  "scripts": {
    "prod_configs_backup": "secure-configurations --backup",
    "prod_configs_restore": "secure-configurations --restore",
    "dev_configs_backup": "secure-configurations --backup --map-key dev",
    "dev_configs_restore": "secure-configurations --restore --map-key dev"
  }
}
```

This allows future developers to easily figure out where they need to obtain certain configurations (if they aren't required to generate their owns)
