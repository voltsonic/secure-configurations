# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.8] - 2019-12-01
### Added
- `--config` option for loading custom configs per developer.

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

[2.0.8]: https://github.com/voltsonic/secure-configurations/compare/v2.0.7...v2.0.8
[2.0.7]: https://github.com/voltsonic/secure-configurations/compare/v2.0.0...v2.0.7
[2.0.0]: https://github.com/voltsonic/secure-configurations/releases/tag/v2.0.0
