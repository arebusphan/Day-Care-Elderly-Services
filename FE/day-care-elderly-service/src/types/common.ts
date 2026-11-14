export type { ApiResponse } from "./auth";

/** Khớp BE DayCareElderlyService.BLL.Common.PagedResult<T> */
export interface PagedResult<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

/** Bỏ các field rỗng trước khi gửi query string */
export function cleanParams<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== ""),
  ) as Partial<T>;
}
