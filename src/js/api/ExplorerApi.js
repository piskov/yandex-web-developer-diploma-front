import ArticleDto from '../dto/ArticleDto';
import ArticleModel from '../model/ArticleModel';
import UserDto from '../dto/UserDto';

import errorConstants from '../constants/error-constants';
import parseErrorBodyAsync from '../tools/error-helper';


const BASE_ADDRESS = 'https://api.divulge-uncommon.ru/';


export default class ExplorerApi {
  constructor() {
    this._authToken = localStorage.getItem('token');
  }

  //#region ------ Public methods ------

  /**
   * Creates a request to delete the article from the user’s store.
   * @param {ArticleModel} article Article to delete.
   */
  deleteArticleAsync(article) {
    const requestUrl = BASE_ADDRESS + `articles/${article.serverArticleId}`;

    return fetch(requestUrl, this._createRequestParams('DELETE'))
      .then(response => {
        if (response.ok) {
          return;
        }

        if (response.status === 404) {
          // already deleted — ok
          return;
        }

        return parseErrorBodyAsync(
          response,
          errorConstants.DELETE_ARTICLE_ERROR_PREFIX,
          true
        );
      });
  }

  /**
   * Loads user’s saved articles.
   */
  getSavedArticlesAsync() {
    const requestUrl = BASE_ADDRESS + 'articles';

    return fetch(requestUrl, this._createRequestParams())
      .then(response => {
        if (response.ok) {
          return response.json();
        }

        return parseErrorBodyAsync(
          response,
          errorConstants.GET_ARTICLES_ERROR_PREFIX,
          true
        );
      });
  }

  /**
   * Creates a request to get user’s data.
   */
  getProfileAsync() {
    const requestUrl = BASE_ADDRESS + `users/me`;

    return fetch(requestUrl, this._createRequestParams())
      .then(response => {
        if (response.ok) {
          return response.json();
        }

        return parseErrorBodyAsync(
          response,
          errorConstants.GET_USER_PROFILE_ERROR_PREFIX
        );
      });
  }

  /**
   * Logins user to the API.
   * @param {string} email User’s email.
   * @param {string} password Password.
   */
  loginAsync(email, password) {
    const requestUrl = BASE_ADDRESS + `signin`;

    const request = this._createRequestParams('POST');

    const credentials = { email, password };
    request.body = JSON.stringify(credentials);

    return fetch(requestUrl, request)
      .then(response => {
        if (response.ok) {
          return response.json();
        }

        return parseErrorBodyAsync(
          response,
          errorConstants.SIGN_IN_ERROR_PREFIX
        );
      })
      .then(jsonData => {
        this._authToken = jsonData.token;
        localStorage.setItem('token', this._authToken);
        return;
      });
  }

  /**
   * Createы a request to save the article to the user’s store.
   * @param {ArticleModel} article Article to save.
   */
  saveArticleAsync(article) {
    const requestUrl = BASE_ADDRESS + `articles`;

    const request = this._createRequestParams('POST');

    const articleDto = new ArticleDto(article);
    request.body = JSON.stringify(articleDto);

    return fetch(requestUrl, request)
      .then(response => {
        if (response.ok) {
          return response.json();
        }

        return parseErrorBodyAsync(
          response,
          errorConstants.SAVE_ARTICLE_ERROR_PREFIX,
          true
        );
      });
  }

  /**
   * Creates a request to sign up a new user.
   * @param {{email: string, password: string, name: string}} credentials
   */
  signUpAsync(credentials) {
    const requestUrl = BASE_ADDRESS + `signup`;

    const request = this._createRequestParams('POST');

    const { name, email, password } = credentials;
    const dto = new UserDto(name, email, password);
    request.body = JSON.stringify(dto);

    return fetch(requestUrl, request)
      .then(response => {
        if (response.ok) {
          return response.json();
        }

        return parseErrorBodyAsync(
          response,
          errorConstants.SIGN_UP_ERROR_PREFIX,
          true
        );
      });
  }

  //#endregion


  //#region ------ Private methods ------

  /**
   * Builds fetch request object.
   * @param {string} method - Request method type.
   * @returns {{credentials: string, headers: {'Authorization': string, 'Content-Type': string}, method: string}}
   */
  _createRequestParams(method = 'GET') {
    const params = {
      headers: {
        'Content-Type': 'application/json'
      },
      method
    };

    if (this._authToken) {
      params.headers.Authorization = `Bearer ${this._authToken}`;
    }

    return params;
  }

  //#endregion
}
