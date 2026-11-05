/** Shapes of the MM API v2 masjid endpoints (camelCase JSON). Errors are RFC 9457 problem details. */

export interface Lookup {
  id: number;
  name: string;
}

export interface MasjidEditors {
  total: number;
  activated: number;
  lastLoginAt: string | null;
}

export interface MasjidListItem {
  id: number;
  name: string;
  city: Lookup;
  country: Lookup;
  house: string | null;
  street: string | null;
  postalCode: string | null;
  primaryLanguage: string | null;
  secondaryLanguage: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string | null;
  deletedAt: string | null;
  editors: MasjidEditors;
  salahTimeCount: number;
  deviceCount: number;
  isReadyToPublish: boolean;
}

export interface Pager {
  currentPageIndex: number;
  pageSize: number;
  totalRecordCount: number;
  pageCount: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface MasjidListResponse {
  data: MasjidListItem[];
  pager: Pager;
}

export interface MasjidSummary {
  total: number;
  published: number;
  unpublished: number;
  deleted: number;
}

export interface ProblemDetails {
  status?: number;
  title?: string;
  detail?: string;
  code?: string;
  traceId?: string;
  errors?: Record<string, string[]>;
}
