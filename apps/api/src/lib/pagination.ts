export interface PageParams {
  page: number;
  pageSize: number;
}

export function toSkipTake({ page, pageSize }: PageParams) {
  return { skip: (page - 1) * pageSize, take: pageSize };
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
