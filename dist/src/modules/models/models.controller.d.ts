import { ModelsService } from './models.service';
export declare class ModelsController {
    private readonly modelsService;
    constructor(modelsService: ModelsService);
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
