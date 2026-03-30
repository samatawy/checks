export type ResultCode = string | number;

export type TranslationMap = Record<string, string>;

export interface ResultCodeDefinition {

    hint?: string | TranslationMap;

    warn?: string | TranslationMap;

    err?: string | TranslationMap;
}

export interface IResultCatalog {

    getResult(code: ResultCode, lang?: string): SingleResult | undefined;

    getDefinition(code: ResultCode): ResultCodeDefinition | undefined;

    listCodes(): ResultCode[];
}

export interface SingleResult {

    valid: boolean;

    field?: string | number | null | undefined;

    hint?: string | string[];

    warn?: string | string[];

    err?: string | string[];

    code?: ResultCode;
}

export interface ResultSet extends SingleResult {

    input?: any;

    results?: IResult[];

    hints?: string[];

    warnings?: string[];

    errors?: string[];
}

export type IResult = SingleResult | ResultSet;

export interface CheckOptions {

    hint?: string | string[];

    warn?: string | string[];

    err?: string | string[];

    code?: ResultCode;

    catalog?: IResultCatalog;
}

export interface TolerantCheckOptions extends CheckOptions {

    tolerant?: boolean;
}

export interface StringCheckOptions extends CheckOptions {

    case?: 'sensitive' | 'insensitive';
}

export interface ResultOptions {

    language?: string;

    catalog?: IResultCatalog;

    raw?: boolean;

    nested?: boolean;

    flattened?: boolean;
}

export interface Check {

    result(options?: ResultOptions): IResult;
}
