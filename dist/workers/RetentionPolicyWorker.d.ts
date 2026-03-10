export declare class RetentionPolicyWorker {
    private prisma;
    /**
     * Run retention policies - archive/delete items based on retention rules
     * This should be called by a cron job nightly
     */
    applyRetentionPolicies(): Promise<void>;
    /**
     * Apply a single retention policy
     */
    private applyPolicy;
    /**
     * Apply retention policy to test runs
     */
    private applyTestRunPolicy;
    /**
     * Apply retention policy to test cases
     */
    private applyTestCasePolicy;
    /**
     * Apply retention policy to defects
     */
    private applyDefectPolicy;
}
export declare const retentionPolicyWorker: RetentionPolicyWorker;
//# sourceMappingURL=RetentionPolicyWorker.d.ts.map