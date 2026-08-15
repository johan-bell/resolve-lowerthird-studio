import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { QueueListEntity } from './queue-list.entity';

/** One lower-third: a name and the title beneath it. */
@Entity({ name: 'queue_items' })
@Index(['listId', 'order'])
export class QueueItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ type: 'varchar', length: 300, default: '' })
  title!: string;

  /** Position within the list; gaps are tolerated, ties broken by name. */
  @Column({ type: 'integer', default: 0 })
  order!: number;

  @Column({ type: 'uuid' })
  listId!: string;

  @ManyToOne(() => QueueListEntity, (list) => list.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'listId' })
  list!: QueueListEntity;
}
