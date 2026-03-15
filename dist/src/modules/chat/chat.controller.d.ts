import { Response } from 'express';
import { ChatService } from './chat.service';
import { ChatDto } from './dto/chat.dto';
import { JwtUser } from '@app/types/jwtUser.interface';
export declare class ChatController {
    private readonly chatService;
    constructor(chatService: ChatService);
    chat(user: JwtUser, dto: ChatDto, res: Response): Promise<void>;
}
