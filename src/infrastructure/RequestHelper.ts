import Humps from 'humps';
import LinkParser from 'parse-link-header';
import URLJoin from 'url-join';
import Request from 'got';
import QS from 'qs';

interface RequestParametersInput {
  url?: string;
  headers: import('./BaseService').default['headers'];
  json?: boolean;
  body?: Object;
  qs?: Object;
  formData?: temporaryAny;
  resolveWithFullResponse?: boolean;
  rejectUnauthorized?: boolean;
}

interface GetPaginatedOptions {
  showPagination?: boolean;
  maxPages?: number;
  page?: number;
}

type RequestParametersOutput = RequestParametersInput &
  Required<Pick<RequestParametersInput, 'url'>>;

function defaultRequest(
  { url, rejectUnauthorized },
  endpoint,
  { headers, body, qs, formData, resolveWithFullResponse = false }: RequestParametersInput,
): RequestParametersOutput {
  const params: RequestParametersOutput = {
    url: URLJoin(url, endpoint),
    headers,
    json: true,
    resolveWithFullResponse,
    rejectUnauthorized,
    retries: {
      statusCodes: [429]
    },
    formData,
    body: body && Humps.decamelize(body)
  };

  if (qs) {
    const queryParams = Humps.decamelizeKeys(qs);

    if (Request.name === 'xhr') {
      // The xhr package doesn't have a way of passing in a qs object until v3
      params.url = URLJoin(params.url, `?${QS.stringify(queryParams)}`);
    } else {
      params.qs = queryParams;
    }
  }

  return params;
}

function getStream(service, endpoint, options = {}) {
  const requestOptions = defaultRequest(service, endpoint, {
    headers: service.headers,
    qs: options,
  });

  return StreamableRequest.get(requestOptions);
}

async function getPaginated(service, endpoint, options: GetPaginatedOptions = {}) {
  const { showPagination, maxPages, ...queryOptions } = options;
  const requestOptions = defaultRequest(service, endpoint, {
    headers: service.headers,
    qs: queryOptions,
    resolveWithFullResponse: true,
  });

  const response = await Request.get(requestOptions);
  const links = LinkParser(response.headers.link) || {};
  const page = response.headers['x-page'];
  const underMaxPageLimit = maxPages ? page < maxPages : true;
  let more = [];
  let data;

  // If not looking for a singular page and still under the max pages limit
  // AND their is a next page, paginate
  if (!queryOptions.page && underMaxPageLimit && links.next) {
    more = await getPaginated(service, links.next.url.replace(service.url, ''), options);
    data = [...response.body, ...more];
  } else {
    data = response.body;
  }

  if (queryOptions.page && showPagination) {
    return {
      data,
      pagination: {
        total: response.headers['x-total'],
        next: response.headers['x-next-page'] || null,
        current: response.headers['x-page'] || null,
        previous: response.headers['x-prev-page'] || null,
        perPage: response.headers['x-per-page'],
        totalPages: response.headers['x-total-pages'],
      },
    };
  }

  return data;
}

class RequestHelper {
  static get(service: Object, endpoint: String, options = {}, { stream = false } = {}) {
    if (stream) return getStream(service, endpoint, options);
    return getPaginated(service, endpoint, options);
  }

  static post(service: Object, endpoint: String, options = {}, form = false) {
    const requestOptions = defaultRequest(service, endpoint, {
      headers: service.headers,
      body: form ? 'formData' : 'body',
    });

    return Request.post(requestOptions);
  }

  static put(service: Object, endpoint: String, options = {}) {
    const requestOptions = defaultRequest(service, endpoint, {
      headers: service.headers,
      body: options
    });

    return Request.put(requestOptions);
  }

  static delete(service: Object, endpoint: String, options = {}) {
    const requestOptions = defaultRequest(service, endpoint, {
      headers: service.headers,
      qs: options
    });

    return Request.delete(requestOptions);
  }
}

export default RequestHelper;
