import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { PageService } from './page.service';
import { ApiBody, ApiConsumes, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('page')
@ApiTags('Page')
export class PageController {
  constructor(private readonly pageService: PageService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('page'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        page: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiOkResponse()
  async getHello(
    @UploadedFile()
    page: Express.Multer.File,
  ): Promise<void> {
    page.originalname;
    await this.pageService.AddPage(page.buffer, page.originalname);
  }
}
