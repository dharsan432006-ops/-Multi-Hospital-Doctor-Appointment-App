export function parsePagination(
  query: {
    page?: unknown;
    pageSize?: unknown;
  },
  defaultSize = 20,
  maxSize = 100
) {
  const page = Math.max(1, Number(query.page ?? 1) || 1);
  const rawSize = Number(query.pageSize ?? defaultSize) || defaultSize;
  const pageSize = Math.min(maxSize, Math.max(1, rawSize));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export function pageResponse<T>(items: T[], total: number, page: number, pageSize: number) {
  return {
    data: items,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}
