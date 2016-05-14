var should = require('should');
var bshPool = require('bsh-mongo-pool');
var bshMongoToken = require('./bsh-mongo-token');

beforeEach(function() {
  return bshPool.init('mongodb://localhost/tokenTest');
});

describe('BSH Token Tests', function () {
    it('should create a token', function (done) {
    bshMongoToken.createToken('12345','test','someUser',['all'],100000,100000)
      .then(function (token) {
        if (token) {
          done();
        }
      })
  });
  it ('should check a created token', function (done) {
    bshMongoToken.createToken('12345','test','someUser',['all'], 1000000, 1000000)
      .then(function (token){
        if (token) {
          bshMongoToken.checkToken(token)
            .then(function (backToken) {
              should.exist(backToken);
              done();
            });
        }
      })
  });

  it ('should touch a created token', function (done) {
    bshMongoToken.createToken('12345','test','someUser',['all'],1000000,100000)
      .then(function (token){
        if (token) {
          bshMongoToken.touchToken('12345',100000,10000)
            .then(function (result) {
              bshMongoToken.checkToken('12345')
                .then(function (backToken) {
                  should.exist(backToken);
                  backToken.should.equal('12345');
                  done();
                });
            });
        }
      })
  });

  it ('should fail check a dummy token', function (done) {
    bshMongoToken.checkToken('dummy')
      .then(function (backToken) {
        should.not.exist(backToken);
        done();
      }, function (err) {
        should.exist(err);
        done();
      });
  });
  it ('should find the token expired', function () {
    bshMongoToken.createToken('12345','test','someUser',['all'], 1, 1)
      .then(function (token){
        if (token) {
          setTimeout(function () {
            bshMongoToken.checkToken(token)
              .then(function (backToken) {
                should.not.exist(backToken);
                done();
              });
          },10);
        }
      })
    });
});