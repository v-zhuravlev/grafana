import React, { PureComponent, ChangeEvent } from 'react';
import { SelectableValue, QueryEditorProps } from '@grafana/data';
import { CloudWatchQuery } from '../types';
import { Input, Segment, SegmentAsync, ValidationEvents, EventsWithValidation, Switch } from '@grafana/ui';
import CloudWatchDatasource from '../datasource';
import { Stats, Dimensions, InlineFormField, FormField, Alias } from './';
import appEvents from 'app/core/app_events';

type Props = QueryEditorProps<CloudWatchDatasource, CloudWatchQuery>;

interface State {
  regions: Array<SelectableValue<string>>;
  namespaces: Array<SelectableValue<string>>;
  metricNames: Array<SelectableValue<string>>;
  variableOptionGroup: SelectableValue<string>;
  searchExpressions: string[];
}

const idValidationEvents: ValidationEvents = {
  [EventsWithValidation.onBlur]: [
    {
      rule: value => new RegExp(/^$|^[a-z][a-zA-Z0-9_]*$/).test(value),
      errorMessage: 'Invalid format. Only alphanumeric characters and underscores are allowed',
    },
  ],
};

export class CloudWatchQueryEditor extends PureComponent<Props, State> {
  state: State = { regions: [], namespaces: [], metricNames: [], variableOptionGroup: {}, searchExpressions: [] };
  componentWillMount() {
    const { query } = this.props;

    if (!query.hasOwnProperty('statistics')) {
      query.statistics = [];
    }

    if (!query.hasOwnProperty('expression')) {
      query.expression = '';
    }

    if (!query.hasOwnProperty('dimensions')) {
      query.dimensions = {};
    }

    if (!query.hasOwnProperty('matchExact')) {
      query.matchExact = true;
    }

    if (!query.region) {
      query.region = 'default';
    }

    if (!query.statistics.length) {
      query.statistics = ['Average'];
    }
  }

  componentDidMount() {
    const { datasource } = this.props;
    const variableOptionGroup = {
      label: 'Template Variables',
      options: this.props.datasource.variables.map(v => ({ label: v, value: v })),
    };
    Promise.all([datasource.metricFindQuery('regions()'), datasource.metricFindQuery('namespaces()')]).then(
      ([regions, namespaces]) => {
        this.setState({
          ...this.state,
          regions: [...regions, variableOptionGroup],
          namespaces: [...namespaces, variableOptionGroup],
          variableOptionGroup,
        });
      }
    );

    // Temporary in order to display used searchExpressions
    appEvents.on('cloudwatch-search-expression-received', ({ refId, searchExpressions }: any) => {
      if (refId === this.props.query.refId) {
        this.setState({ ...this.state, searchExpressions });
      }
    });
  }

  loadMetricNames = async () => {
    const { namespace, region } = this.props.query;
    return this.props.datasource.metricFindQuery(`metrics(${namespace},${region})`).then(this.appendTemplateVariables);
  };

  appendTemplateVariables = (values: SelectableValue[]) => [
    ...values,
    { label: 'Template Variables', options: this.props.datasource.variables.map(v => ({ label: v, value: v })) },
  ];

  onChange(query: CloudWatchQuery) {
    this.setState({ ...this.state, searchExpressions: [] }); //temp
    const { onChange, onRunQuery } = this.props;
    onChange(query);
    onRunQuery();
  }

  render() {
    const { query, datasource, onChange, onRunQuery } = this.props;
    const { regions, namespaces, variableOptionGroup: variableOptionGroup, searchExpressions } = this.state;
    return (
      <>
        <InlineFormField
          label="Region"
          width={24}
          inputEl={
            <Segment
              value={query.region || 'Select region'}
              options={regions}
              allowCustomValue
              onChange={region => this.onChange({ ...query, region })}
            />
          }
        />

        {query.expression.length === 0 && (
          <>
            <InlineFormField
              label="Namespace"
              inputEl={
                <Segment
                  value={query.namespace || 'Select namespace'}
                  allowCustomValue
                  options={namespaces}
                  onChange={namespace => this.onChange({ ...query, namespace })}
                />
              }
            />

            <InlineFormField
              label="Metric Name"
              inputEl={
                <SegmentAsync
                  value={query.metricName || 'Select metric name'}
                  allowCustomValue
                  loadOptions={this.loadMetricNames}
                  onChange={metricName => this.onChange({ ...query, metricName })}
                />
              }
            />

            <InlineFormField
              label="Stats"
              inputEl={
                <Stats
                  values={query.statistics}
                  onChange={statistics => this.onChange({ ...query, statistics })}
                  variableOptionGroup={variableOptionGroup}
                />
              }
            />

            <InlineFormField
              label="Dimensions"
              inputEl={
                <Dimensions
                  dimensions={query.dimensions}
                  onChange={dimensions => this.onChange({ ...query, dimensions })}
                  loadKeys={() =>
                    datasource.getDimensionKeys(query.namespace, query.region).then(this.appendTemplateVariables)
                  }
                  loadValues={newKey => {
                    const { [newKey]: value, ...newDimensions } = query.dimensions;
                    return datasource
                      .getDimensionValues(query.region, query.namespace, query.metricName, newKey, newDimensions)
                      .then(this.appendTemplateVariables);
                  }}
                />
              }
            />
          </>
        )}

        {query.statistics.length <= 1 && (
          <div className="gf-form-inline">
            <div className="gf-form">
              <FormField
                className="query-keyword"
                label="Id"
                tooltip="Id can include numbers, letters, and underscore, and must start with a lowercase letter."
                inputEl={
                  <Input
                    className="gf-form-input width-8"
                    onBlur={onRunQuery}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => onChange({ ...query, id: event.target.value })}
                    validationEvents={idValidationEvents}
                    value={query.id}
                  />
                }
              />
            </div>
            <div className="gf-form gf-form--grow">
              <FormField
                className="gf-form--grow"
                label="Expression"
                tooltip="Add custom expression here. Please note that if a math expression is being used, it will not be possible to create an alert rule based on this query"
                inputEl={
                  <Input
                    className="gf-form-input"
                    onBlur={onRunQuery}
                    value={query.expression}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      onChange({ ...query, expression: event.target.value })
                    }
                  />
                }
              />
            </div>
          </div>
        )}

        <div className="gf-form-inline">
          <div className="gf-form">
            <FormField
              className="query-keyword"
              label="Min Period"
              tooltip="Minimum interval between points in seconds"
              inputEl={
                <Input
                  className="gf-form-input width-8"
                  value={query.period}
                  placeholder="auto"
                  onBlur={onRunQuery}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    onChange({ ...query, period: event.target.value })
                  }
                />
              }
            />
          </div>
          <div className="gf-form">
            <FormField
              className="query-keyword"
              label="Alias"
              tooltip="Alias replacement variables: {{metric}}, {{stat}}, {{namespace}}, {{region}}, {{period}}, {{label}}, {{YOUR_DIMENSION_NAME}}"
              inputEl={
                <Alias value={query.alias} onChange={(value: string) => this.onChange({ ...query, alias: value })} />
              }
            />
            <Switch
              label="HighRes"
              labelClass="query-keyword"
              checked={query.highResolution}
              onChange={() => this.onChange({ ...query, highResolution: !query.highResolution })}
            />
            <Switch
              label="Match Exact"
              labelClass="query-keyword"
              tooltip="Only show metrics that exactly match all defined dimension names."
              checked={query.matchExact}
              onChange={() => this.onChange({ ...query, matchExact: !query.matchExact })}
            />
          </div>
          <div className="gf-form gf-form--grow">
            <div className="gf-form-label gf-form-label--grow" />
          </div>
        </div>

        {/* Temporary in order to display used searchExpressions */}
        {searchExpressions.length > 0 && (
          <div className="grafana-info-box">
            {searchExpressions.map(s => (
              <div key={s} className="gf-form-inline">
                {' '}
                {s}{' '}
              </div>
            ))}
          </div>
        )}
      </>
    );
  }
}
