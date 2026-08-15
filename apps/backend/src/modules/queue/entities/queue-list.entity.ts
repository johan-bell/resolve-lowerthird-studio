import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { QueueItemEntity } from './queue-item.entity';

/** A named set of lower-thirds — typically one episode or shoot. */
@Entity({ name: 'queue_lists' })
export class QueueListEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 200 })
  label!: string;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;

  @OneToMany(() => QueueItemEntity, (item) => item.list, { cascade: true, eager: true })
  items!: QueueItemEntity[];
}
