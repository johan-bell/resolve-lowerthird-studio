import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { QueueList, QueueItem, ImportFormat } from '@lower-thirds/shared';
import { QueueListEntity } from './entities/queue-list.entity';
import { QueueItemEntity } from './entities/queue-item.entity';
import { ImportExportService } from './import-export.service';
import type { CreateItemDto, CreateListDto, UpdateItemDto } from './dto/queue.dto';

/** Entities carry Date objects; the wire contract uses ISO strings. */
const toListDto = (entity: QueueListEntity): QueueList => ({
  id: entity.id,
  label: entity.label,
  createdAt: entity.createdAt.toISOString(),
  items: [...(entity.items ?? [])]
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
    .map(toItemDto),
});

const toItemDto = (entity: QueueItemEntity): QueueItem => ({
  id: entity.id,
  name: entity.name,
  title: entity.title,
  order: entity.order,
  listId: entity.listId,
});

export interface ImportResult {
  list: QueueList;
  imported: number;
  warnings: string[];
}

@Injectable()
export class QueueService {
  constructor(
    @InjectRepository(QueueListEntity)
    private readonly lists: Repository<QueueListEntity>,
    @InjectRepository(QueueItemEntity)
    private readonly items: Repository<QueueItemEntity>,
    private readonly importExport: ImportExportService,
  ) {}

  async findAllLists(): Promise<QueueList[]> {
    const found = await this.lists.find({ order: { createdAt: 'DESC' } });
    return found.map(toListDto);
  }

  async findList(id: string): Promise<QueueList> {
    const found = await this.lists.findOne({ where: { id } });
    if (!found) throw new NotFoundException(`No queue list with id ${id}`);
    return toListDto(found);
  }

  async createList(dto: CreateListDto): Promise<QueueList> {
    const created = this.lists.create({ label: dto.label, items: [] });
    return toListDto(await this.lists.save(created));
  }

  async renameList(id: string, label: string): Promise<QueueList> {
    const found = await this.lists.findOne({ where: { id } });
    if (!found) throw new NotFoundException(`No queue list with id ${id}`);
    found.label = label;
    return toListDto(await this.lists.save(found));
  }

  async deleteList(id: string): Promise<void> {
    const result = await this.lists.delete({ id });
    if (result.affected === 0) throw new NotFoundException(`No queue list with id ${id}`);
  }

  async addItem(listId: string, dto: CreateItemDto): Promise<QueueItem> {
    await this.findList(listId); // 404s if the list is gone
    const order = dto.order ?? (await this.nextOrder(listId));
    const created = this.items.create({
      listId,
      name: dto.name,
      title: dto.title ?? '',
      order,
    });
    return toItemDto(await this.items.save(created));
  }

  async updateItem(id: string, dto: UpdateItemDto): Promise<QueueItem> {
    const found = await this.items.findOne({ where: { id } });
    if (!found) throw new NotFoundException(`No queue item with id ${id}`);
    if (dto.name !== undefined) found.name = dto.name;
    if (dto.title !== undefined) found.title = dto.title;
    if (dto.order !== undefined) found.order = dto.order;
    return toItemDto(await this.items.save(found));
  }

  async deleteItem(id: string): Promise<void> {
    const result = await this.items.delete({ id });
    if (result.affected === 0) throw new NotFoundException(`No queue item with id ${id}`);
  }

  /** Apply a new ordering in one pass; unknown ids are ignored. */
  async reorder(listId: string, ordering: { id: string; order: number }[]): Promise<QueueList> {
    const existing = await this.items.find({ where: { listId } });
    const byId = new Map(existing.map((item) => [item.id, item]));

    const touched: QueueItemEntity[] = [];
    for (const { id, order } of ordering) {
      const item = byId.get(id);
      if (item) {
        item.order = order;
        touched.push(item);
      }
    }
    if (touched.length > 0) await this.items.save(touched);
    return this.findList(listId);
  }

  /** Parse a CSV/JSON payload into a brand-new list. */
  async importList(format: ImportFormat, content: string, label?: string): Promise<ImportResult> {
    const report = this.importExport.parse(format, content);

    const list = this.lists.create({
      label: label?.trim() || `Imported ${new Date().toLocaleDateString('en-GB')}`,
      items: report.rows.map((row, index) =>
        this.items.create({ name: row.name, title: row.title, order: index }),
      ),
    });

    const saved = await this.lists.save(list);
    return {
      list: toListDto(await this.lists.findOneOrFail({ where: { id: saved.id } })),
      imported: report.rows.length,
      warnings: report.warnings,
    };
  }

  async exportList(id: string, format: ImportFormat): Promise<string> {
    const list = await this.findList(id);
    return format === 'csv'
      ? this.importExport.toCsv(list.items)
      : this.importExport.toJson(list.items);
  }

  private async nextOrder(listId: string): Promise<number> {
    const last = await this.items.findOne({ where: { listId }, order: { order: 'DESC' } });
    return last ? last.order + 1 : 0;
  }
}
