import ArticleModel from './ArticleModel';
import ExplorerApi from '../api/ExplorerApi';
import MapCollectionItemChanged from '../tools/MapCollectionItemChanged';
import OperationResult from '../tools/OperationResult';

import errorConstants from '../constants/error-constants';
import parseSavedArticles from '../tools/parseSavedArticles';

/**
 * Describes a collection of saved news articles.
 */
export default class SavedArticlesRepositoryModel {
  /**
   * Inits new saved articles repository.
   *
   * @param {ExplorerApi} explorerApi
   * Instance of News Explorer API data access layer.
   */
  constructor(explorerApi) {
    this._explorerApi = explorerApi;

    /**
     * @type {Map<string, ArticleModel>}
     */
    this._savedArticlesMap = new Map();
  }


  //#region ------ Properties ------

  /**
   * Gets saved articles collection (id—article map).
   * @type {Map<string, ArticleModel>}
   */
  get savedArticlesMap() {
    return this._savedArticlesMap;
  }

  //#endregion


  //#region ------ Events ------

  /**
   * Callback to be fired on article network  operation completed.
   */
  get onArticleBusyOperationCompleted() {
    return this._onArticleBusyOperationCompleted;
  }

  /**
   * Callback to be fired on article network  operation completed.
   */
  set onArticleBusyOperationCompleted(value) {
    this._onArticleBusyOperationCompleted = value;
  }


  /**
   * Callback to be fired on savedArticlesMap colleciton change.
   */
  get onSavedArticlesChanged() {
    return this._onSavedArticlesChanged;
  }

  /**
   * Callback to be fired on savedArticlesMap colleciton change.
   */
  set onSavedArticlesChanged(value) {
    this._onSavedArticlesChanged = value;
  }


  /**
   * Callback to be fired on load saved articles operation completion.
   */
  get onSavedArticlesLoadCompleted() {
    return this._onSavedArticlesLoadCompleted;
  }

  /**
   * Callback to be fired on load saved articles operation completion.
   */
  set onSavedArticlesLoadCompleted(value) {
    this._onSavedArticlesLoadCompleted = value;
  }

  //#endregion


  //#region ------ Public methods ------

  /**
   * Clears saved articles collection.
   */
  clearArticles() {
    for (let article of this._savedArticlesMap.values()) {
      article.cleanup();
    }

    this._savedArticlesMap.clear();
  }

  /**
   * Creates a get request to the News Explorer API to load saved articles.
   */
  loadSavedArticlesAsync() {
    const result = new OperationResult();

    return this._explorerApi.getSavedArticlesAsync()
      .then(jsonData => {
        const savedArticles = parseSavedArticles(jsonData);
        savedArticles.forEach(article => {
          article.onIsSavedChanged = this._articleIsSavedChangedHandler.bind(this)
          this._savedArticlesMap.set(article.articleId, article);
        });

        result.data = savedArticles;
        return result;
      })
      .catch(error => {
        result.error = error;
        return result;
      })
      .finally(() => {
        if (this._onSavedArticlesLoadCompleted) {
          this._onSavedArticlesLoadCompleted(result);
        }
      });
  }

  //#endregion


  //#region ------ Event handlers ------

  /**
   * Handles ArticleModel.isSaved value change.
   * @param {ArticleModel} article Arcticle with isSaved property changed.
   * @private
   */
  _articleIsSavedChangedHandler(article) {
    article.isSaved ? this._saveArticleAsync(article)
      : this._deleteArticleAsync(article);
  }

  //#endregion


  //#region ------ Private methods ------

  /**
   * Deletes article from the user’s collection.
   * @param {ArticleModel} article Arcticle to delete.
   * @private
   */
  _deleteArticleAsync(article) {
    if (!this._savedArticlesMap.has(article.articleId)) {
      // to prevent code loop on deletion reversion in .catch block below
      return Promise.resolve();
    }

    return this._explorerApi.deleteArticleAsync(article)
      .then(() => {
        this._savedArticlesMap.delete(article.articleId);

        // In search results we do not delete (hide) cards from the view
        // so we could save them again later → we may need the card again.
        // Thus we cleanup cards only on saved page
        if (this._searchResults === undefined) {
          article.cleanup();
        }

        if (!this._onSavedArticlesChanged) {
          return;
        }

        const deletionNotification =
          new MapCollectionItemChanged(article.articleId, false);

        this._onSavedArticlesChanged(deletionNotification);
      })
      .catch(error => {
        article.isSaved = true; // revert model deletion state back to “saved”
        alert(errorConstants.HUMAN_READABLE_DELETE_ARTICLE_PAGE_ERROR);
      })
      .finally(() => {
        if (this._onArticleBusyOperationCompleted) {
          this._onArticleBusyOperationCompleted(article.articleId);
        }
      });
  }

  /**
   * Saves article to the user’s collection.
   * @param {ArticleModel} article Arcticle to save.
   * @private
   */
  _saveArticleAsync(article) {
    if (this._savedArticlesMap.has(article.articleId)) {
      // to prevent code loop on save reversion in .catch block below
      return Promise.resolve();
    }

    return this._explorerApi.saveArticleAsync(article)
      .then(jsonData => {
        article.serverArticleId = jsonData.data._id;

        this._savedArticlesMap.set(article.articleId, article);

        if (!this._onSavedArticlesChanged) {
          return;
        }

        const insertNotification =
          new MapCollectionItemChanged(article.articleId, true);

        this._onSavedArticlesChanged(insertNotification);
      })
      .catch(error => {
        article.isSaved = false; // revert model’s state back to “not saved”
        alert(errorConstants.HUMAN_READABLE_SAVE_ARTICLE_PAGE_ERROR);
      })
      .finally(() => {
        if (this._onArticleBusyOperationCompleted) {
          this._onArticleBusyOperationCompleted(article.articleId);
        }
      });
  }

  //#endregion
}
