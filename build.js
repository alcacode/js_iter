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
function numInRange(num, min, max) {
    if (min === undefined)
        min = Number.NEGATIVE_INFINITY;
    if (max === undefined)
        max = Number.POSITIVE_INFINITY;
    return typeof num === "number"
        && num === num
        && num >= min
        && num <= max;
}
function setPrototype(target, proto) {
    target.__proto__ = proto;
    return target;
}
var Iterator = (function () {
    function Iterator() {
        this.peekBuf = null;
        this.done = false;
        var next = this.next;
        this.next = this._next;
        this._next = next;
    }
    Iterator.from = function (iterable) {
        return new (function (_super_1) {
            __extends(class_1, _super_1);
            function class_1() {
                var _this = _super_1 !== null && _super_1.apply(this, arguments) || this;
                _this.offset = 0;
                return _this;
            }
            class_1.prototype.len = function () {
                return iterable.length - this.offset;
            };
            class_1.prototype.next = function () {
                return this.isEmpty()
                    ? { value: undefined, done: true }
                    : { value: iterable[this.offset++], done: false };
            };
            return class_1;
        }(ExactSizeIterator))();
    };
    Iterator.derive = function (iter, next) {
        var self = new ((function (_super_1) {
            __extends(class_2, _super_1);
            function class_2() {
                var _this = _super_1 !== null && _super_1.apply(this, arguments) || this;
                _this.next = next instanceof Function
                    ? (next.length === 0
                        ? next
                        : next(iter))
                    : iter.next;
                return _this;
            }
            return class_2;
        }(Iterator)))();
        self.__proto__ = Object.create(iter);
        return self;
    };
    Iterator.prototype._next = function () {
        if (this.peekBuf !== null) {
            var val_1 = this.peekBuf;
            this.peekBuf = null;
            return val_1;
        }
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
    Iterator.prototype.map = function (f) {
        return Iterator.derive(this, function (_super) {
            return function () {
                var res = _super.next();
                if (!res.done)
                    return { value: f(res.value), done: false };
                return res;
            };
        });
    };
    Iterator.prototype.chunks = function (n) {
        if (!numInRange(n, 1, 0xFFFFFFFF))
            throw RangeError("chunk size does not satisfy [0 < `n` < 4,294,967,296]");
        n = n >>> 0;
        var iter = Iterator.derive(this, function (_super) {
            return function () {
                var rval = _super.take(n).collect();
                return rval.length !== 0
                    ? { value: rval, done: false }
                    : { value: undefined, done: true };
            };
        });
        if (iter.collect !== Iterator.prototype.collect)
            iter.collect = Iterator.prototype.collect;
        return iter;
    };
    Iterator.prototype.filter = function (predicate) {
        return Iterator.derive(this, function (_super) {
            return function () {
                var res;
                while (!(res = _super.next()).done && !predicate(res.value)) {
                }
                return res;
            };
        });
    };
    Iterator.prototype.peek = function () {
        if (this.peekBuf === null)
            this.peekBuf = this.next();
        return this.peekBuf;
    };
    Iterator.prototype.take = function (n) {
        var self = this;
        var o = Object.create(self);
        o.next = function () {
            if (n > 0) {
                n -= 1;
                return self.next();
            }
            return { value: undefined, done: true };
        };
        return o;
    };
    Iterator.prototype.takeWhile = function (predicate) {
        return setPrototype(new TakeWhile(this, predicate), this);
    };
    Iterator.prototype.skipWhile = function (predicate) {
        return setPrototype(new SkipWhile(this, predicate), this);
    };
    Iterator.prototype.nth = function (n) {
        var val;
        while (n-- >= 0 && !(val = this.next()).done) {
        }
        return val === null || val === void 0 ? void 0 : val.value;
    };
    Iterator.prototype.skip = function (n) {
        var self = this;
        var iter = Object.create(self);
        iter.next = function () {
            var val = { value: undefined, done: true };
            while (n-- >= 0 && !(val = self.next()).done) {
            }
            iter.next = self.next;
            return val;
        };
        return iter;
    };
    return Iterator;
}());
var ExactSizeIterator = (function (_super_1) {
    __extends(ExactSizeIterator, _super_1);
    function ExactSizeIterator() {
        var _this = _super_1.call(this) || this;
        var len = _this.len;
        _this.len = _this._len;
        _this._len = len;
        return _this;
    }
    ExactSizeIterator.prototype._len = function () {
        return this._len() + (this.peekBuf !== null ? 1 : 0);
    };
    ExactSizeIterator.prototype.isEmpty = function () {
        return this.len() <= 0;
    };
    return ExactSizeIterator;
}(Iterator));
var TakeWhile = (function (_super_1) {
    __extends(TakeWhile, _super_1);
    function TakeWhile(iter, pred) {
        var _this = _super_1.call(this) || this;
        _this.iter = iter;
        _this.pred = pred;
        return _this;
    }
    TakeWhile.prototype.next = function () {
        if (!this.done) {
            var val = this.iter.peek();
            this.done = val.done || !this.pred.call(undefined, val.value);
            if (!this.done)
                return this.iter.next();
        }
        return { value: undefined, done: true };
    };
    return TakeWhile;
}(Iterator));
var SkipWhile = (function (_super_1) {
    __extends(SkipWhile, _super_1);
    function SkipWhile(iter, pred) {
        var _this = _super_1.call(this) || this;
        _this.iter = iter;
        _this.pred = pred;
        _this._skipDone = false;
        return _this;
    }
    SkipWhile.prototype.next = function () {
        if (!this._skipDone) {
            var val = void 0;
            while (!(val = this.iter.next()).done
                && this.pred.call(undefined, val.value))
                ;
            this._skipDone = true;
            return val;
        }
        return this.iter.next();
    };
    return SkipWhile;
}(Iterator));
function StringIterator(str) {
    if (typeof str !== "string")
        throw TypeError("'" + str + "' is not a string");
    var iter = Iterator.from(str);
    iter.collect = function () {
        var res = "";
        var val;
        while (!(val = this.next()).done)
            res += val.value;
        return res;
    };
    return iter;
}
