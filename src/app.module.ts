import { Module } from '@nestjs/common';
import { PageController } from './page/page.controller';
import { PageService } from './page/page.service';
import { PrismaService } from './prisma.service';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [PageController],
  providers: [PageService, PrismaService],
})
export class AppModule {}
