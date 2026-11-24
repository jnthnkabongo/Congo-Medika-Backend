import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { extname, join } from 'path';
import { MessagesService } from '../messages.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth/jwt-auth.guard';

// Type minimal du fichier uploadé par multer (évite la dépendance
// aux types globaux Express.Multer, non inclus dans tsconfig).
interface UploadedAudioFile {
  buffer: Buffer;
  originalname: string;
  mimetype?: string;
}

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get()
  async getMessages(@Query('roomId') roomId: string, @Request() req) {
    const user = req.user;
    return this.messagesService.getMessagesByRoomId(roomId, user.sub, user.role);
  }

  /// Upload d'un message vocal. Le fichier est stocké dans
  /// <backend>/uploads/audio/ et servi en statique sur /uploads/...
  @Post('upload-audio')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 Mo max
    }),
  )
  async uploadAudio(@UploadedFile() file: UploadedAudioFile) {
    if (!file) {
      throw new BadRequestException('Fichier audio requis');
    }
    if (!file.mimetype?.startsWith('audio/')) {
      throw new BadRequestException('Le fichier doit être un audio');
    }

    const ext = extname(file.originalname) || '.m4a';
    const filename = `audio-${randomUUID()}${ext}`;
    const dir = join(process.cwd(), 'uploads', 'audio');
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, filename), file.buffer);

    return { url: `/uploads/audio/${filename}` };
  }
}
