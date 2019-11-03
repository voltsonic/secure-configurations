# Secure Configurations

##### 

![Status](https://img.shields.io/badge/status-stable-green) [![npm](https://img.shields.io/npm/v/secure-configurations?logo=npm)](https://www.npmjs.com/package/secure-configurations "npm")   

a more simple approach to securing files with keybase (or any other folder that at rest is encrypted)

this project can be used in non nodejs projects (but still requires nodejs to run, aka you can backup/restore any type of files)

[Changelog](./CHANGELOG.md)

To install from npm:

    npm i --save secure-configurations

This is intended to backup your configurations to a safe location.

Several options include:

-   Keybase (examples, this is the most seamless experience because you can setup Keybase to require your passphrase on login which secures the configurations at rest)
-   VeraCrypt (mount the drive and configure to that drive).

Check [Example Setup](./example-setup/README.md) for a good introduction on how to use this library.
