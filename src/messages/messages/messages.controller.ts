import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { MessagesService } from '../messages.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth/jwt-auth.guard';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get()
  async getMessages(@Query('roomId') roomId: string, @Request() req) {
    const user = req.user;
    return this.messagesService.getMessagesByRoomId(roomId, user.sub, user.role);
  }
}
