package cloudwatch

import (
	"strings"
)

type cloudWatchQuery struct {
	RefId                   string
	Region                  string
	Id                      string
	Namespace               string
	MetricName              string
	Stats                   string
	QueryType               string
	Expression              string
	ReturnData              bool
	Dimensions              map[string][]string
	Period                  int
	Alias                   string
	Identifier              string
	HighResolution          bool
	MatchExact              bool
	SearchExpression        string
	RequestExceededMaxLimit bool
}

func (q *cloudWatchQuery) isMathExpression() bool {
	return q.Expression != "" && !strings.Contains(q.Expression, "SEARCH(")
}

func (q *cloudWatchQuery) isSearchExpression() bool {
	if q.isUserDefinedSearchExpression() {
		return true
	}

	return q.isInferredSearchExpression()
}

func (q *cloudWatchQuery) isUserDefinedSearchExpression() bool {
	return strings.Contains(q.Expression, "SEARCH(")
}

func (q *cloudWatchQuery) isInferredSearchExpression() bool {
	if len(q.Dimensions) == 0 {
		return true
	}

	for _, values := range q.Dimensions {
		if len(values) > 1 {
			return true
		}
		for _, v := range values {
			if v == "*" {
				return true
			}
		}
	}
	return false
}

func (q *cloudWatchQuery) isMetricStat() bool {
	return !q.isSearchExpression() && !q.isMathExpression()
}
