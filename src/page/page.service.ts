import { Injectable } from '@nestjs/common';
import * as AdmZip from 'adm-zip';
import { PrismaService } from '../prisma.service';
import { Prisma } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import puppeteer from 'puppeteer';
import { Cron } from '@nestjs/schedule';
import * as process from 'process';

@Injectable()
export class PageService {
  private static readonly twoGb = 2 * 2 ** 30;

  constructor(public prisma: PrismaService) {}

  async AddPage(page: Buffer, originalName: string): Promise<void> {
    if (page.length > PageService.twoGb || !originalName.endsWith('zip')) {
      this.prisma.eventLog.create({
        data: { message: 'loaded invalid file' } as any,
      });
    }
    const model = await this.prisma.page.create({
      data: { filename: originalName } as Prisma.PageCreateInput,
    });
    await fs.promises.mkdir(
      path.dirname(this.getPathForPage(model.id) + '/in.zip'),
      {
        recursive: true,
      },
    );
    await fs.promises.writeFile(
      this.getPathForPage(model.id) + '/in.zip',
      page,
    );
    await this.prisma.pageToConvertQueue.create({ data: { id: model.id } });
  }

  @Cron('0 * * * * *')
  private async handlePageQueue(): Promise<void> {
    const queue = await this.prisma.pageToConvertQueue.findMany();
    for (const item of queue) {
      const model = await this.prisma.page.findFirst({ where: item });
      await this.convertPage(model);
      await this.prisma.pageToConvertQueue.delete({ where: { id: item.id } });
    }
  }

  private async convertPage(model: {
    id: number;
    createdAt: Date;
    startedAt: Date;
    spendTime: bigint;
    spendMemory: bigint;
    filename: string;
  }): Promise<void> {
    const archiveStream = await fs.promises.readFile(
      this.getPathForPage(model.id) + '/in.zip',
    );
    await this.unpackArchive(
      archiveStream,
      path.join(this.getPathForPage(model.id), 'unpacked'),
    );

    const startTime = Date.now();
    let endTime: number;
    const beginMemUsed = process.memoryUsage().rss;
    let maxUsedMem = beginMemUsed;
    const interval = setInterval(
      () => (maxUsedMem = Math.max(maxUsedMem, process.memoryUsage().rss)),
      50,
    );
    await this.generatePdf(
      this.getPathForPage(model.id),
      './results/id_' + model.id,
    ).then(() => {
      endTime = Date.now();
      clearInterval(interval);
    });

    model.startedAt = new Date(startTime);
    model.spendTime = BigInt(endTime - startTime);
    model.spendMemory = BigInt(maxUsedMem - beginMemUsed);
    await this.prisma.page.update({ data: model, where: { id: model.id } });
  }

  private async generatePdf(
    pathToDir: string,
    pathToSave: string,
  ): Promise<void> {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.goto(
      'file:///' + path.resolve(pathToDir + '/unpacked/') + '/index.html',
    );
    await fs.promises.mkdir(pathToSave, {
      recursive: true,
    });
    await page.pdf({
      path: pathToSave + '/result.pdf',
    });
  }

  private async unpackArchive(data: Buffer, extractTo: string): Promise<void> {
    if (data.byteLength <= 0) return;
    const archive = new AdmZip(Buffer.from(data));
    return new Promise((resolve, reject) =>
      archive.extractAllToAsync(extractTo, true, true, (error) =>
        error ? reject(error) : resolve(),
      ),
    );
  }

  private getPathForPage(id: number): string {
    return `./cache/id_${id}`;
  }
}
