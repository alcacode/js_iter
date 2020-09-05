"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var Iterator = (function () {
    function Iterator() {
        this.done = false;
        var next = this.next;
        this.next = this._next;
        this._next = next;
    }
    Iterator.prototype._next = function () {
        if (this.done)
            return { value: undefined, done: true };
        var val = this._next();
        if (val.done)
            this.done = true;
        return val;
    };
    Iterator.prototype.collect = function () {
        var res = [];
        var v;
        while (!(v = this.next()).done)
            res.push(v.value);
        return res;
    };
    Iterator.prototype.takeWhile = function (predicate) {
        return new TakeWhile(this, predicate);
    };
    Iterator.prototype.skipWhile = function (predicate) {
        return new SkipWhile(this, predicate);
    };
    Iterator.prototype.nth = function (n) {
        var val;
        while (n-- > 0) {
            if ((val = this.next()).done)
                break;
        }
        return val === null || val === void 0 ? void 0 : val.value;
    };
    Iterator.prototype.skip = function (n) {
        this.nth(n);
        return this;
    };
    return Iterator;
}());
var ExactSizeIterator = (function (_super) {
    __extends(ExactSizeIterator, _super);
    function ExactSizeIterator() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ExactSizeIterator.prototype.isEmpty = function () {
        return this.len() <= 0;
    };
    return ExactSizeIterator;
}(Iterator));
var TakeWhile = (function (_super) {
    __extends(TakeWhile, _super);
    function TakeWhile(iter, pred) {
        var _this = _super.call(this) || this;
        _this.iter = iter;
        _this.pred = pred;
        return _this;
    }
    TakeWhile.prototype.next = function () {
        if (!this.done) {
            var val = this.iter.next();
            this.done = val.done || !this.pred.call(undefined, val.value);
            if (!this.done)
                return val;
        }
        return { value: undefined, done: true };
    };
    return TakeWhile;
}(Iterator));
var SkipWhile = (function (_super) {
    __extends(SkipWhile, _super);
    function SkipWhile(iter, pred) {
        var _this = _super.call(this) || this;
        _this.iter = iter;
        _this.pred = pred;
        _this.flag = false;
        return _this;
    }
    SkipWhile.prototype.next = function () {
        if (!this.flag) {
            var val = void 0;
            while (!(val = this.iter.next()).done
                && this.pred.call(undefined, val.value))
                ;
            this.flag = true;
            return val;
        }
        return this.iter.next();
    };
    return SkipWhile;
}(Iterator));
var stringIterator = (function (_super) {
    __extends(stringIterator, _super);
    function stringIterator(str) {
        var _this = _super.call(this) || this;
        _this.str = str;
        _this.offset = 0;
        if (typeof str !== "string")
            throw TypeError("'" + str + "' is not a string");
        return _this;
    }
    stringIterator.prototype.collect = function () {
        var res = "";
        var val;
        while (!(val = this.next()).done)
            res += val.value;
        return res;
    };
    stringIterator.prototype.len = function () {
        return this.str.length - this.offset;
    };
    stringIterator.prototype.next = function () {
        if (!this.isEmpty()) {
            return {
                value: this.str[this.offset++],
                done: false,
            };
        }
        return {
            value: undefined,
            done: true,
        };
    };
    return stringIterator;
}(ExactSizeIterator));