"use strict";

var chai = require("chai");
var should = chai.should();

var fetchBuilder = require("../.");
var nock = require("nock");
//var Log = require("log");
nock.disableNetConnect();
nock.enableNetConnect(/(localhost|127\.0\.0\.1):\d+/);
var util = require("util");

describe("fetch", function () {
  var host = "http://example.com";
  var path = "/testing123";
  var fake = nock(host);

  it("should support callbacks and promises", function (done) {
    var fetch = fetchBuilder().fetch;
    fake.get(path).reply(200, {some: "content"}, {"cache-control": "no-cache"});
    fetch(host + path, function (err, body) {
      body.should.eql({some: "content"});
      fake.get(path).reply(200, {some: "content"}, {"cache-control": "no-cache"});
      fetch(host + path).then(function (body) {
        body.should.eql({some: "content"});
        done();
      }, done);
    });
  });

  describe("Fetching a json endpoint", function () {
    var fetch = fetchBuilder().fetch;

    it("should should fetch an url", function (done) {
      fake.get(path).reply(200, {some: "content"}, {"cache-control": "no-cache"});
      fetch(host + path, function (err, body) {
        body.should.eql({some: "content"});
        done(err);
      });
    });

    it("should get null if 404", function (done) {
      fake.get(path).reply(404, {some: "content"}, {"cache-control": "no-cache"});
      fetch(host + path, function (err, body) {
        should.equal(body, null);
        done(err);
      });
    });

    it("should get null non 200", function (done) {
      fake.get(path).reply(500, {some: "content"}, {"cache-control": "no-cache"});
      fetch(host + path, function (err, body) {
        should.equal(body, null);
        done(err);
      });
    });

    it("should freeze content if freeze is set", function (done) {
      var localFetch = fetchBuilder({freeze: true}).fetch;
      fake.get(path).times(2).reply(200, {some: "content"}, {"cache-control": "no-cache"});
      fetch(host + path, function (err, content) {
        should.not.throw(function () {
          content.prop1 = true;
        }, TypeError);
        localFetch(host + path, function (err, content) {
          should.throw(function () {
            content.prop1 = true;
          }, TypeError);
          done(err);
        });
      });

    });
  });

  describe("Caching", function () {
    var fetch = fetchBuilder().fetch;

    afterEach(function () {
      nock.cleanAll();
    });

    it("should cache by default", function (done) {
      fake.get(path).reply(200, {some: "content"}, {"cache-control": "max-age=30"});
      fetch(host + path, function (err, body) {
        body.should.eql({some: "content"});
        fake.get(path).reply(200, {some: "contentz"}, {"cache-control": "max-age=30"});
        fetch(host + path, function (err, body) {
          body.should.eql({some: "content"});
          fake.pendingMocks().should.eql([util.format("GET %s:80%s", host, path)]);
          done(err);
        });
      });
    });

    it("should not cache if falsy cache is given", function (done) {
      var localFetch = fetchBuilder({cache: null}).fetch;
      fake.get(path).reply(200, {some: "content"}, {"cache-control": "max-age=30"});
      localFetch(host + path, function (err, body) {
        body.should.eql({some: "content"});
        fake.get(path).reply(200, {some: "contentz"}, {"cache-control": "max-age=30"});
        localFetch(host + path, function (err, body) {
          body.should.eql({some: "contentz"});
          done(err);
        });
      });
    });

  });
});

