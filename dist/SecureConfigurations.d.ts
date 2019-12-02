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
                integrityAlgorithm?: string;
                projectRoot?: string;
                backupKey: string;
                backupDirectory: string;
                backupFiles: string[];
            }
        }
        namespace Integrity {
            interface DiffInterface {
                count: number;
                value: string;
                added?: true;
                removed?: true;
            }
            interface IntegrityItemInterface {
                fileRelative: string;
                backup: {
                    file: string;
                    hash: string;
                    lastModified: null | number;
                    missing: boolean;
                };
                diff?: DiffInterface[];
                project: {
                    file: string;
                    hash: string;
                    lastModified: null | number;
                    missing: boolean;
                };
            }
            interface IntegrityInterface {
                recommendedActions: string[];
                files: IntegrityItemInterface[];
            }
        }
    }
    const Configure: (to: Interfaces.Configuration.Merge) => void;
    namespace Run {
        type CallbackHeader = (mapKey: string, action: string) => void;
        type CallbackFile = (isNew: boolean, isWrite: boolean, pathRelative: string) => void;
        type CallbackError = (error: any) => void;
        export const Integrity: (cbIntegrity: (integritys: Interfaces.Integrity.IntegrityInterface) => void, cbRejected: (error: string) => void) => void;
        export const Restore: (cbHeader: CallbackHeader, cbFile: CallbackFile, cbError?: CallbackError) => void;
        export const Backup: (cbHeader: CallbackHeader, cbFile: CallbackFile, cbError?: CallbackError) => void;
        export {};
    }
}
