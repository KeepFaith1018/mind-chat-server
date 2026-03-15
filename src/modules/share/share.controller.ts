import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthGuard } from '@common/guards/auth.guard';
import { Auth } from '@common/decorators/auth.decorator';
import { CurrentUser } from '@common/decorators/currentUser.decorator';
import { JwtUser } from '@app/types/jwtUser.interface';
import { ShareService } from './share.service';
import { CreateShareDto } from './dto/create-share.dto';

@Controller('share')
@UseGuards(AuthGuard)
export class ShareController {
  constructor(private readonly shareService: ShareService) {}

  @Post()
  @Auth()
  async createShare(@CurrentUser() user: JwtUser, @Body() dto: CreateShareDto) {
    return await this.shareService.createShareLink(user.sub.toString(), dto);
  }

  @Get(':linkId')
  @Header('Cache-Control', 'public, max-age=60')
  async getSharedConversation(@Param('linkId') linkId: string) {
    return await this.shareService.getSharedConversation(linkId);
  }

  @Get(':linkId/page')
  async renderSharePage(@Param('linkId') linkId: string, @Res() res: Response) {
    const html = await this.shareService.renderSharePage(linkId);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }
}
