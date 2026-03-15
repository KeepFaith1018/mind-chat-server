import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ChatService } from './chat.service';
import { ChatDto } from './dto/chat.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/currentUser.decorator';
import { JwtUser } from '@app/types/jwtUser.interface';
import { Auth } from '@app/common/decorators/auth.decorator';
import { ChatCapabilityPreviewResponse } from './chat.service';
import { RateLimitGuard } from '@common/guards/rate-limit.guard';
import { RateLimit } from '@common/decorators/rate-limit.decorator';

@Controller('chat')
@UseGuards(AuthGuard, RateLimitGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @Auth()
  @RateLimit(10, 60)
  async chat(
    @CurrentUser() user: JwtUser,
    @Body() dto: ChatDto,
    @Res() res: Response,
  ) {
    await this.chatService.chat(user.sub.toString(), dto, res);
  }

  @Get('capabilities')
  @Auth()
  @RateLimit(60, 60)
  async getCapabilities(
    @CurrentUser() user: JwtUser,
    @Query('model') model?: string,
    @Query('conversationId') conversationId?: string,
    @Query('webSearch') webSearch?: string,
    @Query('reasoning') reasoning?: string,
    @Query('fileQa') fileQa?: string,
    @Query('fileCount') fileCount?: string,
  ): Promise<ChatCapabilityPreviewResponse> {
    return await this.chatService.getCapabilities(user.sub.toString(), {
      model,
      conversationId,
      webSearch,
      reasoning,
      fileQa,
      fileCount,
    });
  }
}
