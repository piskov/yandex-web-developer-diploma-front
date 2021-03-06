import BaseViewModel from './BaseViewModel';
import NetworkError from '../error/NetworkError';
import OperationResult from '../tools/OperationResult';
import PopupViewModel from './PopupViewModel';
import UserModel from '../model/UserModel';

import errorConstants from '../constants/error-constants';
import messageConstants from '../constants/message-constants';


/**
 * Describes a VM for a user.
 */
export default class UserViewModel extends BaseViewModel {
  /**
   * Inits new instance of the user view model.
   * @param {UserModel} model Underlying model.
   * @param {PopupViewModel} loginPopupViewModel Login popup VM.
   * @param {PopupViewModel} signUpPopupViewModel Sign-up popup VM.
   * @param {PopupViewModel} signUpOkPopupViewModel “Sign-up OK” popup VM.
   * @param {PopupViewModel} mobileMenuPopupViewModel Mobile menu popup VM.
   */
  constructor(model,
    mobileMenuPopupViewModel,
    loginPopupViewModel = null,
    signUpPopupViewModel = null,
    signUpOkPopupViewModel = null) {
    super(model);

    if (loginPopupViewModel) {
      this._loginPopupViewModel = loginPopupViewModel;
      this._loginPopupViewModel.onFormSubmit = this._onLoginFormSubmitHandler.bind(this);
    }

    if (signUpPopupViewModel) {
      this._signUpPopupViewModel = signUpPopupViewModel;
      this._signUpPopupViewModel.onFormSubmit = this._onSignUpFormSubmitHandler.bind(this);
    }

    if (signUpOkPopupViewModel) {
      this._signUpOkPopupViewModel = signUpOkPopupViewModel;
    }

    this._mobileMenuPopupViewModel = mobileMenuPopupViewModel;

    model.onLoginCompleted = this._onLoginCompletedHandler.bind(this);
    model.onNameLoadCompleted = this._onNameLoadCompletedHandler.bind(this);
    model.onSignUpCompleted = this._onSignUpCompletedHandler.bind(this);
  }


  //#region ------ Events ------

  /**
   * Callback to be fired on login operation completion.
   */
  get onLoginCompleted() {
    return this._onLoginCompleted;
  }

  /**
   * Callback to be fired on login operation completion.
   */
  set onLoginCompleted(value) {
    this._onLoginCompleted = value;
  }

  //#endregion


  //#region ------ Commands ------

  /**
   * “Logout” command.
   */
  logoutCommand() {
    this._model.logout();
  }

  /**
   * Shows login popup
   */
  showLoginPopupCommand() {
    this._mobileMenuPopupViewModel.isShown = false;
    this._loginPopupViewModel.isShown = true;
  }
  //#endregion


  //#region ------ Properties ------

  /**
   * Indicates whether user is logged-in.
   * @type {boolean}
   */
  get isLoggedIn() {
    return this._model.isLoggedIn;
  }

  /**
  * User’s first name.
  * @type {string}
  */
  get userFirstName() {
    return this._model.name || messageConstants.DEFAULT_LOUGOUT_MESSAGE;
  }

  //#endregion


  //#region ------ Public methods ------

  /**
   * Cleans-up the resources.
   */
  cleanup() {
    if (this._loginPopupViewModel) {
      this._loginPopupViewModel.onFormSubmit = null;
      this._loginPopupViewModel.cleanup();
    }

    if (this._signUpPopupViewModel) {
      this._signUpPopupViewModel.onFormSubmit = null;
      this._signUpPopupViewModel.cleanup();
    }

    if (this._signUpOkPopupViewModel) {
      this._signUpOkPopupViewModel.cleanup();
    }

    this._model.onLoginCompleted = null;
    this._model.onNameLoadCompleted = null;
    this._model.onSignUpCompleted = null;

    super.cleanup();
  }

  //#endregion


  //#region ------ Event handlers ------

  /**
   * Handles UserModel.onLoginCompleted event.
   * @param {OperationResult} operationResult
   */
  _onLoginCompletedHandler(operationResult) {
    if (super.onNotifyPropertyChanged) {
      super.onNotifyPropertyChanged('isLoggedIn');
    }

    this._updatePopup(this._loginPopupViewModel, operationResult.error);

    if (operationResult.error === null) {
      if (this._onLoginCompleted) {
        this._onLoginCompleted();
      }

      this._model.loadNameAsync();
    }
  }

  /**
   * Handles login form submit event.
   * @param {{email: string, password: string}} credentials
   */
  _onLoginFormSubmitHandler(credentials) {
    this._model.loginAsync(credentials.email, credentials.password);
  }

  /**
   * Handles UserModel.onNameLoadCompleted event.
   * @param {OperationResult} operationResult
   */
  _onNameLoadCompletedHandler(operationResult) {
    if (this.isLoggedIn
      && operationResult.error !== null) {
      alert(errorConstants.HUMAN_READABLE_LOAD_NAME_ERROR);
      return;
    }

    if (super.onNotifyPropertyChanged) {
      super.onNotifyPropertyChanged('userFirstName');
    }
  }

  /**
   * Handles UserModel.onSignUpCompleted event.
   * @param {OperationResult} operationResult
   */
  _onSignUpCompletedHandler(operationResult) {
    this._updatePopup(this._signUpPopupViewModel, operationResult.error);
  }

  /**
  * Handles sign-up form submit event.
  * @param {{email: string, password: string, name: string}} credentials
  */
  _onSignUpFormSubmitHandler(credentials) {
    this._model.signUpAsync(credentials);
  }

  //#endregion


  //#region ------ Private methods ------

  /**
   * Updates login popup.
   * @param {PopupViewModel} popupViewModel Popup to update.
   * @param {NetworkError} error
   */
  _updatePopup(popupViewModel, error) {
    if (!popupViewModel) {
      return;
    }

    popupViewModel.isBusy = false;

    if (!error) {
      popupViewModel.isShown = false;

      if (popupViewModel === this._signUpPopupViewModel) {
        this._signUpOkPopupViewModel.isShown = true;
      }

      return;
    }

    let errorMessage = errorConstants.HUMAN_READABLE_GENERIC_ERROR;

    if (popupViewModel === this._loginPopupViewModel && error.statusCode === 401) {
      errorMessage = errorConstants.HUMAN_READABLE_INVALID_USERNAME_OR_PASSWORD_ERROR;
    } else if (popupViewModel === this._signUpPopupViewModel && error.statusCode === 400) {
      errorMessage = errorConstants.HUMAN_READABLE_EMAIL_TAKEN;
    }

    popupViewModel.errorMessage = errorMessage;
  }

  //#endregion
}
