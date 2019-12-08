# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.2] - 2019-12-08
### Fixed
- Missing (restore/backup) feedback when one side is missing.

### Cleaned up
- Proper color for backup/restore difference in integrity checks.

## [2.1.1] - 2019-12-02
### Cleaned up
- Output for proper spacing.
- Recommended command not having the `--map-key`

## [2.1.0] - 2019-12-01
### Added
- Diff showing of changes between configs (option `--show-diff`)

## [2.0.10] - 2019-12-01
### Added
- `--config` option for loading custom configs per developer.
### Fixed
- Integrity output cleaned up (sorting and recommended command).

## [2.0.7] - 2019-11-29
### Added
- Preview images.

### Updated
- Replaced logs-symbol with figures (more options)
- Added chalk for output coloring.
- Cleaned up output for commands
    - Integrity
    - Backup
    - Restore

### Fixed
- Added shebang for proper command wrapping.
- Project `package.json` finder implemented.

## [2.0.0] - 2019-11-29
### Updated
- To typescript node module. 
- Support for wildcard files.
- Setup as global command.
- Configuration via `package.json` with `secure-configurations` key.
- Example to new standards.

[2.1.2]: https://github.com/voltsonic/secure-configurations/compare/v2.1.1...v2.1.2
[2.1.1]: https://github.com/voltsonic/secure-configurations/compare/v2.1.0...v2.1.1
[2.1.0]: https://github.com/voltsonic/secure-configurations/compare/v2.0.10...v2.1.0
[2.0.10]: https://github.com/voltsonic/secure-configurations/compare/v2.0.7...v2.0.10
[2.0.7]: https://github.com/voltsonic/secure-configurations/compare/v2.0.0...v2.0.7
[2.0.0]: https://github.com/voltsonic/secure-configurations/releases/tag/v2.0.0
