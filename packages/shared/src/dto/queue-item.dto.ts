export interface QueueItem {
  id: string;
  name: string;
  title: string;
  order: number;
  listId: string;
}

export interface QueueList {
  id: string;
  label: string;
  createdAt: string;
  items: QueueItem[];
}
