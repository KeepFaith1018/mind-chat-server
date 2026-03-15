import { UploadService } from './upload.service';
import { JwtUser } from '@app/types/jwtUser.interface';
export declare class UploadController {
    private readonly uploadService;
    constructor(uploadService: UploadService);
    uploadFile(user: JwtUser, file: Express.Multer.File): Promise<{
        id: string;
        filename: string;
        size: number;
        contentPreview: string;
    }>;
}
