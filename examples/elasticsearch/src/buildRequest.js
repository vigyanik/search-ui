import buildRequestFilter from "./buildRequestFilter";

function buildFrom(current, resultsPerPage) {
  if (!current || !resultsPerPage) return;
  return (current - 1) * resultsPerPage;
}

function buildSort(sortDirection, sortField) {
  if (sortDirection && sortField) {
    return [{ [`${sortField}.keyword`]: sortDirection }];
  }
}

function buildMatch(searchTerm) {
  return searchTerm
    ? {
        multi_match: {
          query: searchTerm,
          fields: ["ocr_text","FileName"]
        }
      }
    : { match_all: {} };
}

/*

  Converts current application state to an Elasticsearch request.

  When implementing an onSearch Handler in Search UI, the handler needs to take the
  current state of the application and convert it to an API request.

  For instance, there is a "current" property in the application state that you receive
  in this handler. The "current" property represents the current page in pagination. This
  method converts our "current" property to Elasticsearch's "from" parameter.

  This "current" property is a "page" offset, while Elasticsearch's "from" parameter
  is a "item" offset. In other words, for a set of 100 results and a page size
  of 10, if our "current" value is "4", then the equivalent Elasticsearch "from" value
  would be "40". This method does that conversion.

  We then do similar things for searchTerm, filters, sort, etc.
*/
export default function buildRequest(state) {
  const {
    current,
    filters,
    resultsPerPage,
    searchTerm,
    sortDirection,
    sortField
  } = state;

  const sort = buildSort(sortDirection, sortField);
  const match = buildMatch(searchTerm);
  const size = resultsPerPage;
  const from = buildFrom(current, resultsPerPage);
  const filter = buildRequestFilter(filters);

  const body = {
    // Static query Configuration
    // --------------------------
    // https://www.elastic.co/guide/en/elasticsearch/reference/7.x/search-request-highlighting.html
    highlight: {
      fragment_size: 200,
      number_of_fragments: 1,
      fields: {
	ocr_text: {},
	FileName: {}
      }
    },
    //https://www.elastic.co/guide/en/elasticsearch/reference/7.x/search-request-source-filtering.html#search-request-source-filtering
    _source: ["file_path", "FileSize", "FileModifyDate", "ocr_text","Megapixels","FileName","id"],
    aggs: {
      Megapixels: {
        range: {
          field: "Megapixels",
          ranges: [
            { from: 0.0, to: 0.1, key: "0 - 0.1" },
            { from: 0.10001, to: 0.2, key: "0.10001 - 0.2" },
            { from: 0.20001, to: 0.3, key: "0.20001 - 0.3" },
            { from: 0.30001, to: 0.4, key: "0.30001 - 0.4" },
            { from: 0.40001, to: 0.5, key: "0.40001 - 0.5" },
            { from: 0.50001, to: 0.6, key: "0.50001 - 0.6" },
            { from: 0.60001, to: 0.7, key: "0.60001 - 0.7" },
            { from: 0.70001, to: 0.8, key: "0.70001 - 0.8" },
            { from: 0.80001, to: 0.9, key: "0.80001 - 0.9" },
            { from: 0.90001, to: 1.0, key: "0.90001 - 1.0" },
            { from: 1.0001, key: "1.0001+" }
          ]
        }
      }
    },

    // Dynamic values based on current Search UI state
    // --------------------------
    // https://www.elastic.co/guide/en/elasticsearch/reference/7.x/full-text-queries.html
    query: {
      bool: {
        must: [match],
        ...(filter && { filter })
      }
    },
    // https://www.elastic.co/guide/en/elasticsearch/reference/7.x/search-request-sort.html
    ...(sort && { sort }),
    // https://www.elastic.co/guide/en/elasticsearch/reference/7.x/search-request-from-size.html
    ...(size && { size }),
    ...(from && { from })
  };

  return body;
}
