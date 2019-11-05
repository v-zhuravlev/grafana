import { DataQuery, DataSourceJsonData } from '@grafana/data';

export interface CloudWatchQuery extends DataQuery {
  id: string;
  region: string;
  namespace: string;
  metricName: string;
  dimensions: { [key: string]: string };
  statistics: string[];
  period: string;
  expression: string;
}

export interface CloudWatchJsonData extends DataSourceJsonData {
  authType: string;
  defaultRegion: string;
  timeField: string;
  assumeRoleArn: string;
  database: string;
  customMetricsNamespaces: string;
}

export interface CloudWatchSecureJsonData {
  accessKey: string;
  secretKey: string;
}

export interface CloudWatchOptions extends DataSourceJsonData {
  name: string;
  jsonData: {
    authType: string;
    defaultRegion: string;
    timeField: string;
    assumeRoleArn: string;
    database: string;
    customMetricsNamespaces: string;
  };
  secureJsonData?: {
    accessKey: string;
    secretKey: string;
  };
  secureJsonFields: {
    accessKey: boolean;
    secretKey: boolean;
  };
}
