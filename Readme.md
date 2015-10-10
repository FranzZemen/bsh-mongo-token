# BSH Mongo Token #
An implementation of bsh-token over MongoDB.  Typically this module would be used with bsh-token.

By default, uses the tokens collection.  Override by calling collection.

## Installation ##

     npm install bsh-mongo-token --save

## Usage ##
Typically, bsh-mongo-token is used as an implementation for bsh-token:

     var bshToken = require('bsh-token');
     bshToken.implementation(require('bsh-mongo-token'));

## Dependencies ##
Uses bsh-mongo-pool, so that needs to be initialized to the appropriate mongo database.

## API Documentation ##
Typically, the user would not invoke the api methods directly, instead allowing bsh-token to manage the module.  The
API is documented so that those desiring an alternative implementation such as over MySQL etc., may easily do so.

     /**
     * Set the mongo collection name for token storage.  Default is 'tokens'.
     * @param col
     */
     module.exports.collection = function (col)

     /**
     * Supports creation of a token.  Creates a token in the token collection.  The implementation should
     * persist the token and use the timeout parameters to persist the time at which the token will timeout. Typically
     * that would be now + timeout, in milliseconds.
     * @param token The token (alpha numeric, should support size of 1024 although typically it will be 16)
     * @param context A context string used for third party reporting.
     * @param user The user (string).  Typically a username.
     * @param roles An array of strings which are the roles the user is authorized for during the session.
     * @param tokenSessionTimeout The session timeout
     * @param tokenFinalTimeout The overall timeout.
     * @return promise whose success value is the token
     */
     module.exports.createToken = function (token, context, user, roles, tokenSessionTimeout, tokenFinalTimeout)

     /**
     * Update a token's expiration.  Typically called because a client confirms session activity.  Calls the
     * implementation to do the touch
     * @param token
     * @param tokenSessionTimeout optional.  See createToken.
     * @param tokenFinalTimeout optional.  See createToken.
     * @returns {*|promise} A promise that resolves to the token
     */
     module.exports.touchToken = function (token, tokenSessionTimeout, tokenFinalTimeout)

     /**
     * Delete a token.  Only deletes if no other delete operation is in progress.  Calls the implementation to actually
     * perform the delete.
     * @param token
     * @returns {*|promise} A promise that evaulates to true if implementation was actually called.  Promise resolves to
     * false otherwise
     */
     module.exports.deleteToken = function (token)

     /**
     * Delete expired tokens if no deletions are currently ongoing.  Calls the implementation to actually perform the
     * delete and does not need to manage state.  The implementation shoudl return a promise.
     * @returns {*|promise} A promise that evaulates to true if implementation was actually called.  False if already
     * deleting.
     */
     module.exports.deleteExpiredTokens = function ()
