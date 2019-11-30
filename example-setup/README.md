# Example Setup

Pretend this directory is the root of your projects directory.

### Prepare package.json

This system is configured via your `package.json` file using the `secure-configurations` key.

`files` can be in [glob](https://www.npmjs.com/package/glob) syntax or straight references (relative from the root of your project directory directory, `./` is not necessary and is automatically added).

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

- Ran in project directory with `secure-configurations` setup on global namespace.

### Integrity Command

`secure-configurations`

This will spit out any out-dated configurations and the recommended backup/restore actions (keep in mind if your backup directory is on a different file systems there could be issues with file stamps so caution should be taken).

### Backup

- `secure-configurations --backup`
    - this backups the `prod` key in the above `package.json`
- `secure-configurations --backup -m dev`
    - this backups the `dev` key in the above `package.json`

### Restore

- `secure-configurations --restore`
    - this restores the `prod` key in the above `package.json`
- `secure-configurations --restore -m dev`
    - this restores the `dev` key in the above `package.json`

### Recommended package.json commands for above setup

```json
{
  "scripts": {
    "prod_configs_backup": "secure-configurations --backup",
    "prod_configs_restore": "secure-configurations --restore",
    "dev_configs_backup": "secure-configurations --backup -m dev",
    "dev_configs_restore": "secure-configurations --restore -m dev"
  }
}
```

This allows future developers to easily figure out where they need to obtain certain configurations (if they aren't required to generate their owns)
