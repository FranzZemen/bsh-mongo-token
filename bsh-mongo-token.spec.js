var should = require('should');
var bshPool = require('bsh-mongo-pool');
var bshMongoToken = require('./bsh-mongo-token');

beforeEach(function() {
    return bshPool.init('mongodb://localhost/tokenTest');
});

describe('BSH Token Tests', function () {
    it('should create a token', function (done) {
        bshMongoToken.createToken('12345','test','someUser',['all'])
          .then(function (token) {
              if (token) {
                  done();
              }
          })
    });
    it ('should check a created token', function (done) {
        bshMongoToken.createToken('12345','test','someUser',['all'])
          .then(function (token){
              if (token) {
                  bshMongoToken.checkToken(token)
                    .then(function (backToken) {
                        done();
                    });
              }
          })
    });
    it ('should touch a created token', function (done) {
        bshMongoToken.createToken('12345','test','someUser',['all'])
          .then(function (token){
              if (token) {
                  bshMongoToken.touchToken(token)
                    .then(function (backToken) {
                        done();
                    });
              }
          })
    });
});