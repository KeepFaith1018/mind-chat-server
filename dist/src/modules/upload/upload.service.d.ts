import { PrismaService } from '../../common/prisma/prisma.service';
export declare class UploadService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    uploadFile(userId: string, file: Express.Multer.File): Promise<{
        id: string;
        filename: string;
        size: number;
        contentPreview: string;
    }>;
    private extractText;
    getFileContent(userId: string, fileId: string): Promise<string>;
}
