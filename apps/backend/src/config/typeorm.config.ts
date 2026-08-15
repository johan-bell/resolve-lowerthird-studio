import { mkdirSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { QueueListEntity } from '../modules/queue/entities/queue-list.entity';
import { QueueItemEntity } from '../modules/queue/entities/queue-item.entity';
import { StylePresetEntity } from '../modules/presets/entities/style-preset.entity';

/**
 * Embedded SQLite, stored beside the backend in data/app.sqlite.
 *
 * `synchronize` is on deliberately: this is a single-user local tool with no
 * deployment story, so schema drift is cheaper to fix by deleting the file than
 * by maintaining migrations. Revisit if the app ever ships to other machines.
 */
export const typeOrmConfig = (): TypeOrmModuleOptions => {
  const configured = process.env.DB_PATH ?? './data/app.sqlite';
  const database = isAbsolute(configured) ? configured : resolve(process.cwd(), configured);
  mkdirSync(dirname(database), { recursive: true });

  return {
    type: 'better-sqlite3',
    database,
    entities: [QueueListEntity, QueueItemEntity, StylePresetEntity],
    synchronize: true,
    logging: false,
  };
};
