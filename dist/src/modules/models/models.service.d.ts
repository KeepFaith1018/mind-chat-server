import { PrismaService } from '@common/prisma/prisma.service';
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
}
