import { PrismaService } from '@common/prisma/prisma.service';
export interface ModelCapabilityRequest {
    webSearch?: boolean;
    reasoning?: boolean;
    fileQa?: boolean;
}
export interface ResolvedModelConfig {
    modelKey: string;
    displayName: string;
    provider: string;
    enabled: boolean;
    isDefault: boolean;
    maxContextTokens: number;
    supportsWebSearch: boolean;
    supportsReasoning: boolean;
    supportsFileQa: boolean;
    supportsStream: boolean;
    configJson: Record<string, unknown> | null;
}
export interface EffectiveCapabilities {
    webSearch: boolean;
    reasoning: boolean;
    fileQa: boolean;
    stream: boolean;
}
export declare class ModelsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getAvailableModels(): Promise<{
        defaultModel: string;
        models: {
            modelKey: string;
            displayName: string;
            provider: string;
            maxContextTokens: number;
            capabilities: {
                webSearch: boolean;
                reasoning: boolean;
                fileQa: boolean;
                stream: boolean;
            };
        }[];
    }>;
    resolveModelForChat(preferredModelKey?: string): Promise<ResolvedModelConfig>;
    resolveCapabilities(model: ResolvedModelConfig, requested: ModelCapabilityRequest | undefined, hasFiles: boolean): EffectiveCapabilities;
    private queryEnabledModels;
    private mapRow;
}
