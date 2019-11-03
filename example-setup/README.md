# Example Setup

Pretend this directory is the root of your projects directory.

You may also re-structure the directories to your choosing since the script can operate anywhere.

##### Backup/Restore Example Commands

- Production
    - Backup: `node scripts/configs/prod/backup.js`
    - Restore: `node scripts/configs/prod/restore.js`
- Developer
    - Backup: `node scripts/configs/dev/backup.js`
    - Restore: `node scripts/configs/dev/restore.js`

Note: recommended to .gitignore your config.json under `scripts/configs/config.json` that way each developer doesn't have to update their "private" storage locations for developer configurations.

## Recommended package.json adjustments

```json
{
  "scripts": {
    "prod_configs_backup": "node scripts/configs/prod/backup.js",
    "prod_configs_restore": "node scripts/configs/prod/restore.js",
    "dev_configs_backup": "node scripts/configs/dev/backup.js",
    "dev_configs_restore": "node scripts/configs/dev/restore.js"
  }
}
```