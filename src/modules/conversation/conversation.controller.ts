import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ConversationService } from './conversation.service';
import {
  CreateConversationDto,
  UpdateConversationDto,
} from './dto/conversation.dto';
import { PaginationDto } from './dto/pagination.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/currentUser.decorator';
import { JwtUser } from '@app/types/jwtUser.interface';

@Controller('conversations')
@UseGuards(AuthGuard)
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  @Post()
  create(
    @CurrentUser() user: JwtUser,
    @Body() createConversationDto: CreateConversationDto,
  ) {
    return this.conversationService.create(
      user.sub.toString(),
      createConversationDto,
    );
  }

  @Get()
  findAll(@CurrentUser() user: JwtUser, @Query() query: PaginationDto) {
    return this.conversationService.findAll(user.sub.toString(), query);
  }

  @Get(':id')
  findOne(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.conversationService.findOne(user.sub.toString(), id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() updateConversationDto: UpdateConversationDto,
  ) {
    return this.conversationService.update(
      user.sub.toString(),
      id,
      updateConversationDto,
    );
  }

  @Delete(':id')
  remove(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.conversationService.remove(user.sub.toString(), id);
  }
}
