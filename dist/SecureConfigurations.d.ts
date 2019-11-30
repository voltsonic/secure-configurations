export declare namespace SecureConfigurations {
    namespace Interfaces {
        namespace Configuration {
            interface All {
                integrityAlgorithm: string;
                projectRoot: string;
                backupKey: string;
                backupDirectory: string;
                backupFiles: string[];
            }
            interface Merge {
                projectRoot?: string;
                integrityAlgorithm?: string;
                backupKey: string;
                backupDirectory: string;
                backupFiles: string[];
            }
        }
    }
    const Configure: (to: Interfaces.Configuration.Merge) => void;
    namespace Run {
        const Integrity: () => void;
        const Restore: () => void;
        const Backup: () => void;
    }
}
