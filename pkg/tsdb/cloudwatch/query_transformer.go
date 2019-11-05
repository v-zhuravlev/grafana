package cloudwatch

import (
	"fmt"
	"sort"
	"strings"

	"github.com/grafana/grafana/pkg/components/simplejson"
	"github.com/grafana/grafana/pkg/tsdb"
)

// returns a map of queries with query id as key. In the case a q request query
// has more than one statistic defined, one cloudwatchQuery will be created for each statistic.
// If the query doesn't have an Id defined by the user, we'll give it an with format `query[RefId]`. In the case
// the incoming query had more than one stat, it will ge an id like `query[RefId]_[StatName]`, eg queryC_Average
func (e *CloudWatchExecutor) transformRequestQueriesToCloudWatchQueries(requestQueries []*requestQuery) (map[string]*cloudWatchQuery, error) {
	cloudwatchQueries := make(map[string]*cloudWatchQuery)
	for _, requestQuery := range requestQueries {
		for _, stat := range requestQuery.Statistics {
			id := requestQuery.Id
			if id == "" {
				id = fmt.Sprintf("query%s", requestQuery.RefId)
			}
			if len(requestQuery.Statistics) > 1 {
				id = fmt.Sprintf("%s_%v", id, strings.ReplaceAll(*stat, ".", "_"))
			}

			query := &cloudWatchQuery{
				Id:             id,
				RefId:          requestQuery.RefId,
				Region:         requestQuery.Region,
				Namespace:      requestQuery.Namespace,
				MetricName:     requestQuery.MetricName,
				Dimensions:     requestQuery.Dimensions,
				Stats:          *stat,
				Period:         requestQuery.Period,
				Alias:          requestQuery.Alias,
				Expression:     requestQuery.Expression,
				ReturnData:     requestQuery.ReturnData,
				HighResolution: requestQuery.HighResolution,
				MatchExact:     requestQuery.MatchExact,
			}

			if _, ok := cloudwatchQueries[id]; ok {
				return nil, &queryError{
					err:   fmt.Errorf("Query id %s is not unique", query.Id),
					RefID: query.RefId,
				}
			}

			cloudwatchQueries[id] = query
		}
	}

	return cloudwatchQueries, nil
}

func (e *CloudWatchExecutor) transformQueryResponseToQueryResult(cloudwatchResponses []*cloudwatchResponse) map[string]*tsdb.QueryResult {
	results := make(map[string]*tsdb.QueryResult)
	responsesByRefID := make(map[string][]*cloudwatchResponse)

	for _, res := range cloudwatchResponses {
		if _, ok := responsesByRefID[res.RefId]; ok {
			responsesByRefID[res.RefId] = append(responsesByRefID[res.RefId], res)
		} else {
			responsesByRefID[res.RefId] = []*cloudwatchResponse{res}
		}
	}

	for refID, responses := range responsesByRefID {
		queryResult := tsdb.NewQueryResult()
		queryResult.RefId = refID
		queryResult.Meta = simplejson.New()
		queryResult.Series = tsdb.TimeSeriesSlice{}
		timeSeries := make(tsdb.TimeSeriesSlice, 0)

		searchExpressions := []string{}
		ids := []string{}
		requestExceededMaxLimit := false
		for _, response := range responses {
			timeSeries = append(timeSeries, *response.series...)
			requestExceededMaxLimit = requestExceededMaxLimit || response.RequestExceededMaxLimit
			if len(response.SearchExpression) > 0 {
				searchExpressions = append(searchExpressions, response.SearchExpression)
			}
			ids = append(ids, response.Id)
		}

		sort.Slice(timeSeries, func(i, j int) bool {
			return timeSeries[i].Name < timeSeries[j].Name
		})

		if requestExceededMaxLimit {
			queryResult.ErrorString = "Cloudwatch GetMetricData error: Maximum number of allowed metrics exceeded. Your search may have been limited."
		}
		queryResult.Series = append(queryResult.Series, timeSeries...)
		queryResult.Meta.Set("searchExpressions", searchExpressions)
		queryResult.Meta.Set("Ids", ids)
		results[refID] = queryResult
	}

	return results
}
