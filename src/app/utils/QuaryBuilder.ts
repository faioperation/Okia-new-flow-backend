import { excludeFields } from "../constant";

type QueryParams = Record<string, unknown>;

type RelationConfig = Record<string, string[]>;
type EnumConfig = Record<string, string[]>;

type WhereType = Record<string, any>;
type OrderByType = Record<string, any> | Record<string, any>[];
type SelectType = Record<string, boolean>;

export class QueryBuilder<T extends QueryParams = QueryParams> {
  private query: T;
  private where: WhereType = {};
  private orderBy?: OrderByType;
  private select?: SelectType;
  private skip?: number;
  private take?: number;

  constructor(query: T) {
    this.query = query;
  }

  filter(relationConfig: RelationConfig = {}, enumConfig: EnumConfig = {}) {
    const filters: Record<string, any> = { ...this.query };

    const fieldsToExclude = [
      "searchTerm",
      "searchParam",
      "sort",
      "orderBy",
      "page",
      "limit",
      "fields",
      "skip",
      "take",
      ...excludeFields,
    ];

    fieldsToExclude.forEach((field) => delete filters[field]);

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== "") {
        let isRelational = false;
        let processedValue: any;

        const validEnumValues = enumConfig[key];

        // ✅ Enum handling
        if (validEnumValues) {
          const normalized =
            typeof value === "string" ? value.toUpperCase() : value;

          if (validEnumValues.includes(normalized)) {
            processedValue = normalized;
          } else {
            this.where = { AND: [{ id: null }] };
            return;
          }
        }

        // ✅ String search
        else if (typeof value === "string") {
          processedValue = {
            contains: value,
            mode: "insensitive",
          };
        }

        // ✅ Number / boolean / others
        else {
          processedValue = value;
        }

        // ✅ Relation handling
        for (const [relation, fields] of Object.entries(relationConfig)) {
          if (fields.includes(key)) {
            this.where[relation] = {
              ...(this.where[relation] || {}),
              [key]: processedValue,
            };
            isRelational = true;
            break;
          }
        }

        if (!isRelational) {
          this.where[key] = processedValue;
        }
      }
    });

    return this;
  }

  fields() {
    const fields = this.query.fields as string | undefined;

    if (fields) {
      const selectObj: SelectType = {};

      fields.split(",").forEach((field) => {
        selectObj[field.trim()] = true;
      });

      this.select = selectObj;
    }

    return this;
  }

  search(searchConfig: (string | Record<string, string[]>)[] = []) {
    const searchTerm =
      (this.query.searchTerm as string) ||
      (this.query.searchParam as string);

    if (!searchTerm || !searchConfig.length) return this;

    this.where.OR = searchConfig.map((field) => {
      if (typeof field === "string") {
        return {
          [field]: {
            contains: searchTerm,
            mode: "insensitive",
          },
        };
      }

      const relation = Object.keys(field)[0];
      const relationFields = field[relation];

      return {
        [relation]: {
          OR: relationFields.map((rf) => ({
            [rf]: {
              contains: searchTerm,
              mode: "insensitive",
            },
          })),
        },
      };
    });

    return this;
  }

  sort(defaultSort = "createdAt", relationConfig: RelationConfig = {}) {
    let sort = (this.query.sort as string) || defaultSort;

    const sortFields = sort.split(",").map((field) => {
      field = field.trim();
      let order: "asc" | "desc" = "asc";
      let column = field;

      if (field.startsWith("-")) {
        column = field.slice(1);
        order = "desc";
      } else {
        const parts = field.split(/\s+/);

        if (parts.length > 1) {
          column = parts[0];
          order = parts[1].toLowerCase() === "desc" ? "desc" : "asc";
        } else if (["asc", "desc"].includes(field.toLowerCase())) {
          return { [defaultSort]: field.toLowerCase() };
        }
      }

      for (const [relation, fields] of Object.entries(relationConfig)) {
        if (fields.includes(column)) {
          return {
            [relation]: {
              [column]: order,
            },
          };
        }
      }

      return { [column]: order };
    });

    this.orderBy = sortFields.length > 1 ? sortFields : sortFields[0];

    return this;
  }

  paginate() {
    const page = Number(this.query.page) || 1;
    const limit = Number(this.query.limit) || 10;

    this.skip = (page - 1) * limit;
    this.take = limit;

    return this;
  }

  build() {
    return {
      where: this.where,
      orderBy: this.orderBy,
      select: this.select,
      skip: this.skip,
      take: this.take,
    };
  }

  getMeta(total: number) {
    const page = Number(this.query.page) || 1;
    const limit = Number(this.query.limit) || 10;

    return {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    };
  }
}