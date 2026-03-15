import { Controller, Get } from '@nestjs/common';
import { ModelsService } from './models.service';

@Controller('models')
export class ModelsController {
  constructor(private readonly modelsService: ModelsService) {}

  @Get('available')
  async getAvailableModels() {
    return this.modelsService.getAvailableModels();
  }
}
