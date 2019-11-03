# Secure Configurations

[comment_badge_management_start]: <hidden__do_not_remove>
[![repository badge](scripts/badges/repository.png)](https://github.com/voltsonic/secure-configurations.git) ![version badge](scripts/badges/version.png)

[comment_badge_management_end]: <hidden__do_not_remove>

a more simple approach to securing files with keybase (or any other folder that at rest is encrypted)

this project can be used in non nodejs projects (but still requires nodejs to run, aka you can backup/restore any type of files)

[Changelog](./CHANGELOG.md)

To install from npm:

    npm i --save secure-configurations

This is intended to backup your configurations to a safe location.

Several options include:

-   Keybase (examples, this is the most seamless experience because you can setup Keybase to require your passphrase on login which secures the configurations at rest)
-   VeraCrypt (mount the drive and configure to that drive).

Check [Example Setup](https://github.com/voltsonic/secure-configurations/blob/HEAD/example-setup) for a good introduction on how to use this library.
