import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BusinessException } from '../../common/exception/businessException';
import { ErrorCode } from '../../common/utils/errorCodeMap';
import * as fs from 'fs';
import { PDFParse } from 'pdf-parse';
import * as mammoth from 'mammoth';

@Injectable()
export class UploadService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 上传并解析文件
   */
  async uploadFile(userId: string, file: Express.Multer.File) {
    if (!file) {
      throw new BusinessException(ErrorCode.PARAM_ERROR, '文件不能为空');
    }

    // 1. 提取文本内容
    let content = '';
    try {
      content = await this.extractText(file);
    } catch (error) {
      console.error('File parse error:', error);
      throw new BusinessException(
        ErrorCode.FILE_TYPE_UNSUPPORTED,
        '文件解析失败',
      );
    }

    // 2. 保存文件记录 (这里暂时只保存元数据，实际文件存储可接 S3/OSS)
    // 注意：当前实现没有实际将文件移动到持久化目录，依赖 Multer 的临时存储或配置
    // 如果需要长期存储原文件，需在此处处理 fs.rename 或上传 OSS
    const savedFile = await this.prisma.file.create({
      data: {
        userId,
        filename: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        path: file.path, // Multer 默认保存的路径
        content: content,
      },
    });

    return {
      id: savedFile.id,
      filename: savedFile.filename,
      size: savedFile.size,
      contentPreview: content.slice(0, 200) + '...',
    };
  }

  /**
   * 提取文件文本
   */
  private async extractText(file: Express.Multer.File): Promise<string> {
    const buffer = fs.readFileSync(file.path);

    if (file.mimetype === 'application/pdf') {
      const parser = new PDFParse({
        data: buffer,
      });

      const result = await parser.getText();

      return result.text;
    }
    if (
      file.mimetype ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.mimetype === 'application/msword'
    ) {
      const result = await mammoth.extractRawText({ buffer });
      return result.value.replace(/\n/g, ' ');
    }

    if (file.mimetype === 'text/plain' || file.mimetype === 'text/markdown') {
      return buffer.toString('utf-8');
    }

    throw new Error('Unsupported file type');
  }

  /**
   * 获取文件内容
   */
  async getFileContent(userId: string, fileId: string) {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId, userId },
    });

    if (!file) {
      throw new BusinessException(ErrorCode.FILE_NOT_FOUND);
    }

    return file.content || '';
  }
}
