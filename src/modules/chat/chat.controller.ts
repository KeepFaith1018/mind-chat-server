import { Body, Controller, Post, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ChatService } from './chat.service';
import { ChatDto } from './dto/chat.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/currentUser.decorator';
import { JwtUser } from '@app/types/jwtUser.interface';

@Controller('chat')
@UseGuards(AuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  async chat(
    @CurrentUser() user: JwtUser,
    @Body() dto: ChatDto,
    @Res() res: Response,
  ) {
    await this.chatService.chat(user.sub.toString(), dto, res);
  }
}
