import ArticleModel from './ArticleModel';
import ExplorerApi from '../api/ExplorerApi';
import NewsApi from '../api/NewsApi';
import OperationResult from '../tools/OperationResult';
import SavedArticlesRepositoryModel from './SavedArticlesRepositoryModel';

import parseSearchArticles from '../tools/parseSearchArticles';


/**
 * Describes a collection of searched news articles.
 */
export default class SearchedArticlesRepositoryModel extends SavedArticlesRepositoryModel {
  /**
   * Inits new articles repository.
   *
   * @param {ExplorerApi} explorerApi
   * Instance of News Explorer API data access layer.
   *
   * @param {NewsApi} newsApi
   * Instance of the News API data access layer.
   */
  constructor(explorerApi, newsApi) {
    super(explorerApi);

    this._newsApi = newsApi;

    this._searchPhrase = '';

    /**
     * @type {[ArticleModel]}
     */
    this._searchResults = [];
  }


  //#region ------ Properties ------

  /**
   * Gets search articles results collection.
   * @type {[ArticleModel]}
   */
  get searchResults() {
    return this._searchResults;
  }

  //#endregion


  //#region ------ Events ------

  /**
   * Callback to be fired on search operation completion.
   */
  get onSearchCompleted() {
    return this._onSearchCompleted;
  }

  /**
   * Callback to be fired on search operation completion.
   */
  set onSearchCompleted(value) {
    this._onSearchCompleted = value;
  }

  //#endregion


  //#region ------ Public methods ------

  /**
   * Clears articles collection.
   */
  clearArticles() {
    this._searchResults.forEach(article => article.cleanup());
    this._searchResults = [];

    super.clearArticles();
  }

  /**
   * Creates a search request to the News API based on the search phrase.
   * @param {string} searchPhrase Keyword to search articles for.
   */
  searchArticlesAsync(searchPhrase) {
    this.clearArticles();

    this._searchPhrase = searchPhrase;

    const result = new OperationResult();

    return this._newsApi.searchAsync(searchPhrase)
      .then(jsonData => {
        this._searchResults = parseSearchArticles(this._searchPhrase, jsonData);
        this._searchResults.forEach(article =>
          article.onIsSavedChanged = super._articleIsSavedChangedHandler.bind(this)
        );

        result.data = this._searchResults;
        return result;
      })
      .catch(error => {
        result.error = error;
        return result;
      })
      .finally(() => {
        if (this._onSearchCompleted) {
          this._onSearchCompleted(result);
        }
      });
  }

  //#endregion

}
