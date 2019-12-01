export declare namespace SecureConfigurations {
    namespace Interfaces {
        namespace Configuration {
            interface All {
                integrityAlgorithm: string;
                isDefaultBackupKey: boolean;
                projectRoot: string;
                backupKey: string;
                backupDirectory: string;
                backupFiles: string[];
            }
            interface Merge {
                integrityAlgorithm?: string;
                isDefaultBackupKey?: boolean;
                projectRoot?: string;
                backupKey: string;
                backupDirectory: string;
                backupFiles: string[];
            }
        }
    }
    const Configure: (to: Interfaces.Configuration.Merge) => void;
    namespace Run {
        const Integrity: (configsLoaded: string[], preSpace?: string, innerBreak?: string) => void;
        const Restore: () => void;
        const Backup: () => void;
    }
}
