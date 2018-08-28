import URLJoin from 'url-join';

interface BaseModelOptions {
  url?: string;
  token?: string;
  oauthToken?: string;
  version?: string;
  rejectUnauthorized?: boolean;
}

class BaseModel {
  protected url: string;
  public headers: { [header: string]: string };
  public rejectUnauthorized: boolean;
  protected requester: any;

  constructor(options: BaseModelOptions & Required<Pick<BaseModelOptions, 'token'>>);
  constructor(options: BaseModelOptions & Required<Pick<BaseModelOptions, 'oauthToken'>>);
  constructor({
    token,
    oauthToken,
    url = 'https://gitlab.com',
    version = 'v4',
    rejectUnauthorized = true,
  }: BaseModelOptions = {}) {
    this.url = URLJoin(url, 'api', version);
    this.headers = {};
    this.rejectUnauthorized = rejectUnauthorized;

    if (oauthToken) {
      this.headers.authorization = `Bearer ${oauthToken}`;
    } else if (token) {
      this.headers['private-token'] = token;
    }
  }
}

export default BaseModel;
